export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    const toEmail = env.CONTACT_TO_EMAIL;
    if (!toEmail) {
      return json({ ok: false, error: "CONTACT_TO_EMAIL is not configured." }, 500);
    }

    const data = await request.json().catch(() => null);

    if (!data) {
      return json({ ok: false, error: "Invalid request body." }, 400);
    }

    const name = String(data.name || "").trim();
    const email = String(data.email || "").trim();
    const message = String(data.message || "").trim();

    if (!name || !email || !message) {
      return json({ ok: false, error: "Name, email, and message are required." }, 400);
    }

    if (!isValidEmail(email)) {
      return json({ ok: false, error: "Please enter a valid email address." }, 400);
    }

    const subject = `New message from TheLinkPanda — ${name}`;

    const payload = {
      personalizations: [
        {
          to: [{ email: toEmail }]
        }
      ],
      from: {
        email: "contact@thelinkpanda.com",
        name: "TheLinkPanda Contact Form"
      },
      reply_to: {
        email,
        name
      },
      subject,
      content: [
        {
          type: "text/plain",
          value:
`New message from TheLinkPanda.com

Name: ${name}
Email: ${email}

Message:
${message}`
        },
        {
          type: "text/html",
          value: `
            <div style="font-family:Arial,sans-serif;background:#07090D;color:#F4F2EE;padding:24px;">
              <h2 style="color:#C8922A;margin-bottom:16px;">New message from TheLinkPanda</h2>
              <p><strong>Name:</strong> ${escapeHtml(name)}</p>
              <p><strong>Email:</strong> ${escapeHtml(email)}</p>
              <hr style="border:0;border-top:1px solid rgba(244,242,238,.15);margin:20px 0;">
              <p style="white-space:pre-line;line-height:1.6;">${escapeHtml(message)}</p>
            </div>
          `
        }
      ]
    };

    const res = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("MailChannels error:", errText);
      return json({ ok: false, error: "Email delivery failed." }, 500);
    }

    return json({ ok: true });

  } catch (err) {
    console.error("Contact form error:", err);
    return json({ ok: false, error: "Unexpected server error." }, 500);
  }
}

export async function onRequestGet() {
  return json({ ok: false, error: "Method not allowed. Use POST." }, 405);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
