/**
 * Sends a booking confirmation email (Resend). Optional: set RESEND_API_KEY secret.
 * Public endpoint (verify_jwt = false in supabase/config.toml).
 *
 * Deploy: supabase functions deploy send-booking-confirmation
 */
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX = 2000;

function clip(s: string, n: number): string {
  const t = (s ?? '').trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ ok: false, sent: false, reason: 'method_not_allowed' }, 405);
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const to = typeof body.to === 'string' ? body.to.trim() : '';
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return json({ ok: true, sent: false, reason: 'invalid_email' });
    }

    const clientName = typeof body.clientName === 'string' ? clip(body.clientName, 200) : 'Guest';
    const whenLabel = typeof body.whenLabel === 'string' ? clip(body.whenLabel, MAX) : '—';
    const coachName = typeof body.coachName === 'string' ? clip(body.coachName, 200) : 'Your coach';
    const coachBusiness = typeof body.coachBusiness === 'string' ? clip(body.coachBusiness, 200) : '';

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      console.warn('send-booking-confirmation: RESEND_API_KEY not set; skipping send');
      return json({ ok: true, sent: false, reason: 'not_configured' });
    }

    const from = Deno.env.get('RESEND_FROM')?.trim() || 'Coach <onboarding@resend.dev>';
    const subject = coachBusiness
      ? `Booking confirmed — ${coachBusiness}`
      : `Booking confirmed — ${coachName}`;

    const html = `
      <p><strong>Booking confirmed</strong></p>
      <p>Hi ${escapeHtml(clientName)},</p>
      <p><strong>When:</strong> ${escapeHtml(whenLabel)}</p>
      <p><strong>Coach:</strong> ${escapeHtml(coachName)}${coachBusiness ? ` · ${escapeHtml(coachBusiness)}` : ''}</p>
      <p>Contact your coach directly if you need to change or cancel this session.</p>
    `.trim();

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('send-booking-confirmation: Resend error', res.status, errText);
      return json({ ok: false, sent: false, reason: 'resend_error' }, 502);
    }

    console.log('send-booking-confirmation: email sent');
    return json({ ok: true, sent: true });
  } catch (e) {
    console.error('send-booking-confirmation failed', e);
    const message = e instanceof Error ? (e.message ?? 'Unknown error') : 'Unknown error';
    return json({ ok: false, sent: false, error: true, message }, 500);
  }
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
