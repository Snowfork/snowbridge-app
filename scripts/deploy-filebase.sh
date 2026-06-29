#!/usr/bin/env bash
# Manual deploy: pin the built dist/ folder to IPFS via Filebase as a single
# directory CID. Usage:
#
#   export FILEBASE_RPC_TOKEN=<your Filebase IPFS RPC API token>
#   ./scripts/deploy-filebase.sh           # builds, then pins
#   SKIP_BUILD=1 ./scripts/deploy-filebase.sh   # pins existing dist/
#
# The token stays in your shell env; it is never printed.
set -euo pipefail

: "${FILEBASE_RPC_TOKEN:?Set FILEBASE_RPC_TOKEN to your Filebase IPFS RPC API token}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  echo "==> Building..."
  pnpm build
fi

[ -d dist ] || {
  echo "dist/ not found, build first (or unset SKIP_BUILD)"
  exit 1
}

echo "==> Pinning $(find dist -type f | wc -l | tr -d ' ') files to IPFS via Filebase..."
args=()
while IFS= read -r f; do
  # filename = path relative to dist/ so the RPC rebuilds the directory tree
  args+=(-F "file=@${f};filename=${f#dist/}")
done < <(find dist -type f | sort)

resp=$(curl -sf -X POST \
  -H "Authorization: Bearer ${FILEBASE_RPC_TOKEN}" \
  "https://rpc.filebase.io/api/v0/add?wrap-with-directory=true&cid-version=1&pin=true" \
  "${args[@]}")

# With wrap-with-directory the wrapping directory is the final NDJSON line.
cid=$(printf '%s\n' "$resp" | tail -n 1 |
  node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{process.stdout.write(JSON.parse(d).Hash||"")}catch{process.exit(1)}})')

if [ -z "$cid" ]; then
  echo "Failed to parse root CID. Raw response:"
  echo "$resp"
  exit 1
fi

echo ""
echo "==> Deployed. Site root CID: $cid"
echo "    Gateway:  https://${cid}.ipfs.dweb.link/"
echo "    Filebase: https://ipfs.filebase.io/ipfs/${cid}/"
echo ""
echo "Open one of those and check that /assets load and that a deep link"
echo "(e.g. add /activity) resolves via the 404.html fallback."
