// /api/winners.js

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  try {
    const dates = await kv.lrange('winners:dates', 0, 29);
    const rows = await Promise.all(
      (dates || []).map(async (d) => {
        const w = await kv.hgetall(`winner:${d}`);
        return w || null;
      })
    );
    const items = rows.filter(Boolean);
    return res.status(200).json({ items });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}