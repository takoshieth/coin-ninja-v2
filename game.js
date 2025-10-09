// COIN NINJA v2
(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const hud = document.getElementById("hud");
  const scoreEl = document.getElementById("score");
  const comboEl = document.getElementById("combo");
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

  // Combo floating text
  const comboText = document.createElement("div");
  comboText.id = "comboText";
  document.body.appendChild(comboText);

  let W, H, DPR;
  function resize() {
    DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener("resize", resize);

  // Load images
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
    img.onload=()=>{loaded++; if(loaded===Object.keys(toLoad).length) onReady();};
  });

  // Game state
  let running=false, score=0, time=0;
  let entities=[], gravity=700, spawnInterval=900, lastSpawn=0;
  let lastSliceTime=0, comboMult=1, lastComboCoin=null;
  const trail=[], MAX_TRAIL=12;

  // Input
  let pointerDown=false, lastX=0,lastY=0;
  const inputEl=canvas;

  function addPoint(x,y){
    trail.push({x,y,t:performance.now()});
    if(trail.length>MAX_TRAIL) trail.shift();
  }
  function onDown(x,y){ pointerDown=true; addPoint(x,y); lastX=x; lastY=y; }
  function onMove(x,y){
    if(!pointerDown) return;
    addPoint(x,y);
    checkSlice(lastX,lastY,x,y);
    lastX=x; lastY=y;
  }
  function onUp(){ pointerDown=false; }

  inputEl.addEventListener("mousedown",e=>onDown(e.offsetX,e.offsetY));
  inputEl.addEventListener("mousemove",e=>onMove(e.offsetX,e.offsetY));
  window.addEventListener("mouseup",onUp);

  inputEl.addEventListener("touchstart",e=>{
    const t=e.touches[0]; const r=inputEl.getBoundingClientRect();
    onDown(t.clientX-r.left,t.clientY-r.top);
  },{passive:true});
  inputEl.addEventListener("touchmove",e=>{
    const t=e.touches[0]; const r=inputEl.getBoundingClientRect();
    onMove(t.clientX-r.left,t.clientY-r.top);
  },{passive:true});
  window.addEventListener("touchend",onUp);

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

    tabLeaderboard.onclick=()=>{
      tabLeaderboard.classList.add("active"); tabWinners.classList.remove("active");
      leaderboardContent.classList.remove("hidden"); winnersContent.classList.add("hidden");
    };
    tabWinners.onclick=()=>{
      tabWinners.classList.add("active"); tabLeaderboard.classList.remove("active");
      winnersContent.classList.remove("hidden"); leaderboardContent.classList.add("hidden");
      showWinners();
    };
    drawMenuBG();
    resetIfNewDay();
  }

  function startGame(){
    running=true; score=0; time=0; entities=[]; trail.length=0;
    spawnInterval=900; lastSpawn=0; comboMult=1; lastSliceTime=0;
    hud.classList.remove("hidden");
    scoreEl.textContent="0"; comboEl.textContent="Combo x1";
    requestAnimationFrame(loop);
  }

  function endGame(){
    running=false;
    hud.classList.add("hidden");
    finalScoreEl.textContent=score;
    gameoverPanel.classList.remove("hidden");
  }

  // Entity Class
  class Entity{
    constructor(kind){
      this.kind=kind;
      const margin=40;
      this.x=margin+Math.random()*(canvas.clientWidth-margin*2);
      this.y=canvas.clientHeight+60;
      const up=600+Math.random()*300;
      const dir=(Math.random()*2-1)*200;
      this.vx=dir; this.vy=-up;
      this.r=55; this.spin=(Math.random()*2-1)*2.5;
      this.angle=0; this.alive=true;
    }
    update(dt){ this.vy+=gravity*dt; this.x+=this.vx*dt; this.y+=this.vy*dt; this.angle+=this.spin*dt;
      if(this.y>canvas.clientHeight+120) this.alive=false; }
    draw(ctx){
      const img=images[this.kind]; if(!img) return;
      const s=this.r*2;
      ctx.save(); ctx.translate(this.x,this.y); ctx.rotate(this.angle);
      ctx.drawImage(img,-s/2,-s/2,s,s);
      if(this.kind==="bomb"){ctx.strokeStyle="rgba(255,60,60,.4)";ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,this.r+3,0,Math.PI*2);ctx.stroke();}
      ctx.restore();
    }
  }

  // Spawn system
  function spawn(){
    const now=performance.now();
    if(now-lastSpawn<spawnInterval) return;
    lastSpawn=now;
    const batch=Math.min(2+Math.floor(time/20),5);
    for(let i=0;i<batch;i++){
      setTimeout(()=>{
        const isBomb=Math.random()<Math.min(0.08+time*0.002,0.25);
        const kind=isBomb?"bomb":coins[Math.floor(Math.random()*coins.length)];
        entities.push(new Entity(kind));
      },i*100);
    }
    spawnInterval=Math.max(400,900-time*10);
  }

  // Slice logic
  function lineIntersectsCircle(x1,y1,x2,y2,cx,cy,r){
    const A=cx-x1,B=cy-y1,C=x2-x1,D=y2-y1;
    const dot=A*C+B*D,len_sq=C*C+D*D; let t=dot/len_sq; t=Math.max(0,Math.min(1,t));
    const px=x1+t*C,py=y1+t*D; const dx=cx-px,dy=cy-py;
    return dx*dx+dy*dy<=r*r;
  }

  function checkSlice(x1,y1,x2,y2){
    const now=performance.now();
    const sliced=[];
    for(const e of entities){
      if(!e.alive) continue;
      if(lineIntersectsCircle(x1,y1,x2,y2,e.x,e.y,e.r)){
        if(e.kind==="bomb"){e.alive=false; endGame(); return;}
        e.alive=false; sliced.push(e.kind);
        score+=10; scoreEl.textContent=score;
        flashes.push({x:e.x,y:e.y,t:0});
        navigator.vibrate?.(20);
      }
    }
    if(sliced.length>1){
      const sameCoin=sliced.every(k=>k===sliced[0]);
      if(sameCoin){
        showCombo(sliced.length);
        score+=sliced.length*15;
        scoreEl.textContent=score;
      }
    }
  }

  // Combo visual
  function showCombo(n){
    comboText.textContent=`🔥 COMBO x${n}!`;
    comboText.style.opacity=1;
    setTimeout(()=>comboText.style.opacity=0,800);
  }

  const flashes=[];
  function drawFlashes(dt){
    for(const f of flashes){
      f.t+=dt; const a=Math.max(0,1-f.t*4);
      if(a<=0) continue;
      ctx.save(); ctx.globalAlpha=a;
      ctx.fillStyle="rgba(61,242,157,.5)";
      ctx.beginPath(); ctx.arc(f.x,f.y,22+f.t*120,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
    for(let i=flashes.length-1;i>=0;i--) if(flashes[i].t>0.4) flashes.splice(i,1);
  }

  function drawTrail(){
    if(trail.length<2) return;
    ctx.save(); ctx.lineCap="round"; ctx.lineJoin="round";
    for(let i=1;i<trail.length;i++){
      const p0=trail[i-1],p1=trail[i];
      const age=(performance.now()-p1.t)/400;
      const w=Math.max(1,14*(1-age));
      ctx.strokeStyle=`rgba(61,242,157,${Math.max(0,1-age)})`;
      ctx.lineWidth=w;
      ctx.beginPath(); ctx.moveTo(p0.x,p0.y); ctx.lineTo(p1.x,p1.y); ctx.stroke();
    }
    ctx.restore();
  }

  let lastTime=performance.now();
  function loop(){
    if(!running) return;
    const now=performance.now(); let dt=(now-lastTime)/1000; dt=Math.min(dt,0.033); lastTime=now;
    time+=dt; ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);
    spawn(); entities.forEach(e=>e.update(dt)); entities=entities.filter(e=>e.alive);
    entities.forEach(e=>e.draw(ctx)); drawFlashes(dt); drawTrail();
    requestAnimationFrame(loop);
  }

  function drawMenuBG(){
    resize(); ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);
    ctx.save(); ctx.globalAlpha=.18; const s=40; ctx.strokeStyle="#2a364d";
    for(let x=0;x<canvas.clientWidth;x+=s){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.clientHeight);ctx.stroke();}
    for(let y=0;y<canvas.clientHeight;y+=s){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.clientWidth,y);ctx.stroke();}
    ctx.restore();
  }

  // Leaderboard & Winners
  function readLB(){try{return JSON.parse(localStorage.getItem("coinNinjaLB"))||[]}catch{return[]}}
  function writeLB(a){localStorage.setItem("coinNinjaLB",JSON.stringify(a.slice(0,100)));}
  function readWinners(){try{return JSON.parse(localStorage.getItem("coinNinjaWinners"))||[]}catch{return[]}}
  function writeWinners(a){localStorage.setItem("coinNinjaWinners",JSON.stringify(a.slice(0,50)));}

  function saveScore(ev){
    ev.preventDefault();
    const name=twInput.value.trim(); if(!name) return;
    const lb=readLB(); lb.push({name,score,ts:Date.now()});
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
    winnersList.innerHTML=w.map((e)=>`<li><span class="crown">👑</span> ${e.date} — ${e.name} — Score ${e.score}</li>`).join("");
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
    const text=encodeURIComponent(`I scored ${score} in COIN NINJA! ⚔️🪙 Try to beat me!`);
    const url=encodeURIComponent(window.location.href);
    const intent=`https://twitter.com/intent/tweet?text=${text}&url=${url}&via=takoshieth`;
    window.open(intent,"_blank");
  }

})();
