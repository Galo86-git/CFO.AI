// api/mp-subscribe.js
// Crea una suscripción en Mercado Pago con precio dinámico en USD→ARS

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { plan, email, payer_name } = req.body || {};

  if (!plan || !email) {
    return res.status(400).json({ error: 'Faltan campos: plan, email' });
  }

  // ── Precios en USD ────────────────────────────────────────────────
  const PRICES_USD = { pro: 19.99, full: 49.99 };
  const PLAN_NAMES = { pro: 'CFO.AI Pro', full: 'CFO.AI Full' };

  const priceUSD = PRICES_USD[plan];
  if (!priceUSD) return res.status(400).json({ error: 'Plan inválido' });

  // ── Obtener TC del día (USD → ARS) ───────────────────────────────
  let tcARS = 1200; // fallback conservador
  try {
    // API pública de tipo de cambio (dólar oficial BCRA)
    const tcRes = await fetch('https://api.bcra.gob.ar/estadisticas/v3.0/monetarias/1/1', {
      headers: { 'Accept': 'application/json' }
    });
    if (tcRes.ok) {
      const tcData = await tcRes.json();
      const valor = tcData?.results?.[0]?.valor;
      if (valor && valor > 100) tcARS = valor;
    }
  } catch (e) {
    console.warn('[MP] TC fallback usado:', e.message);
  }

  const priceARS = Math.round(priceUSD * tcARS);

  // ── Crear suscripción en MP ───────────────────────────────────────
  const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
  if (!MP_TOKEN) return res.status(500).json({ error: 'MP_ACCESS_TOKEN no configurado' });

  const APP_URL = process.env.APP_URL || 'https://cfo-ai-xi.vercel.app';

  const subscriptionBody = {
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
  };

  try {
    const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_TOKEN}`,
      },
      body: JSON.stringify(subscriptionBody),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      console.error('[MP] Error:', mpData);
      return res.status(mpRes.status).json({ error: mpData.message || 'Error en Mercado Pago' });
    }

    return res.status(200).json({
      subscription_id: mpData.id,
      init_point: mpData.init_point,     // URL de pago → redirigir al usuario
      status: mpData.status,
      plan,
      price_usd: priceUSD,
      price_ars: priceARS,
      tc_usado: tcARS,
    });

  } catch (err) {
    console.error('[MP] Fetch error:', err);
    return res.status(500).json({ error: err.message });
  }
}
