#!/usr/bin/env bash
set -euo pipefail

echo "================================"
echo "Cloudflare DNS + Email Routing Setup"
echo "================================"
echo ""

if ! command -v curl &> /dev/null; then
    echo "Error: curl required"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "Error: jq required. Install: apt-get install jq (or brew install jq)"
    exit 1
fi

# Configuration - user must provide these
read -p "Cloudflare Zone ID for vovamail.xyz: " ZONE_ID
read -sp "Cloudflare API Token (Zone:Edit, Email Routing:Edit): " API_TOKEN
echo ""

if [ -z "$ZONE_ID" ] || [ -z "$API_TOKEN" ]; then
    echo "Error: Zone ID and API Token required"
    exit 1
fi

CF_API="https://api.cloudflare.com/client/v4"
AUTH_HEADER="Authorization: Bearer $API_TOKEN"

echo ""
echo "Step 1: Create MX records"
echo "-------------------------"

# MX records for Cloudflare Email Routing
mx_records=(
    '{"type":"MX","name":"@","content":"route1.mx.cloudflare.net","priority":17,"ttl":1}'
    '{"type":"MX","name":"@","content":"route2.mx.cloudflare.net","priority":43,"ttl":1}'
    '{"type":"MX","name":"@","content":"route3.mx.cloudflare.net","priority":92,"ttl":1}'
)

for record in "${mx_records[@]}"; do
    echo "Creating MX: $(echo "$record" | jq -r '.content')"
    curl -s -X POST "$CF_API/zones/$ZONE_ID/dns_records" \
        -H "$AUTH_HEADER" \
        -H "Content-Type: application/json" \
        -d "$record" | jq -r '.success // .errors'
done

echo ""
echo "Step 2: Enable Email Routing"
echo "-----------------------------"

# Enable email routing
curl -s -X POST "$CF_API/zones/$ZONE_ID/email/routing/enable" \
    -H "$AUTH_HEADER" | jq -r '.success // .errors'

echo ""
echo "Step 3: Create catch-all rule"
echo "------------------------------"

# Create catch-all rule to worker
RULE='{
  "name": "vovamail-catchall",
  "enabled": true,
  "matchers": [
    {"type": "all"}
  ],
  "actions": [
    {"type": "worker", "value": ["vovamail-inbound"]}
  ]
}'

curl -s -X POST "$CF_API/zones/$ZONE_ID/email/routing/rules" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "$RULE" | jq -r '.success // .errors'

echo ""
echo "Step 4: Verify Email Routing"
echo "-----------------------------"

curl -s "$CF_API/zones/$ZONE_ID/email/routing" \
    -H "$AUTH_HEADER" | jq '.result.status'

echo ""
echo "Done! Email routing configured."
echo "Test: Send email to alias@vovamail.xyz and check worker logs:"
echo "  wrangler tail vovamail-inbound"
