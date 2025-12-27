# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start development server (localhost:3000)
pnpm build        # Run tests then build (jest && next build)
pnpm test         # Run all tests
pnpm lint         # Run ESLint
pnpm format       # Format code with Prettier
```

Run a single test file:
```bash
pnpm test __tests__/addressBlock.test.ts
```

## Architecture Overview

Snowbridge App is a Next.js application for cross-chain token transfers between Ethereum and Polkadot ecosystems.

### Key Technologies
- **Next.js 14** with App Router (`/app` directory)
- **Jotai** for state management (`/store`)
- **SWR** for client-side data fetching
- **@snowbridge/api** for bridge operations
- **ethers v6** + **@reown/appkit** for Ethereum wallet connectivity
- **@talismn/connect-wallets** for Polkadot wallet connectivity
- **Radix UI** + **Tailwind CSS** for UI components

### Directory Structure
- `/app` - Next.js pages and layouts
- `/components` - React components organized by feature (transfer/, activity/, ui/, home/)
- `/store` - Jotai atoms (ethereum.ts, polkadot.ts, snowbridge.ts)
- `/hooks` - Custom React hooks for business logic
- `/lib` - Utilities split by environment: `/lib/client` (browser) and `/lib/server` (Node.js)
- `/utils` - Helper functions (types, validation, formatting, balances)

### Transfer Flow
1. `TransferForm.tsx` - Form for source/destination/token/amount
2. `useSendToken.ts` - Orchestrates transfer with fee validation
3. `utils/sendToken.ts` - Executes token operations (ERC20 approval, deposit)
4. `inferTransferType.ts` - Determines transfer type from form state

### Transfer Types (see `utils/inferTransferType.ts`)
- `toPolkadotV2` - Ethereum → Polkadot (substrate destination)
- `toEthereumV2` - Polkadot/EVM → Ethereum (handles both substrate and EVM chains like Moonbeam)
- `forInterParachain` - Polkadot parachain ↔ parachain (substrate to substrate)

### Environment Configuration
Set `NEXT_PUBLIC_SNOWBRIDGE_ENV` in `.env`:
- `local_e2e` - Local development
- `paseo_sepolia` - Paseo ↔ Sepolia testnet
- `westend_sepolia` - Westend ↔ Sepolia testnet
- `polkadot_mainnet` - Production

Required API keys in `.env.local`:
- `NEXT_PUBLIC_ALCHEMY_KEY` - Ethereum RPC
- `NEXT_PUBLIC_SUBSCAN_KEY` - Substrate chain data
- `CHAINALYSIS_KEY` - OFAC compliance
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` - Web3Modal

### Path Aliases
Use `@/*` to import from project root (configured in tsconfig.json).

### Compliance
The middleware (`middleware.ts`) blocks requests from OFAC-sanctioned countries/regions.
