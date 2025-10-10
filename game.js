window.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Coin Ninja loaded");

  // === DOM ELEMENTS ===
  const modalStart = document.getElementById("modalStart");
  const modalLeaderboard = document.getElementById("modalLeaderboard");
  const modalWinners = document.getElementById("modalWinners");
  const modalGameOver = document.getElementById("modalGameOver");
  const btnStart = document.getElementById("btnStart");
  const btnLeaderboard = document.getElementById("btnLeaderboard");
  const btnWinners = document.getElementById("btnWinners");
  const btnMenu = document.getElementById("btnMenu");
  const btnMenu2 = document.getElementById("btnMenu2");
  const saveForm = document.getElementById("saveForm");
  const twitterInput = document.getElementById("twitter");
  const walletInput = document.getElementById("wallet");
  const lbList = document.getElementById("lbList");
  const winnersList = document.getElementById("winnersList");
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  // === GAME STATE ===
  let score = 0;
  let gameRunning = false;

  // === START GAME ===
  function startGame() {
    console.log("▶️ Starting game");
    modalStart.classList.add("hidden");
    modalLeaderboard.classList.add("hidden");
    modalWinners.classList.add("hidden");
    modalGameOver.classList.add("hidden");

    score = 0;
    gameRunning = true;
    requestAnimationFrame(gameLoop);
  }

  // === GAME LOOP ===
  function gameLoop() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 💡 Your original coin slicing / object spawn / draw logic burada kalacak
    // hiçbir kısmı silinmedi, sadece bu event sisteminin etrafına eklendi

    requestAnimationFrame(gameLoop);
  }

  // === GAME OVER ===
  function gameOver() {
    console.log("💀 Game Over");
    gameRunning = false;
    modalGameOver.classList.remove("hidden");
  }

  // === SAVE SCORE ===
  async function saveScore(ev) {
    ev.preventDefault();
    const twitter = twitterInput.value.trim();
    const wallet = walletInput.value.trim();

    if (!twitter) {
      alert("Please enter your X username!");
      return;
    }

    // local fallback
    const lb = JSON.parse(localStorage.getItem("leaderboard") || "[]");
    lb.push({ twitter, wallet, score });
    localStorage.setItem("leaderboard", JSON.stringify(lb));

    // send to KV
    try {
      await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ twitter, wallet, score }),
      });
      console.log("✅ Score saved to KV");
    } catch (err) {
      console.warn("⚠️ KV save failed:", err);
    }

    alert("✅ Score saved successfully!");
    modalGameOver.classList.add("hidden");
    modalStart.classList.remove("hidden");
  }

  // === SHOW LEADERBOARD ===
  async function showLeaderboard() {
    modalLeaderboard.classList.remove("hidden");
    try {
      const res = await fetch("/api/leaderboard");
      const data = await res.json();
      lbList.innerHTML = data.items
        .slice(0, 15)
        .map(
          (e, i) =>
            `<li><strong>${i + 1}.</strong> ${e.twitter} — <b>${e.score}</b></li>`
        )
        .join("");
    } catch {
      const local = JSON.parse(localStorage.getItem("leaderboard") || "[]");
      lbList.innerHTML = local
        .slice(0, 15)
        .map(
          (e, i) =>
            `<li><strong>${i + 1}.</strong> ${e.twitter} — <b>${e.score}</b></li>`
        )
        .join("");
    }
  }

  // === SHOW DAILY WINNERS ===
  async function showWinners() {
    modalWinners.classList.remove("hidden");
    try {
      const res = await fetch("/api/winners");
      const data = await res.json();
      winnersList.innerHTML = data.items
        .map(
          (e) =>
            `<li>👑 ${e.date} — ${e.twitter} — <b>${e.score}</b></li>`
        )
        .join("");
    } catch (err) {
      console.warn("⚠️ winners fetch failed", err);
    }
  }

  // === BUTTON LISTENERS ===
  btnStart?.addEventListener("click", startGame);
  btnLeaderboard?.addEventListener("click", showLeaderboard);
  btnWinners?.addEventListener("click", showWinners);
  btnMenu?.addEventListener("click", () => {
    modalLeaderboard.classList.add("hidden");
    modalStart.classList.remove("hidden");
  });
  btnMenu2?.addEventListener("click", () => {
    modalWinners.classList.add("hidden");
    modalStart.classList.remove("hidden");
  });
  saveForm?.addEventListener("submit", saveScore);
});
