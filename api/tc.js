// api/tc.js
// Devuelve el tipo de cambio USD → moneda local en tiempo real
// Soporta Argentina (ARS), Chile (CLP), Colombia (COP), México (MXN), Perú (PEN)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600'); // cache 1 hora

  const country = req.query.country || 'AR';

  // Mapeo país → moneda
  const CURRENCY_MAP = {
    AR: 'ARS', CL: 'CLP', CO: 'COP', MX: 'MXN', PE: 'PEN',
    UY: 'UYU', BR: 'BRL', PY: 'PYG', BO: 'BOB', EC: 'USD'
  };

  const currency = CURRENCY_MAP[country] || 'ARS';

  // Para ARS usamos BCRA (más preciso)
  if (country === 'AR') {
    try {
      const r = await fetch('https://api.bcra.gob.ar/estadisticas/v3.0/monetarias/1/1', {
        headers: { 'Accept': 'application/json' }
      });
      if (r.ok) {
        const d = await r.json();
        const tc = d?.results?.[0]?.valor;
        if (tc && tc > 100) {
          return res.status(200).json({ country, currency, tc_usd: tc, source: 'BCRA' });
        }
      }
    } catch(e) {}
  }

  // Para el resto usamos exchangerate-api (free tier, 1500 req/mes)
  try {
    const r = await fetch(`https://open.er-api.com/v6/latest/USD`);
    if (r.ok) {
      const d = await r.json();
      const tc = d?.rates?.[currency];
      if (tc) {
        return res.status(200).json({ country, currency, tc_usd: tc, source: 'er-api' });
      }
    }
  } catch(e) {}

  // Fallbacks conservadores por país
  const FALLBACKS = {
    ARS: 1200, CLP: 950, COP: 4200, MXN: 17,
    PEN: 3.8, UYU: 40, BRL: 5.5, PYG: 7500
  };

  return res.status(200).json({
    country, currency,
    tc_usd: FALLBACKS[currency] || 1,
    source: 'fallback'
  });
}
