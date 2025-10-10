// /api/score.js  (Vercel Serverless Function)

import { kv } from '@vercel/kv';

function utcDateYYYYMMDD(d = new Date()) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeTwitter(raw) {
  if (!raw) return null;
  let t = String(raw).trim();
  if (!t) return null;
  if (!t.startsWith('@')) t = '@' + t;
  return t.toLowerCase();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { twitter, wallet, score } = req.body || {};
    const tw = normalizeTwitter(twitter);
    const sc = Number(score);

    if (!tw || !Number.isFinite(sc)) {
      return res.status(400).json({ error: 'twitter and numeric score are required' });
    }

    const wl = (wallet || '').trim();
    if (wl && !(wl.startsWith('0x') && wl.length === 42)) {
      return res.status(400).json({ error: 'wallet format looks invalid' });
    }

    const today = utcDateYYYYMMDD();
    const zkey = `lb:${today}`;

    const prev = await kv.zscore(zkey, tw);
    if (prev === null || sc > Number(prev)) {
      await kv.zadd(zkey, { score: sc, member: tw });
      await kv.hset(`profile:${today}:${tw}`, {
        twitter: tw,
        wallet: wl || '',
        bestScore: sc,
        updatedAt: new Date().toISOString(),
      });
    }

    return res.status(200).json({ ok: true, date: today });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}