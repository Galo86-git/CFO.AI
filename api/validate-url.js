export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ valid: false, error: 'No URL' });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CFO.AI/1.0)' },
      redirect: 'follow'
    });
    clearTimeout(timeout);

    return res.status(200).json({
      valid: response.ok || response.status < 400,
      status: response.status
    });
  } catch (err) {
    return res.status(200).json({ valid: false, error: err.message });
  }
}
