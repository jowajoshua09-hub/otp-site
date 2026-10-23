import express from 'express';
import fetch from 'node-fetch';

const app = express();

const UPSTREAM = 'https://api.omegatech.app/api/tools/Temp-number?action=otps';
let cache = { data: null, at: 0 };

app.get('/api/otps', async (req, res) => {
  try {
    if (Date.now() - cache.at < 10_000 && cache.data) {
      return res.json(cache.data);
    }
    const r = await fetch(UPSTREAM, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (OTP-Viewer/1.0)'
      }
    });
    if (!r.ok) throw new Error(`Upstream ${r.status}`);
    const json = await r.json();
    cache = { data: json, at: Date.now() };
    res.set('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
    res.json(json);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

export default app;
