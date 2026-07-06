# Deploying the Snowbridge UI to IPFS

This app is a static Vite + React PWA. It is built on GitHub's CI runners and
pinned to IPFS via **Filebase**. There is no server, all config lives in this
repo (config-as-code), so a teammate changes how it deploys by opening a normal
PR, not by logging into a hosting dashboard.

## Where each piece of config lives

| What | Where | How a teammate changes it |
| --- | --- | --- |
| Build + deploy pipeline | `.github/workflows/filebase.yml` | Edit the file in a PR |
| Build config (bundler, PWA, SPA fallback, aliases) | `vite.config.ts` | Edit the file in a PR |
| App env values (`NEXT_PUBLIC_*`) | GitHub repo **Secrets** (Settings → Secrets and variables → Actions) | Repo admin updates the secret; reference it in `filebase.yml` |
| Filebase deploy token | GitHub secret `FILEBASE_RPC_TOKEN` | Repo admin rotates it in GitHub + Filebase |
| Which branch deploys | `on.push.branches` in `filebase.yml` | Edit the file in a PR |

Because the pipeline and build config are files in the repo, collaboration uses
**GitHub's existing roles and PR review**, no Filebase seat is required for a
teammate to change the deploy. Only one person needs Filebase access, to mint
the token once.

## How a deploy happens

- **Environments** (`.github/workflows/filebase.yml`): on push to an environment
  branch (after a PR merges), GitHub Actions installs deps → `pnpm build` → pins
  `dist/` to IPFS as a single directory CID via Filebase's IPFS RPC
  (`/api/v0/add?wrap-with-directory=true`), then (for staging) republishes the
  branch's IPNS name to that CID so the DNSLinked domain follows the deploy.
  Branch → env:
  - `main` → **staging**, republishes the `staging` IPNS name to the new CID.
  - `polkadot_mainnet` → **prod**. The free tier allows one IPNS name (used by
    staging), so prod's domain DNSLinks straight at the CID instead of an IPNS
    name. After pinning, the workflow's "Update prod DNSLink (Route 53)" step
    UPSERTs the `_dnslink.app.snowbridge.network` TXT record to
    `dnslink=/ipfs/<cid>` (TTL 60), so prod follows deploys with no manual DNS
    edit, same hands-off feel as staging.

  The `staging` IPNS name must exist in Filebase before main's first deploy, or
  the publish step fails (the bundle still pins, but the run goes red and the
  domain is not updated).

### URLs

The Filebase free tier also allows only one custom domain (one gateway), which
`app.snowbridge.network` (prod) holds for its TLS cert. Staging therefore has no
snowbridge.network domain; the team reaches it through the permanent staging
IPNS name on a public subdomain gateway (valid TLS, and it's a subdomain gateway
so absolute `/assets` and the SPA `_redirects` fallback both work):

- **prod**: https://app.snowbridge.network/
- **staging**: https://k51qzi5uqu5dmegclz0sz7dhncuqpdxhxyuzp3d8edo90j54oskg8gs592058i.ipns.dweb.link/

The staging URL is stable across deploys (the IPNS key never changes; CI just
republishes it). `<key>.ipns.inbrowser.link` is an equivalent fallback gateway
if dweb.link is slow. The staging key is also in the `_dnslink.staging-app` TXT
record for reference.

  Prod's Route 53 step needs three repo secrets: `AWS_ACCESS_KEY_ID` and
  `AWS_SECRET_ACCESS_KEY` for an IAM user whose only permission is
  `route53:ChangeResourceRecordSets` on the snowbridge.network hosted zone, plus
  `AWS_ROUTE53_HOSTED_ZONE_ID` (the zone's ID). Minimal IAM policy:

  ```json
  {
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": "route53:ChangeResourceRecordSets",
      "Resource": "arn:aws:route53:::hostedzone/<ZONE_ID>"
    }]
  }
  ```
- **Per-PR preview** (`.github/workflows/filebase-preview.yml`): on every push to
  an open PR, builds and pins a preview, then posts/updates a PR comment with the
  unique preview URL. Previews are content-addressed CIDs, isolated from the
  environments (they never repoint an IPNS name). Fork PRs get no preview (no
  secret access). The previous preview for a PR is unpinned to conserve quota.

### Stable domain for an environment (IPNS + DNSLink)

Each deploy is a new CID; an IPNS name is the stable pointer the domain follows.
One-time, per environment (e.g. staging at `staging-app.snowbridge.network`):

1. In the Filebase dashboard → **Names**, create an IPNS name and label its key
   `staging` (must match `FILEBASE_IPNS_KEY` in the workflow). Note the IPNS name
   it issues (a `k51…` string). The RPC token must belong to the same account.
2. At your DNS provider, DNSLink the domain to that IPNS name:
   - `TXT  _dnslink.staging-app.snowbridge.network  "dnslink=/ipns/k51…"`
   - Point the host at a DNSLink-resolving gateway (Filebase's gateway with a
     custom domain, or a `CNAME` to one). Filebase's dashboard shows the exact
     record for a custom-domain gateway.
3. Merge to `main` → the deploy republishes the `staging` IPNS name to the new
   CID, and the domain serves it. Subsequent merges just update the pointer.
- **Per-PR preview** (`.github/workflows/filebase-preview.yml`): on every push to
  an open PR, builds and pins a preview, then posts/updates a PR comment with the
  unique preview URL. Previews are content-addressed CIDs, isolated from prod
  (they never repoint the prod IPNS/domain). Fork PRs get no preview (no secret
  access). The previous preview for a PR is unpinned to conserve quota.

## One-time setup (repo admin)

1. Create a free Filebase account (https://console.filebase.com/signup), make an
   **IPFS bucket**, and generate an **IPFS RPC API token**.
2. Add GitHub repo secrets (Settings → Secrets and variables → Actions):
   - `FILEBASE_RPC_TOKEN`, the Filebase IPFS RPC API token.
   - One secret per `NEXT_PUBLIC_*` build var (see the Build step in the
     workflows for the full list), e.g.
     `NEXT_PUBLIC_SNOWBRIDGE_ENV=polkadot_mainnet`, `NEXT_PUBLIC_ALCHEMY_KEY`,
     `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`, etc. Set them all at once from
     your local file:
     ```bash
     while IFS='=' read -r k v; do
       gh secret set "$k" --repo Snowfork/snowbridge-app --body "$v"
     done < <(grep '^NEXT_PUBLIC_' .env.local)
     ```
3. For a **stable URL** across deploys, point a Filebase IPNS name / custom
   domain at the bucket in the dashboard (the CID changes every deploy).

> Note: only the publishable `NEXT_PUBLIC_*` values go here, they are baked into
> the public bundle and visible to anyone. Never add a server secret.

## Local development

```bash
pnpm dev       # local dev server
pnpm build     # run tests + production build into dist/
pnpm preview   # serve the built dist/ locally
pnpm test      # vitest
pnpm lint      # eslint
```

`pnpm build` also writes `dist/404.html` (a copy of `index.html`) so deep links
like `/activity` resolve to the app shell on a static host / IPFS gateway.

## Known caveats

- **First deploy validation**: confirm the gateway serves nested assets
  (`/assets/*`) correctly, i.e. the folder upload produced a proper directory
  CID. If assets 404, switch the deploy step to a CAR-based upload.
- **Stable URL**: without an IPNS name / custom domain, each deploy yields a new
  CID (new URL). Set up IPNS in Filebase for a durable link.
