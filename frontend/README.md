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
