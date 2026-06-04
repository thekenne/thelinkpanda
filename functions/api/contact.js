/**
 * Cloudflare Pages Function — /api/contact
 *
 * GET  → {"ok":false,"error":"Method not allowed. Use POST."}
 * POST → validates + sends email via MailChannels → {"ok":true} or {"ok":false,"error":"..."}
 *
 * REQUIRED environment variable (Pages dashboard → Settings → Environment variables):
 *   CONTACT_TO_EMAIL = your@email.com
 *
 * OPTIONAL — add a DKIM TXT record to avoid spam folder:
 *   https://support.mailchannels.com/hc/en-us/articles/16918954360845
 */

const HEADERS = {
  'Content-Type':                'application/json',
  'Access-Control-Allow-Origin': '*',
};

// ── GET — confirms function is reachable ──
export async function onRequestGet() {
  return json({ ok: false, error: 'Method not allowed. Use POST.' }, 405);
}

// ── OPTIONS — CORS preflight ──
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// ── POST — main handler ──
export async function onRequestPost({ request, env }) {

  // Parse JSON body
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid request body — expected JSON.' }, 400);
  }

  const name    = String(body.name    || '').trim();
  const email   = String(body.email   || '').trim();
  const message = String(body.message || '').trim();

  // Server-side validation (mirrors client-side)
  if (!name || name.length < 2)
    return json({ ok: false, error: 'Name is required.' }, 422);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return json({ ok: false, error: 'A valid email address is required.' }, 422);

  if (!message || message.length < 10)
    return json({ ok: false, error: 'Message must be at least 10 characters.' }, 422);

  if (message.length > 5000)
    return json({ ok: false, error: 'Message too long (max 5000 characters).' }, 422);

  // Check env var
  const toEmail = env.CONTACT_TO_EMAIL;
  if (!toEmail) {
    console.error('[contact] CONTACT_TO_EMAIL not set');
    return json({ ok: false, error: 'Server configuration error. Please try again later.' }, 500);
  }

  // Plain-text body
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
    'Sent via thelinkpanda.com',
  ].join('\n');

  // HTML body
  const htmlBody = `
    <div style="font-family:sans-serif;max-width:560px;color:#1a1a1a">
      <div style="background:#07090D;padding:24px 28px;margin-bottom:24px">
        <span style="font-size:14px;color:#C8922A;letter-spacing:.05em">THELINKPANDA</span>
        <span style="color:rgba(244,242,238,.4);font-size:12px;margin-left:12px">New Contact Message</span>
      </div>
      <div style="padding:0 28px 28px">
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #eee;color:#888;font-size:13px;width:70px">Name</td>
            <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px"><strong>${esc(name)}</strong></td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #eee;color:#888;font-size:13px">Email</td>
            <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px">
              <a href="mailto:${esc(email)}" style="color:#C8922A">${esc(email)}</a>
            </td>
          </tr>
        </table>
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Message</div>
        <div style="background:#f9f9f9;padding:16px;border-left:3px solid #C8922A;font-size:14px;line-height:1.75;white-space:pre-wrap">${esc(message)}</div>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#aaa">
          Reply directly to this email to respond to ${esc(name)}.
        </div>
      </div>
    </div>`;

  // MailChannels payload
  const mail = {
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
      body:    JSON.stringify(mail),
    });
  } catch (err) {
    console.error('[contact] MailChannels fetch error:', err);
    return json({ ok: false, error: 'Failed to send. Please try again.' }, 502);
  }

  if (mcRes.status === 202) {
    console.log(`[contact] sent OK → ${toEmail} from ${email}`);
    return json({ ok: true }, 200);
  }

  const mcBody = await mcRes.text().catch(() => '(unreadable)');
  console.error(`[contact] MailChannels error ${mcRes.status}:`, mcBody);
  return json({ ok: false, error: `Send failed (${mcRes.status}). Please try again.` }, 502);
}

// ── Helpers ──
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: HEADERS });
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
