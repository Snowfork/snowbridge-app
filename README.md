# Snowbridge App

Perform token transfers using Snowbridge.

## Getting Started

### Configure

Copy the `.env.example`-file into an `.env`-file on the same scope.
Then, on the `.env`-file, configure of your project by assigning the values that fit your needs.

**NEXT_PUBLIC_SNOWBRIDGE_ENV** accepts:

- `local_e2e` for local environment.
- `rococo_sepolia` for Rococo <=> Sepolia bridge.
- `kusama_mainnet` for Kusama <=> Ethereum bridge. (TBD)
- `polkadot_mainnet` for Polkadot <=> Ethereum bridge.

```env
NEXT_PUBLIC_SNOWBRIDGE_ENV=rococo_sepolia
```

If you are not using local chains, create an `.env.local` to set the required A.P.I. keys.

```env
NEXT_PUBLIC_ALCHEMY_KEY=...
NEXT_PUBLIC_SUBSCAN_KEY=...
CHAINALYSIS_KEY=...
```

### Run

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
