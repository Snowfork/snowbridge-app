#!/usr/bin/env bash
# Pin the built dist/ folder to IPFS via Filebase as a single directory CID.
# Single source of the pin logic, used both manually and by the GitHub
# workflows (.github/workflows/filebase*.yml).
#
#   export FILEBASE_RPC_TOKEN=<your Filebase IPFS RPC API token>
#   ./scripts/deploy-filebase.sh             # builds, then pins
#   SKIP_BUILD=1 ./scripts/deploy-filebase.sh  # pins an existing dist/
#
# Prints the site root CID. In GitHub Actions it also writes `cid=<cid>` to
# $GITHUB_OUTPUT and a summary to $GITHUB_STEP_SUMMARY. The token stays in your
# shell env; it is never printed.
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

# Serve from a gateway ROOT (subdomain or DNSLink). The app uses absolute
# /assets paths, which 404 on a path gateway like ipfs.filebase.io/ipfs/<cid>/,
# so only subdomain/DNSLink/custom-domain gateways render it.
url="https://${cid}.ipfs.dweb.link/"
echo ""
echo "==> Deployed. Site root CID: $cid"
echo "    Preview (subdomain gateway): $url"
echo "    (Path gateways like ipfs.filebase.io/ipfs/<cid>/ render blank.)"

# Optionally point an IPNS name at this CID so a stable URL (via DNSLink /
# custom domain) follows each deploy. Set FILEBASE_IPNS_KEY to the Filebase
# IPNS name key to publish to (create it once in the Filebase dashboard).
ipns=""
if [ -n "${FILEBASE_IPNS_KEY:-}" ]; then
  echo "==> Publishing to IPNS name '${FILEBASE_IPNS_KEY}'..."
  ipns_resp=$(curl -sf -X POST \
    -H "Authorization: Bearer ${FILEBASE_RPC_TOKEN}" \
    "https://rpc.filebase.io/api/v0/name/publish?arg=/ipfs/${cid}&key=${FILEBASE_IPNS_KEY}&ttl=1m")
  ipns=$(printf '%s' "$ipns_resp" |
    node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{process.stdout.write(JSON.parse(d).Name||"")}catch{process.exit(1)}})')
  echo "    IPNS: /ipns/${ipns:-?} -> /ipfs/${cid}"
fi

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "cid=${cid}" >> "$GITHUB_OUTPUT"
  if [ -n "$ipns" ]; then echo "ipns=${ipns}" >> "$GITHUB_OUTPUT"; fi
fi
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "### Deployed to IPFS"
    echo ""
    echo "Root CID: \`${cid}\`"
    echo ""
    echo "Preview: ${url}"
    if [ -n "$ipns" ]; then printf '\nIPNS: `/ipns/%s`\n' "$ipns"; fi
  } >> "$GITHUB_STEP_SUMMARY"
fi
