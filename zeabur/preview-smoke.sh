#!/usr/bin/env bash
set -euo pipefail

TARGET_URL="${1:-${TARGET_URL:-}}"

if [[ -z "${TARGET_URL}" ]]; then
  echo "Usage: $0 <preview-url>" >&2
  echo "or set TARGET_URL=<preview-url>" >&2
  exit 1
fi

TARGET_URL="${TARGET_URL%/}"

if ! command -v curl >/dev/null 2>&1; then
  echo "[smoke] curl is required." >&2
  exit 1
fi

if ! command -v playwright-cli >/dev/null 2>&1; then
  echo "[smoke] playwright-cli is required. Install it before running this script." >&2
  exit 1
fi

echo "[smoke] Running HTTP checks against ${TARGET_URL}..."

login_status="$(curl -sS -o /dev/null -w "%{http_code}" "${TARGET_URL}/login")"
if [[ "${login_status}" != "200" ]]; then
  echo "[smoke] Expected /login to return 200, got ${login_status}." >&2
  exit 1
fi

root_status="$(curl -sS -L -o /dev/null -w "%{http_code}" "${TARGET_URL}/")"
if [[ ! "${root_status}" =~ ^(2|3) ]]; then
  echo "[smoke] Expected / to resolve with 2xx/3xx, got ${root_status}." >&2
  exit 1
fi

echo "[smoke] Running Playwright checks against ${TARGET_URL}..."
session_id="zeabur-preview-smoke-$$"

cleanup() {
  playwright-cli -s="${session_id}" close >/dev/null 2>&1 || true
}
trap cleanup EXIT

playwright-cli -s="${session_id}" open "${TARGET_URL}/login" >/dev/null

email_field="$(playwright-cli -s="${session_id}" eval "Boolean(document.querySelector('input[type=email], input[name=email]'))" | tr -d '\r')"
password_field="$(playwright-cli -s="${session_id}" eval "Boolean(document.querySelector('input[type=password], input[name=password]'))" | tr -d '\r')"

if ! echo "${email_field}" | grep -qi "true"; then
  echo "[smoke] Login page email field not detected." >&2
  exit 1
fi

if ! echo "${password_field}" | grep -qi "true"; then
  echo "[smoke] Login page password field not detected." >&2
  exit 1
fi

echo "[smoke] PASS: Zeabur preview checks completed."
