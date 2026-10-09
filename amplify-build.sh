#!/usr/bin/env bash
# Builds the combined static site for AWS Amplify Hosting: marketing pages +
# the car-rental React app + the homestay app, all into one output directory.
# Same logic as scripts/vercel-build.sh, just a different output folder name
# to match amplify.yml's baseDirectory.
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

OUT="frontend/.amplify-output"
rm -rf "$OUT"
mkdir -p "$OUT/car-rental" "$OUT/homestay"

# 1. Marketing site (plain static HTML, no build step)
cp frontend/marketing/*.html "$OUT/"

# 2. Car Rental app (React/Vite — build then copy the output)
(cd frontend/car-rental && npm install && npm run build)
cp -r frontend/car-rental/dist/. "$OUT/car-rental/"

# 3. Homestay app (single static HTML file — inject the real backend URL
#    from the HOMESTAY_API_URL environment variable, set in the Amplify
#    console's Environment variables; leaves the placeholder untouched if
#    it isn't set)
cp frontend/homestay/index.html "$OUT/homestay/index.html"
if [ -n "$HOMESTAY_API_URL" ]; then
  sed -i "s#https://your-homestay-backend.onrender.com#${HOMESTAY_API_URL}#" "$OUT/homestay/index.html"
fi

# 4. AI Products pages — inject the Products API URL from the PRODUCTS_API_URL
#    environment variable (bare URL, no /api suffix; a trailing slash is fine).
#    Leaves the placeholder in place if it isn't set, and the pages then show
#    a clear "not configured" message instead of failing silently.
if [ -n "$PRODUCTS_API_URL" ]; then
  PRODUCTS_API_URL="${PRODUCTS_API_URL%/}"
  sed -i "s#https://your-products-backend.onrender.com#${PRODUCTS_API_URL}#" "$OUT/ai-products.html" "$OUT/ai-products-admin.html"
fi

echo "Build complete: $OUT"
