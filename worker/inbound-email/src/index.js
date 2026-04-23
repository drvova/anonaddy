/**
 * VovaMail Inbound Email Worker
 *
 * Receives email via Cloudflare Email Routing, reads the raw MIME stream,
 * and POSTs it to the Laravel application's inbound endpoint.
 */

export default {
  async email(message, env, ctx) {
    const toAddress = message.to;
    const fromAddress = message.from;
    const rawSize = message.rawSize;

    const rawChunks = [];
    const reader = message.raw.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        rawChunks.push(value);
      }
    } catch (err) {
      message.setReject(`Failed to read message: ${err.message}`);
      return;
    }

    const rawMime = await concatenateChunks(rawChunks);

    const recipients = parseRecipient(toAddress);

    const timestamp = Date.now().toString();
    const payload = JSON.stringify({
      raw_mime: rawMime,
      sender: fromAddress,
      recipients: recipients,
      size: rawSize,
    });

    const signature = await computeSignature(timestamp, payload, env.WEBHOOK_SECRET);

    try {
      const response = await fetch(env.INBOUND_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Cf-Inbound-Timestamp": timestamp,
          "X-Cf-Inbound-Signature": signature,
        },
        body: payload,
      });

      if (!response.ok) {
        const body = await response.text();
        console.error(`Inbound endpoint returned ${response.status}: ${body}`);

        if (response.status === 401 || response.status === 403) {
          message.setReject("Authentication failed");
        }
      }
    } catch (err) {
      console.error(`Failed to deliver to inbound endpoint: ${err.message}`);
    }
  },
};

async function computeSignature(timestamp, body, secret) {
  const message = `${timestamp}.${body}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `sha256=${hashHex}`;
}

async function concatenateChunks(chunks) {
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(combined);
}

function parseRecipient(toAddress) {
  const localPart = toAddress.includes("+")
    ? toAddress.substring(0, toAddress.indexOf("+"))
    : toAddress.substring(0, toAddress.indexOf("@"));

  const extension = toAddress.includes("+")
    ? toAddress.substring(toAddress.indexOf("+") + 1, toAddress.indexOf("@"))
    : "";

  const domain = toAddress.substring(toAddress.indexOf("@") + 1);

  return [
    {
      email: toAddress,
      local_part: localPart,
      extension: extension,
      domain: domain,
    },
  ];
}
