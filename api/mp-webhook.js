// api/mp-webhook.js
// Recibe notificaciones de Mercado Pago y activa/desactiva planes

export default async function handler(req, res) {
  // MP envía GET para validar el endpoint
  if (req.method === 'GET') return res.status(200).send('OK');
  if (req.method !== 'POST') return res.status(405).end();

  const { type, data } = req.body || {};

  console.log('[MP Webhook] Tipo:', type, '| ID:', data?.id);

  // Solo procesar eventos de suscripción
  if (type !== 'subscription_preapproval') {
    return res.status(200).json({ received: true });
  }

  const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
  if (!MP_TOKEN) return res.status(500).end();

  try {
    // Obtener detalles completos de la suscripción
    const subRes = await fetch(`https://api.mercadopago.com/preapproval/${data.id}`, {
      headers: { 'Authorization': `Bearer ${MP_TOKEN}` }
    });
    const sub = await subRes.json();

    const email = sub.payer_email;
    const status = sub.status;         // authorized | paused | cancelled
    const reason = sub.reason || '';   // "CFO.AI Pro" o "CFO.AI Full"

    // Detectar plan desde el reason
    const plan = reason.toLowerCase().includes('full') ? 'full'
               : reason.toLowerCase().includes('pro')  ? 'pro'
               : null;

    console.log(`[MP Webhook] Email: ${email} | Plan: ${plan} | Status: ${status}`);

    if (!email || !plan) {
      return res.status(200).json({ received: true, note: 'no action' });
    }

    // ── Guardar en base de datos ──────────────────────────────────
    // TODO: Conectar con Supabase para persistir el plan del usuario
    // Por ahora logueamos — cuando tengas auth implementado, agregar acá:
    //
    // if (status === 'authorized') {
    //   await supabase.from('users').upsert({ email, plan, subscription_id: data.id, active: true });
    // } else if (status === 'cancelled' || status === 'paused') {
    //   await supabase.from('users').update({ plan: 'free', active: false }).eq('email', email);
    // }

    console.log(`[MP Webhook] ✓ Plan ${plan} ${status} para ${email}`);
    return res.status(200).json({ received: true, plan, status, email });

  } catch (err) {
    console.error('[MP Webhook] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
