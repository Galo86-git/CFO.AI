export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'No URL' });

  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CFO.AI/1.0)' }
    });

    const html = await response.text();

    // Extraer colores del CSS inline, style tags y meta theme-color
    const colorMatches = new Set();

    // theme-color meta tag
    const themeMatch = html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i)
                    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']theme-color["']/i);
    if (themeMatch) colorMatches.add(themeMatch[1]);

    // Colores hex en CSS (más frecuentes primero)
    const hexColors = {};
    const hexRe = /#([0-9A-Fa-f]{6})\b/g;
    let m;
    while ((m = hexRe.exec(html)) !== null) {
      const c = m[1].toUpperCase();
      // Ignorar blancos, negros y grises
      const r = parseInt(c.substr(0,2),16), g = parseInt(c.substr(2,2),16), b = parseInt(c.substr(4,2),16);
      const max = Math.max(r,g,b), min = Math.min(r,g,b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      if (saturation > 0.2 && max > 30 && max < 240) {
        hexColors[c] = (hexColors[c] || 0) + 1;
      }
    }

    // Ordenar por frecuencia y tomar top 3
    const sorted = Object.entries(hexColors).sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0]);

    // Asignar primary, secondary, accent
    const colors = {
      primary:   sorted[0] || '1E2A3A',
      secondary: sorted[1] || '3B7DD8',
      accent:    sorted[2] || 'F59E0B'
    };

    return res.status(200).json({ colors, detected: sorted });

  } catch (err) {
    // Fallback: colores por defecto CFO.AI
    return res.status(200).json({
      colors: { primary: '1E2A3A', secondary: '3B7DD8', accent: 'F59E0B' },
      error: err.message
    });
  }
}
