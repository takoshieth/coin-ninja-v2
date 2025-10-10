// COIN NINJA v4.1 — Smart Spawn + Expanded Combo + Fever Mode + Daily Winners
(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const hud = document.getElementById("hud");
  const scoreEl = document.getElementById("score");
  const comboEl = document.getElementById("combo");
  const livesEl = document.getElementById("lives");
  const menu = document.getElementById("menu");
  const startBtn = document.getElementById("btnStart");
  const howBtn = document.getElementById("btnHow");
  const lbBtn = document.getElementById("btnLeaderboard");
  const modalHow = document.getElementById("modalHow");
  const closeHow = document.getElementById("closeHow");
  const modalLb = document.getElementById("modalLeaderboard");
  const closeLb = document.getElementById("closeLb");
  const lbList = document.getElementById("lbList");
  const winnersList = document.getElementById("winnersList");
  const tabLeaderboard = document.getElementById("tabLeaderboard");
  const tabWinners = document.getElementById("tabWinners");
  const leaderboardContent = document.getElementById("leaderboardContent");
  const winnersContent = document.getElementById("winnersContent");
  const gameoverPanel = document.getElementById("gameover");
  const finalScoreEl = document.getElementById("finalScore");
  const restartBtn = document.getElementById("btnRestart");
  const menuBtn = document.getElementById("btnMenu");
  const saveForm = document.getElementById("saveForm");
  const twInput = document.getElementById("twitter");
  const walletInput = document.getElementById("wallet");
  const btnDownloadImage = document.getElementById("btnDownloadImage");
  const btnShare = document.getElementById("btnShare");

  const comboText = document.createElement("div");
  comboText.id = "comboText";
  document.body.appendChild(comboText);

  const feverText = document.createElement("div");
  feverText.id = "feverText";
  feverText.textContent = "🔥 FEVER MODE!";
  document.body.appendChild(feverText);

  let W, H, DPR;
  function resize() {
    DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener("resize", resize);

  const coins = ["bnb","pepe","btc","doge","hype","xrp","eth","solana"];
  const images = {};
  const toLoad = {
    bnb:"assets/bnb.png", pepe:"assets/pepe.png", btc:"assets/btc.png",
    doge:"assets/doge.png", hype:"assets/hype.png", xrp:"assets/xrp.png",
    eth:"assets/eth.png", solana:"assets/solana.png", bomb:"assets/bomb.png"
  };
  let loaded = 0;
  Object.entries(toLoad).forEach(([k,src])=>{
    const img=new Image(); img.src=src; images[k]=img;
    img.onload=()=>{ loaded++; if(loaded===Object.keys(toLoad).length) onReady(); };
  });

  let running=false, score=0, time=0, lives=3;
  let entities=[];
  let gravity=720;
  let baseSpawnInterval=900;
  let spawnInterval=baseSpawnInterval, lastSpawn=0;

  let fever=false, feverTimer=0;
  const FEVER_DURATION=6, FEVER_MULT=2;

  const trail=[]; const MAX_TRAIL=12;
  let pointerDown=false,lastX=0,lastY=0;

  function addPoint(x,y){ trail.push({x,y,t:performance.now()}); if(trail.length>MAX_TRAIL) trail.shift(); }
  function onDown(x,y){ pointerDown=true; addPoint(x,y); lastX=x; lastY=y; }
  function onMove(x,y){ if(!pointerDown) return; addPoint(x,y); checkSlice(lastX,lastY,x,y); lastX=x; lastY=y; }
  function onUp(){ pointerDown=false; }

    // Unified pointer events for desktop & mobile (fixes click/touch issues)
  canvas.addEventListener("pointerdown", e => {
    const r = canvas.getBoundingClientRect();
    onDown(e.clientX - r.left, e.clientY - r.top);
  });
  canvas.addEventListener("pointermove", e => {
    if (!pointerDown) return;
    const r = canvas.getBoundingClientRect();
    onMove(e.clientX - r.left, e.clientY - r.top);
  });
  window.addEventListener("pointerup", onUp);


  function onReady(){
    resize();
    startBtn.onclick=()=>{menu.classList.add("hidden"); startGame();};
    howBtn.onclick=()=>modalHow.classList.remove("hidden");
    closeHow.onclick=()=>modalHow.classList.add("hidden");
    lbBtn.onclick=showLeaderboard;
    closeLb.onclick=()=>modalLb.classList.add("hidden");
    restartBtn.onclick=()=>{gameoverPanel.classList.add("hidden"); startGame();};
    menuBtn.onclick=()=>{gameoverPanel.classList.add("hidden"); menu.classList.remove("hidden");};
    saveForm.addEventListener("submit",saveScore);
    btnDownloadImage.onclick=downloadScoreImage;
    btnShare.onclick=shareOnTwitter;
    tabLeaderboard.onclick=()=>{tabLeaderboard.classList.add("active");tabWinners.classList.remove("active");leaderboardContent.classList.remove("hidden");winnersContent.classList.add("hidden");};
    tabWinners.onclick=()=>{tabWinners.classList.add("active");tabLeaderboard.classList.remove("active");winnersContent.classList.remove("hidden");leaderboardContent.classList.add("hidden");showWinners();};
    drawMenuBG(); resetIfNewDay();
}

  function startGame(){
    running=true; score=0; time=0; lives=3;
    entities.length=0; trail.length=0;
    spawnInterval=baseSpawnInterval; lastSpawn=0;
    fever=false; feverTimer=0; document.body.classList.remove("fever");
    scoreEl.textContent="0"; comboEl.textContent="Combo x1";
    updateLivesUI(); hud.classList.remove("hidden");
    hideFeverText();
    requestAnimationFrame(loop);
  }
  function endGame(){
    running=false;
    hud.classList.add("hidden");
    finalScoreEl.textContent=score;
    gameoverPanel.classList.remove("hidden");
  }
  function updateLivesUI(){ livesEl.textContent="💚".repeat(Math.max(0,lives)); }

  class Entity{
    constructor(kind){
      this.kind=kind;
      const margin=50;
      this.x=margin+Math.random()*(canvas.clientWidth-margin*2);
      this.y=canvas.clientHeight+40;
      const speed=850+Math.random()*300;
      const angleDeg=-65-Math.random()*50;
      const rad=angleDeg*Math.PI/180;
      this.vx=Math.cos(rad)*speed*(Math.random()>0.5?1:-1)*0.28;
      this.vy=Math.sin(rad)*speed;
      this.r=55; this.spin=(Math.random()*2-1)*2.2; this.angle=0;
      this.alive=true; this.missed=false;
    }
    update(dt){
      this.vy+=gravity*dt; this.x+=this.vx*dt; this.y+=this.vy*dt; this.angle+=this.spin*dt;
      if(this.y>canvas.clientHeight+80 && this.alive){
        this.alive=false;
        if(this.kind!=="bomb" && !this.missed){ this.missed=true; lives--; updateLivesUI(); if(lives<=0) endGame(); }
      }
    }
    draw(ctx){
      const img=images[this.kind]; if(!img) return;
      const s=this.r*2; ctx.save(); ctx.translate(this.x,this.y); ctx.rotate(this.angle);
      if(fever && this.kind!=="bomb"){ ctx.shadowBlur=18; ctx.shadowColor="rgba(61,242,157,.9)"; }
      ctx.drawImage(img,-s/2,-s/2,s,s);
      if(this.kind==="bomb"){ ctx.shadowBlur=0; ctx.strokeStyle="rgba(255,60,60,.45)"; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(0,0,this.r+3,0,Math.PI*2); ctx.stroke(); }
      ctx.restore();
    }
  }

  function spawn(){
    const now=performance.now();
    if(now-lastSpawn<spawnInterval) return;
    lastSpawn=now;
    const batch=Math.min(2+Math.floor(time/25),5);
    const groupChance=Math.random()<0.4;
    let sameType=null; if(groupChance) sameType=coins[(Math.random()*coins.length)|0];

    for(let i=0;i<batch;i++){
      setTimeout(()=>{
        const isBomb=Math.random()<Math.min(0.08+time*0.002,0.22);
        let kind;
        if(groupChance && i<3) kind=sameType;
        else kind=isBomb?"bomb":coins[(Math.random()*coins.length)|0];
        entities.push(new Entity(kind));
      }, i*100);
    }
    const feverBonus=fever?80:0;
    spawnInterval=Math.max(380, baseSpawnInterval - time*12 - feverBonus);
  }

  function lineIntersectsCircle(x1,y1,x2,y2,cx,cy,r){
    const A=cx-x1,B=cy-y1,C=x2-x1,D=y2-y1;
    const dot=A*C+B*D,len=C*C+D*D; let t=dot/len; t=Math.max(0,Math.min(1,t));
    const px=x1+t*C,py=y1+t*D; const dx=cx-px,dy=cy-py;
    return dx*dx+dy*dy<=r*r;
  }

  function checkSlice(x1,y1,x2,y2){
    const slicedKinds=[];
    for(const e of entities){
      if(!e.alive) continue;
      if(lineIntersectsCircle(x1,y1,x2,y2,e.x,e.y,e.r)){
        if(e.kind==="bomb"){ e.alive=false; navigator.vibrate?.(80); endGame(); return; }
        e.alive=false; slicedKinds.push(e.kind);
        let gain=10; if(fever) gain*=FEVER_MULT; score+=gain; scoreEl.textContent=score;
      }
    }
    if(slicedKinds.length>=3){
      const countByKind=slicedKinds.reduce((a,k)=>{a[k]=(a[k]||0)+1; return a;}, {});
      const hasTriple=Object.values(countByKind).some(v=>v>=3);
      if(hasTriple){
        const bonus=10+(slicedKinds.length-3)*2;
        const total=fever?bonus*FEVER_MULT:bonus;
        score+=total; scoreEl.textContent=score;
        showCombo(slicedKinds.length); activateFever();
      }
    }
  }

  function activateFever(){ fever=true; feverTimer=FEVER_DURATION; document.body.classList.add("fever"); showFeverText(); }
  function updateFever(dt){ if(!fever) return; feverTimer-=dt; if(feverTimer<=0){ fever=false; feverTimer=0; document.body.classList.remove("fever"); hideFeverText(); } }

  const flashes=[];
  function drawFlashes(dt){
    for(const f of flashes){
      f.t+=dt; const a=Math.max(0,1-f.t*4); if(a<=0) continue;
      ctx.save(); ctx.globalAlpha=a; ctx.fillStyle="rgba(61,242,157,.5)";
      ctx.beginPath(); ctx.arc(f.x,f.y,22+f.t*120,0,Math.PI*2); ctx.fill(); ctx.restore();
    }
    for(let i=flashes.length-1;i>=0;i--) if(flashes[i].t>0.4) flashes.splice(i,1);
  }
  function showCombo(n){ comboText.textContent=`🔥 COMBO x${n}!`; comboText.style.opacity=1; setTimeout(()=>comboText.style.opacity=0,900); }
  function showFeverText(){ feverText.style.opacity=1; }
  function hideFeverText(){ feverText.style.opacity=0; }

  function drawTrail(){
    if(trail.length<2) return;
    ctx.save(); ctx.lineCap="round"; ctx.lineJoin="round";
    for(let i=1;i<trail.length;i++){
      const p0=trail[i-1],p1=trail[i];
      const age=(performance.now()-p1.t)/400;
      const w=Math.max(1,14*(1-age));
      ctx.strokeStyle=`rgba(61,242,157,${Math.max(0,1-age)})`;
      ctx.lineWidth=w; ctx.beginPath(); ctx.moveTo(p0.x,p0.y); ctx.lineTo(p1.x,p1.y); ctx.stroke();
    }
    ctx.restore();
  }

  let lastTime=performance.now();
  function loop(){
    if(!running) return;
    const now=performance.now(); let dt=(now-lastTime)/1000; dt=Math.min(dt,0.033); lastTime=now;
    time+=dt; updateFever(dt);
    ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);
    spawn(); entities.forEach(e=>e.update(dt)); entities=entities.filter(e=>e.alive); entities.forEach(e=>e.draw(ctx));
    drawFlashes(dt); drawTrail(); requestAnimationFrame(loop);
  }

  function drawMenuBG(){
    resize(); ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);
    ctx.save(); ctx.globalAlpha=.18; const s=40; ctx.strokeStyle="#2a364d";
    for(let x=0;x<canvas.clientWidth;x+=s){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.clientHeight);ctx.stroke();}
    for(let y=0;y<canvas.clientHeight;y+=s){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.clientWidth,y);ctx.stroke();}
    ctx.restore();
  }

  function readLB(){try{return JSON.parse(localStorage.getItem("coinNinjaLB"))||[]}catch{return[]}}
  function writeLB(a){localStorage.setItem("coinNinjaLB",JSON.stringify(a.slice(0,100)));}
  function readWinners(){try{return JSON.parse(localStorage.getItem("coinNinjaWinners"))||[]}catch{return[]}}
  function writeWinners(a){localStorage.setItem("coinNinjaWinners",JSON.stringify(a.slice(0,50)));}

  function saveScore(ev){
    ev.preventDefault();
    const name=twInput.value.trim(); if(!name) return;
    const wallet=walletInput.value.trim();
    const lb=readLB(); lb.push({name,wallet,score,ts:Date.now()});
    lb.sort((a,b)=>b.score-a.score||a.ts-b.ts); writeLB(lb);
    showLeaderboard();
  }
  function showLeaderboard(){
    const lb=readLB().sort((a,b)=>b.score-a.score||a.ts-b.ts).slice(0,20);
    lbList.innerHTML=lb.map((e,i)=>`<li><strong>${i+1}.</strong> ${e.name} — <b>${e.score}</b></li>`).join("");
    modalLb.classList.remove("hidden");
  }
  function showWinners(){
    const w=readWinners();
    winnersList.innerHTML=w.map(e=>`<li><span class="crown">👑</span> ${e.date} — ${e.name} — Score ${e.score}</li>`).join("");
  }
  function resetIfNewDay(){
    const today=new Date().toISOString().slice(0,10);
    const lastDate=localStorage.getItem("coinNinjaDate");
    if(lastDate!==today){
      const lb=readLB();
      if(lb.length>0){
        const top=lb[0];
        const winners=readWinners();
        winners.unshift({date:lastDate||today,name:top.name,score:top.score});
        writeWinners(winners);
      }
      writeLB([]); localStorage.setItem("coinNinjaDate",today);
    }
  }

  function downloadScoreImage(){
    const DPR=Math.max(1,Math.min(3,window.devicePixelRatio||1));
    const tmp=document.createElement("canvas");
    tmp.width=canvas.width; tmp.height=canvas.height;
    const tctx=tmp.getContext("2d");
    tctx.drawImage(canvas,0,0);
    tctx.scale(DPR,DPR);
    tctx.fillStyle="rgba(0,0,0,.5)";
    tctx.fillRect(16,16,260,100);
    tctx.fillStyle="#EAF2FF";
    tctx.font="bold 22px Inter";
    tctx.fillText("COIN NINJA",28,46);
    tctx.font="18px Inter";
    tctx.fillText(`Score: ${score}`,28,74);
    tctx.fillText("by @takoshieth",28,100);
    const link=document.createElement("a");
    link.download=`coin-ninja-score-${score}.png`;
    link.href=tmp.toDataURL("image/png");
    link.click();
  }
  function shareOnTwitter(){
    const text = encodeURIComponent(`I scored ${score} in COIN NINJA! ⚔️🪙 Try to beat me!`);
    const url = encodeURIComponent(window.location.href);
    const intent = `https://twitter.com/intent/tweet?text=${text}&url=${url}&via=takoshieth`;
    window.open(intent, "_blank");
  }
// === KV + Farcaster MiniApp entegrasyonu ===

// Oyunun tüm lifecycle'ı yüklendikten sonra
window.addEventListener("load", async () => {
  // Farcaster SDK başlat
  try {
    const { init } = await import("https://esm.sh/@farcaster/miniapp-sdk@0.2.0");
    await init();
    console.log("✅ Farcaster SDK initialized");
  } catch (e) {
    console.warn("⚠️ Farcaster SDK init failed", e);
  }

  // KV'ye skor kaydetme (local fallback ile uyumlu)
  const originalSave = window.saveScore;
  window.saveScore = async function (ev) {
    if (ev) ev.preventDefault();
    const tw = twInput?.value?.trim();
    const wallet = walletInput?.value?.trim() || "";
    if (!tw) return;

    // önce yerel sistemde kaydet
    if (typeof originalSave === "function") originalSave(ev);

    // sonra Upstash KV'ye gönder
    try {
      await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ twitter: tw, wallet, score }),
      });
      console.log("✅ Score synced to KV");
    } catch (err) {
      console.warn("⚠️ KV push failed", err);
    }
  };

  // Lider tablosu güncelleme
  window.showLeaderboard = async function () {
    try {
      const res = await fetch("/api/leaderboard");
      const data = await res.json();
      lbList.innerHTML = data.items
        .slice(0, 20)
        .map(
          (e, i) =>
            `<li><strong>${i + 1}.</strong> ${e.twitter} — <b>${e.score}</b></li>`
        )
        .join("");
      modalLb.classList.remove("hidden");
    } catch (err) {
      console.warn("⚠️ leaderboard fetch failed", err);
      // fallback: local leaderboard
      const lb = readLB()
        .sort((a, b) => b.score - a.score || a.ts - b.ts)
        .slice(0, 20);
      lbList.innerHTML = lb
        .map(
          (e, i) =>
            `<li><strong>${i + 1}.</strong> ${e.name} — <b>${e.score}</b></li>`
        )
        .join("");
      modalLb.classList.remove("hidden");
    }
  };

  // Günlük kazanan listesi
  window.showWinners = async function () {
    try {
      const res = await fetch("/api/winners");
      const data = await res.json();
      winnersList.innerHTML = data.items
        .map(
          (e) =>
            `<li>👑 ${e.date} — ${e.twitter} — Score ${e.score}</li>`
        )
        .join("");
    } catch (err) {
      console.warn("⚠️ winners fetch failed", err);
      // fallback: local winners
      const w = readWinners();
      winnersList.innerHTML = w
        .map(
          (e) =>
            `<li>👑 ${e.date} — ${e.name} — Score ${e.score}</li>`
        )
        .join("");
    }
  };
});
  
})(); // <-- bu satır, oyunun ana fonksiyonunu kapatır! BURAYA KADAR OYUN
