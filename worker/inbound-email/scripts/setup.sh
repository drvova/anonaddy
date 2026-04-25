#!/usr/bin/env bash
set -euo pipefail

echo "================================"
echo "VovaMail Inbound Worker Setup"
echo "================================"
echo ""

# Check dependencies
if ! command -v wrangler &> /dev/null; then
    echo "Error: wrangler CLI not found. Install with:"
    echo "  npm install -g wrangler"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "Error: jq not found. Install with:"
    echo "  apt-get install jq  (or brew install jq on macOS)"
    exit 1
fi

# Check auth
if ! wrangler whoami &> /dev/null; then
    echo "Error: Not authenticated with Wrangler. Run:"
    echo "  wrangler login"
    exit 1
fi

# Prompt for secrets
echo "Step 1: Configure secrets"
echo "-------------------------"
read -sp "Enter INBOUND_WEBHOOK_SECRET (same as Zeabur env): " WEBHOOK_SECRET
echo ""

if [ -z "$WEBHOOK_SECRET" ]; then
    echo "Error: Webhook secret cannot be empty"
    exit 1
fi

echo "Setting Wrangler secret..."
echo "$WEBHOOK_SECRET" | wrangler secret put VOVAMAIL_WEBHOOK_SECRET

echo ""
echo "Step 2: Deploy worker"
echo "---------------------"
wrangler deploy

echo ""
echo "Step 3: Enable Email Routing"
echo "-----------------------------"
echo ""
echo "To complete setup, run the DNS setup script:"
echo "  ./scripts/setup-dns.sh"
echo ""
echo "Or manually in Cloudflare dashboard:"
echo "1. Go to vovamail.xyz → Email → Email Routing"
echo "2. Enable Email Routing"
echo "3. Add MX records (see setup-dns.sh for values)"
echo "4. Create catch-all rule pointing to worker 'vovamail-inbound'"
echo ""
echo "Setup complete!"
