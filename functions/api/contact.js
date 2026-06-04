/**
 * Cloudflare Pages Function — /api/contact
 * Single onRequest export handles all methods explicitly.
 *
 * REQUIRED environment variable (Pages → Settings → Environment variables):
 *   CONTACT_TO_EMAIL = your@email.com
 */

export async function onRequest({ request, env }) {

  const HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const method = request.method.toUpperCase();

  // ── CORS preflight ──
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // ── Reject non-POST ──
  if (method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: HEADERS }
    );
  }

  // ── Parse body ──
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid request body. Expected JSON.' }),
      { status: 400, headers: HEADERS }
    );
  }

  const name    = String(body.name    || '').trim();
  const email   = String(body.email   || '').trim();
  const message = String(body.message || '').trim();

  // ── Server-side validation ──
  if (!name || name.length < 2)
    return new Response(JSON.stringify({ ok: false, error: 'Name is required.' }), { status: 422, headers: HEADERS });

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return new Response(JSON.stringify({ ok: false, error: 'A valid email address is required.' }), { status: 422, headers: HEADERS });

  if (!message || message.length < 10)
    return new Response(JSON.stringify({ ok: false, error: 'Message must be at least 10 characters.' }), { status: 422, headers: HEADERS });

  if (message.length > 5000)
    return new Response(JSON.stringify({ ok: false, error: 'Message too long (max 5000 characters).' }), { status: 422, headers: HEADERS });

  // ── Check env var ──
  const toEmail = env.CONTACT_TO_EMAIL;
  if (!toEmail) {
    console.error('[contact] CONTACT_TO_EMAIL environment variable is not set');
    return new Response(
      JSON.stringify({ ok: false, error: 'Server configuration error. Please try again later.' }),
      { status: 500, headers: HEADERS }
    );
  }

  // ── Build email ──
  const textBody = [
    'New message from TheLinkPanda contact form',
    '',
    `Name:    ${name}`,
    `Email:   ${email}`,
    '',
    'Message:',
    message,
    '',
    '---',
    'Reply directly to respond to the sender.',
  ].join('\n');

  const htmlBody = `<div style="font-family:sans-serif;max-width:560px">
    <div style="background:#07090D;padding:20px 24px;margin-bottom:20px">
      <span style="font-size:13px;color:#C8922A;letter-spacing:.05em">THELINKPANDA</span>
      <span style="color:rgba(244,242,238,.4);font-size:11px;margin-left:10px">New Contact Message</span>
    </div>
    <div style="padding:0 24px 24px">
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888;font-size:13px;width:70px">Name</td>
            <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px"><strong>${esc(name)}</strong></td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888;font-size:13px">Email</td>
            <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px">
              <a href="mailto:${esc(email)}" style="color:#C8922A">${esc(email)}</a></td></tr>
      </table>
      <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Message</div>
      <div style="background:#f9f9f9;padding:14px;border-left:3px solid #C8922A;font-size:14px;line-height:1.7;white-space:pre-wrap">${esc(message)}</div>
      <div style="margin-top:20px;font-size:11px;color:#aaa">Reply to this email to respond to ${esc(name)}.</div>
    </div>
  </div>`;

  // ── Send via MailChannels ──
  const mailPayload = {
    personalizations: [{
      to: [{ email: toEmail }],
      headers: { 'Reply-To': `${name} <${email}>` },
    }],
    from:    { email: 'contact@thelinkpanda.com', name: 'TheLinkPanda Contact Form' },
    subject: `New message from ${name} — TheLinkPanda`,
    content: [
      { type: 'text/plain', value: textBody },
      { type: 'text/html',  value: htmlBody },
    ],
  };

  let mcRes;
  try {
    mcRes = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(mailPayload),
    });
  } catch (err) {
    console.error('[contact] MailChannels fetch failed:', err.message);
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to send. Please try again.' }),
      { status: 502, headers: HEADERS }
    );
  }

  if (mcRes.status === 202) {
    console.log(`[contact] sent OK to ${toEmail} from ${email}`);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: HEADERS });
  }

  const mcBody = await mcRes.text().catch(() => '(unreadable)');
  console.error(`[contact] MailChannels error ${mcRes.status}:`, mcBody);
  return new Response(
    JSON.stringify({ ok: false, error: `Send failed (${mcRes.status}). Please try again.` }),
    { status: 502, headers: HEADERS }
  );
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
