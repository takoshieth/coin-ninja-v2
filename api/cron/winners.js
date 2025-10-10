// /api/cron/winners.js

import { kv } from '@vercel/kv';

function utcDateYYYYMMDD(d = new Date()) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function utcYesterdayYYYYMMDD() {
  const now = new Date();
  const y = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 24*60*60*1000);
  return utcDateYYYYMMDD(y);
}

export default async function handler(req, res) {
  try {
    const ydate = utcYesterdayYYYYMMDD();
    const zkey = `lb:${ydate}`;

    const top = await kv.zrange(zkey, 0, 0, { rev: true, withScores: true });
    if (!top || top.length === 0) {
      return res.status(200).json({ ok: true, message: 'No scores yesterday.' });
    }

    const [twitter, score] = top[0];
    const profile = await kv.hgetall(`profile:${ydate}:${twitter}`);

    const exists = await kv.hgetall(`winner:${ydate}`);
    if (exists && exists.date) {
      return res.status(200).json({ ok: true, message: 'Winner already recorded.', winner: exists });
    }

    const winner = {
      date: ydate,
      twitter,
      wallet: profile?.wallet || '',
      score: Number(score),
      savedAt: new Date().toISOString(),
    };

    await kv.hset(`winner:${ydate}`, winner);
    await kv.lpush('winners:dates', ydate);
    await kv.ltrim('winners:dates', 0, 364);

    return res.status(200).json({ ok: true, winner });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
