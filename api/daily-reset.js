import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const lastReset = await kv.get("coinNinja:lastReset");

    // Gün içinde zaten çalıştıysa çık
    if (lastReset === today) {
      return res.status(200).json({ ok: true, message: "Already reset today" });
    }

    // KV'deki leaderboard'u oku
    const leaderboard = (await kv.get("coinNinja:leaderboard")) || [];

    // Sadece birinciyi kaydet
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

    // Leaderboard’u temizle
    await kv.set("coinNinja:leaderboard", []);

    // Güncelleme tarihi
    await kv.set("coinNinja:lastReset", today);

    res.status(200).json({ ok: true, message: "Daily reset done", date: today });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
