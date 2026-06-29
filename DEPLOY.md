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

1. Push (or merge) to the deploy branch (`clara/ipfs` today; change to `main`
   for the production cutover).
2. GitHub Actions: install deps → `pnpm build` (with `NEXT_PUBLIC_*` injected
   from secrets) → pin the whole `dist/` folder to IPFS as a single directory
   CID via Filebase's IPFS RPC (`/api/v0/add?wrap-with-directory=true`).
3. The run summary prints the site **root CID** and a gateway URL.

Manual run: Actions tab → "Deploy to IPFS (Filebase)" → "Run workflow".

## One-time setup (repo admin)

1. Create a free Filebase account (https://console.filebase.com/signup), make an
   **IPFS bucket**, and generate an **IPFS RPC API token**.
2. Add GitHub repo secrets (Settings → Secrets and variables → Actions):
   - `FILEBASE_RPC_TOKEN`
   - `NEXT_PUBLIC_SNOWBRIDGE_ENV` (e.g. `polkadot_mainnet`)
   - `NEXT_PUBLIC_ALCHEMY_KEY`
   - `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`
   - `NEXT_PUBLIC_GRAPHQL_API_URL`
   - any other `NEXT_PUBLIC_*` the build needs (see `.env.example`)
3. For a **stable URL** across deploys, point a Filebase IPNS name / custom
   domain at the bucket in the dashboard (the CID changes every deploy).

> Note: `NEXT_PUBLIC_*` values are baked into the public static bundle at build
> time and are visible to anyone, only put publishable values here, never a
> server secret.

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
