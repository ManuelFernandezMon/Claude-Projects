#!/usr/bin/env bash
# Runs Lighthouse (mobile + desktop) against a served site and prints the four category scores.
# Usage: URL=http://127.0.0.1:4173/ scripts/verify/lighthouse.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
URL="${URL:-http://127.0.0.1:4173/}"
export CHROME_PATH="${CHROME_PATH:-/opt/pw-browsers/chromium-1194/chrome-linux/chrome}"
mkdir -p reports
for preset in mobile desktop; do
  args=(--quiet --output=json --output-path="reports/lighthouse-$preset.json"
        --only-categories=performance,accessibility,best-practices,seo
        --chrome-flags="--headless=new --no-sandbox --disable-gpu")
  [ "$preset" = desktop ] && args+=(--preset=desktop)
  npx lighthouse "$URL" "${args[@]}"
done
node -e '
const fs = require("fs");
for (const p of ["mobile","desktop"]) {
  const j = JSON.parse(fs.readFileSync(`reports/lighthouse-${p}.json`,"utf8"));
  const s = Object.fromEntries(Object.entries(j.categories).map(([k,v]) => [k, Math.round(v.score*100)]));
  const a = j.audits;
  console.log(p, JSON.stringify(s), "LCP", a["largest-contentful-paint"].displayValue, "TBT", a["total-blocking-time"].displayValue, "CLS", a["cumulative-layout-shift"].displayValue);
}'
