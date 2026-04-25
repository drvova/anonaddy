# VovaMail Inbound Email Worker

Cloudflare Email Worker that receives inbound emails and forwards them to VovaMail's generic webhook endpoint.

## Architecture

```
Sender → Cloudflare MX → Email Worker → POST /api/inbound → VovaMail
```

## Prerequisites

- Node.js 18+
- Wrangler CLI authenticated (`wrangler login`)
- Cloudflare API Token with `Zone:Edit` and `Email Routing:Edit` permissions
- Zone ID for your domain

## Quick Start

### 1. Install dependencies

```bash
cd worker/inbound-email
npm install
```

### 2. Run interactive setup

```bash
npm run setup
```

This will:
- Prompt for your `INBOUND_WEBHOOK_SECRET`
- Set it as a Wrangler secret
- Deploy the worker

### 3. Configure DNS and Email Routing

```bash
npm run setup-dns
```

This will prompt for:
- Cloudflare Zone ID
- Cloudflare API Token

Then automatically:
- Create MX records for Cloudflare Email Routing
- Enable Email Routing
- Create catch-all rule directing all emails to this worker

## Manual Setup (if preferred)

### Deploy worker

```bash
wrangler deploy
```

### Set secret

```bash
echo "your-webhook-secret" | wrangler secret put VOVAMAIL_WEBHOOK_SECRET
```

### Create MX records in Cloudflare dashboard

Add these MX records to your domain:

| Type | Name | Content | Priority | TTL |
|------|------|---------|----------|-----|
| MX | @ | route1.mx.cloudflare.net | 17 | Auto |
| MX | @ | route2.mx.cloudflare.net | 43 | Auto |
| MX | @ | route3.mx.cloudflare.net | 92 | Auto |

### Enable Email Routing

1. Go to Cloudflare Dashboard → vovamail.xyz → Email → Email Routing
2. Click "Enable Email Routing"
3. Create a catch-all rule:
   - Match: All incoming emails
   - Action: Send to Worker → `vovamail-inbound`

## Configuration

Environment variables (in `wrangler.toml`):

| Variable | Description |
|----------|-------------|
| `VOVAMAIL_INBOUND_ENDPOINT` | URL to VovaMail's inbound webhook |

Secrets (set via `wrangler secret put`):

| Secret | Description |
|--------|-------------|
| `VOVAMAIL_WEBHOOK_SECRET` | Must match `INBOUND_WEBHOOK_SECRET` in VovaMail env |

## Monitoring

View worker logs:

```bash
wrangler tail vovamail-inbound
```

## Troubleshooting

### Worker not receiving emails
- Verify MX records are correct
- Check Email Routing is enabled in Cloudflare dashboard
- Verify catch-all rule exists and points to worker

### VovaMail returning 401
- Check `VOVAMAIL_WEBHOOK_SECRET` matches `INBOUND_WEBHOOK_SECRET` in Zeabur env vars
- Verify secret was deployed: `wrangler secret list`

### Emails not forwarding
- Check worker logs: `wrangler tail`
- Verify VovaMail app is running and `/api/inbound` is accessible
- Check VovaMail logs for webhook processing errors
