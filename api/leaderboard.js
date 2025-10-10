// /api/leaderboard.js

import { kv } from '@vercel/kv';

function utcDateYYYYMMDD(d = new Date()) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default async function handler(req, res) {
  try {
    const date = (req.query?.date || utcDateYYYYMMDD()).toString();
    const key = `lb:${date}`;

    const rows = await kv.zrange(key, 0, 49, { rev: true, withScores: true });
    const items = await Promise.all(
      rows.map(async ([tw, score]) => {
        const p = await kv.hgetall(`profile:${date}:${tw}`);
        return {
          twitter: tw,
          wallet: p?.wallet || '',
          score: Number(score),
        };
      })
    );

    return res.status(200).json({ date, items });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}