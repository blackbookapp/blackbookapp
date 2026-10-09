/** Sends via Resend when RESEND_API_KEY is set; otherwise logs and skips. */
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY não configurada — e-mail não enviado:", subject);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Blackbook <nao-responda@blackbookapp.com.br>",
        to,
        subject,
        html,
      }),
    });
    if (!res.ok) console.error("[email] falha Resend:", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("[email] erro:", e);
    return false;
  }
}
