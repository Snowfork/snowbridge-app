# Snowbridge App

Perform token transfers using Snowbridge.

## Getting Started

Set the environment in the `.env` file. Use:
* `local_e2e` for local environment.
* `rococo_sepolia` for Rococo <=> Sepolia bridge.
* `kusama_mainnet` for Kusama <=> Ethereum bridge. (TBD)
* `polkadot_mainnet` for Polkadot <=> Ethereum bridge.

```env
NEXT_PUBLIC_SNOWBRIDGE_ENV=rococo_sepolia
```

Create an `.env.local` to set the required keys.

```env
NEXT_PUBLIC_ALCHEMY_KEY=...
NEXT_PUBLIC_SUBSCAN_KEY=...
CHAINALYSIS_KEY=...
```

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
