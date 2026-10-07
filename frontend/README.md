# Halyard frontend

Static Next.js app for Halyard. It has no backend: every number is read from BNB Chain or the
public Binance market data API in the browser, and every action is a transaction from the user's
own wallet.

## Pages

- `/` landing
- `/dashboard` Venus position, health, headroom, market clock and protection status
- `/protect` set, preview, activate and revoke a Halyard policy
- `/simulator` replay every real weekend gap of TSLAB, NVDAB and SPCXB against a position
- `/keeper` run `protect` for positions that need it and earn the keeper tip

## Run

```bash
pnpm install
cp .env.example .env.local   # optional WalletConnect id
pnpm dev                     # http://localhost:3000
pnpm build                   # static export in out/
pnpm start                   # serve out/ locally
```

`pnpm build` writes plain HTML, JS and CSS to `out/`, ready for any static host or IPFS.

## Data sources

- BSC reads: `bsc-rpc.publicnode.com`, falling back to the public NodeReal endpoint from the
  BNB Chain docs, which also serves the event scans (`eth_getLogs`, 49,999 blocks per call).
- bStock candles: `data-api.binance.vision` hourly klines.
- Contract addresses: `src/lib/halyard/constants.ts`, matching `contracts/deployments/56.json`.

## Layout

- `src/app` routes: `(landing)` and `(app)` route groups
- `src/lib/halyard` chain reads, MarketClock port, plan and gap simulation, providers, pages
- `src/components` landing sections, layout (navbar, footer), brand marks and UI primitives
- `src/theme` Chakra theme with the Silver Harbor palette (see `brand.md` at the repo root)

## Testing against a local fork

Every write can be exercised end to end without real funds on an Anvil fork of BSC mainnet. The deployed HalyardVault, Venus, Lista Moolah and PancakeSwap are all part of the forked state.

```sh
anvil --fork-url <archive BSC RPC> --chain-id 56 --auto-impersonate
cast rpc anvil_setBlockTimestampInterval 1 --rpc-url http://127.0.0.1:8545
cast rpc anvil_setBalance <account> 0x8AC7230489E80000 --rpc-url http://127.0.0.1:8545

NEXT_PUBLIC_FORK_RPC_URL=http://127.0.0.1:8545 \
NEXT_PUBLIC_FORK_ACCOUNT=<account with a Venus bStock position> \
pnpm dev
```

- With `NEXT_PUBLIC_FORK_ACCOUNT` set, the app connects as that account through wagmi's mock connector and Anvil signs for it (no key needed). Browser wallets are not discovered in this mode, so nothing can be signed on mainnet by mistake.
- Both variables are ignored unless the URL is on localhost (`src/lib/halyard/fork.ts`).
- `anvil_setBlockTimestampInterval 1` keeps fork time from drifting. Venus price feeds for BNB, BTC and ETH have a staleness limit of a few minutes, and nothing updates them on a fork, so after a few minutes of wall-clock time every Venus read on an account holding those markets reverts with `invalid resilient oracle price`.
- To make `protect` due right away, save a policy whose trigger is above the account's current health.

## Deploy

Live at [halyard-bnb.vercel.app](https://halyard-bnb.vercel.app). `vercel.json` serves `out/` as plain static files (no Next.js runtime) and pins the pnpm version for installs. Deploys are built locally and uploaded:

```sh
vercel build --prod
vercel deploy --prebuilt --prod
```

Production env vars on Vercel: `NEXT_PUBLIC_WALLET_CONNECT_ID`, `NEXT_PUBLIC_SITE_URL`.
