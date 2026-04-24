export default {
  async email(message, env, ctx) {
    const raw = await new Response(message.raw).text();

    const payload = {
      raw_mime: raw,
      sender: message.from,
      recipients: [
        {
          email: message.to,
          local_part: message.to.split('@')[0] || '',
          extension: '',
          domain: message.to.split('@')[1] || '',
        },
      ],
      size: message.rawSize,
    };

    const response = await fetch(env.VOVAMAIL_INBOUND_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': env.VOVAMAIL_WEBHOOK_SECRET,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'unknown error');
      console.error(`VovaMail inbound webhook failed: ${response.status} ${text}`);
    }
  },
};
