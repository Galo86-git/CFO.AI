// api/mp-subscribe.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { plan, email, tc_override } = req.body || {};
  if (!plan || !email) return res.status(400).json({ error: 'Faltan campos: plan, email' });

  const PRICES_USD = { pro: 19.99, full: 49.99 };
  const PLAN_NAMES = { pro: 'CFO.AI Pro', full: 'CFO.AI Full' };
  const priceUSD = PRICES_USD[plan];
  if (!priceUSD) return res.status(400).json({ error: 'Plan inválido' });

  // ── TC: usar el que mandó el frontend (ya mostrado al usuario) ──
  let tcARS = tc_override && tc_override > 100 ? tc_override : null;

  // Si no vino del frontend, buscarlo fresco
  if (!tcARS) {
    try {
      const tcRes = await fetch('https://api.bcra.gob.ar/estadisticas/v3.0/monetarias/1/1', {
        headers: { 'Accept': 'application/json' }
      });
      if (tcRes.ok) {
        const tcData = await tcRes.json();
        const valor = tcData?.results?.[0]?.valor;
        if (valor && valor > 100) tcARS = valor;
      }
    } catch(e) {}
  }

  // Fallback conservador si todo falla
  if (!tcARS) tcARS = 1300;

  const priceARS = Math.round(priceUSD * tcARS);

  const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
  if (!MP_TOKEN) return res.status(500).json({ error: 'MP_ACCESS_TOKEN no configurado' });

  const APP_URL = process.env.APP_URL || 'https://cfo-ai-xi.vercel.app';

  try {
    const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_TOKEN}`,
      },
      body: JSON.stringify({
        reason: `${PLAN_NAMES[plan]} — CFO.AI`,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: priceARS,
          currency_id: 'ARS',
        },
        back_url: `${APP_URL}?payment=success&plan=${plan}`,
        payer_email: email,
        status: 'pending',
      }),
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      console.error('[MP] Error:', mpData);
      return res.status(mpRes.status).json({ error: mpData.message || 'Error en Mercado Pago' });
    }

    return res.status(200).json({
      subscription_id: mpData.id,
      init_point: mpData.init_point,
      plan, price_usd: priceUSD, price_ars: priceARS, tc_usado: tcARS,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
