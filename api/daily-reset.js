import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  try {
    // 1️⃣ Günün tarihini UTC formatında al
    const today = new Date().toISOString().slice(0, 10);
    const lastReset = await kv.get("coinNinja:lastReset");

    if (lastReset === today) {
      return res.status(200).json({ ok: true, message: "Already reset today" });
    }

    // 2️⃣ Leaderboard verilerini oku
    const leaderboard = (await kv.get("coinNinja:leaderboard")) || [];

    if (leaderboard.length > 0) {
      const top = leaderboard[0];
      const winners = (await kv.get("coinNinja:winners")) || [];

      winners.unshift({
        date: today,
        name: top.name,
        score: top.score,
        wallet: top.wallet || "N/A",
      });

      await kv.set("coinNinja:winners", winners.slice(0, 50));
    }

    // 3️⃣ Leaderboard’ı sıfırla
    await kv.set("coinNinja:leaderboard", []);

    // 4️⃣ Tarihi güncelle
    await kv.set("coinNinja:lastReset", today);

    return res.status(200).json({ ok: true, message: "Daily reset done", date: today });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
