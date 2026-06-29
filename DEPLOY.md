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

- **Production** (`.github/workflows/filebase.yml`): on push to `polkadot_mainnet`
  (i.e. after a PR merges), GitHub Actions installs deps → `pnpm build` → pins
  the whole `dist/` folder to IPFS as a single directory CID via Filebase's IPFS
  RPC (`/api/v0/add?wrap-with-directory=true`). The run summary prints the root
  CID + gateway URL. Manual run: Actions tab → "Deploy to IPFS (Filebase)" →
  "Run workflow".
- **Per-PR preview** (`.github/workflows/filebase-preview.yml`): on every push to
  an open PR, builds and pins a preview, then posts/updates a PR comment with the
  unique preview URL. Previews are content-addressed CIDs, isolated from prod
  (they never repoint the prod IPNS/domain). Fork PRs get no preview (no secret
  access). The previous preview for a PR is unpinned to conserve quota.

## One-time setup (repo admin)

1. Create a free Filebase account (https://console.filebase.com/signup), make an
   **IPFS bucket**, and generate an **IPFS RPC API token**.
2. Add GitHub repo secrets (Settings → Secrets and variables → Actions):
   - `FILEBASE_RPC_TOKEN` — the Filebase IPFS RPC API token.
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
