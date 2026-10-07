# Halyard

Borrow more against your tokenized stocks on BNB Chain, safely.

People who borrow against bStocks (TSLAB, NVDAB, SPCXB) on Venus keep huge safety buffers, because nothing protects them when the US market reopens with a gap and a liquidation costs 10%. Halyard lets them use more of their borrowing power.

Set a policy once. Before the market closes for the weekend, or whenever health gets low, the position is de-risked in one atomic transaction:
1. a free flash loan repays part of the debt;
2. a slice of bStock collateral is redeemed and sold on PancakeSwap;
3. the flash loan is paid back.

The cost is a few dollars instead of a liquidation.

- Immutable contracts, no admin keys, never borrows on behalf of a user
- No backend: static frontend and permissionless keepers
- A Wallet Skill so users can manage protection in plain language

**Live app: [halyard-bnb.vercel.app](https://halyard-bnb.vercel.app)**

Built for [BNB Hack: Tokenized Stocks Edition](https://www.bnbchain.org/en/hackathons/tokenized-stocks).

## Status

- **HalyardVault on BSC mainnet:** [`0x6137aCd41F9828dE0836EA5a776e95184bF7Df10`](https://bscscan.com/address/0x6137aCd41F9828dE0836EA5a776e95184bF7Df10#code) (source verified).
- **Live app:** [halyard-bnb.vercel.app](https://halyard-bnb.vercel.app) (static frontend in [`frontend/`](frontend/), BSC mainnet).
- **Wallet Skill:** [`skills/halyard/`](skills/halyard/) for the Binance Agentic Wallet.
- **Keeper script:** [`keeper/`](keeper/), optional and open source.

## What is in the repo

| Path | What it is |
|---|---|
| [`contracts/`](contracts/) | `HalyardVault` and `MarketClock` (Foundry), unit and mainnet fork tests |
| [`frontend/`](frontend/) | Static Next.js app: landing page, Dashboard, Protect, Simulator, Keeper |
| [`skills/halyard/`](skills/halyard/) | Wallet Skill in the Binance Skills Hub format, driven through `baw contract-call` |
| [`keeper/`](keeper/) | Node script that calls the permissionless `protect(user)` when a plan is due |

## App pages

- **Dashboard:** your Venus position from chain: health, debt, borrow limit, how far bStocks can fall before liquidation, how much more USDT fits at health 1.50, 1.40 and 1.30, the US market clock and your protection history. Any address can be viewed read-only with `?address=`.
- **Protect:** set a policy (trigger, target, weekend target, slippage, expiry, which bStocks may be sold), see the exact plan the vault would run, then delegate and save in your wallet. Clear or revoke at any time.
- **Simulator:** replays every real weekend and holiday gap in TSLAB, NVDAB and SPCXB since June 2026 against your position, with and without Halyard, plus a stress test.
- **Keeper:** every account with a policy and whether it is due. Anyone can run `protect` from the browser and earn the tip.

## Run the frontend

```sh
pnpm --dir frontend install
pnpm --dir frontend dev      # http://localhost:3000
pnpm --dir frontend build    # static files in frontend/out/
```

Optional `frontend/.env.local`: `NEXT_PUBLIC_WALLET_CONNECT_ID` (a Reown project id, enables the full wallet list) and `NEXT_PUBLIC_SITE_URL` (absolute URL for social previews). Without them the app still works with any injected browser wallet.

Every number comes from BNB Smart Chain through public RPCs or from the public Binance market data mirror (`data-api.binance.vision`). There is no backend.

## Contracts

| Contract | Address |
|---|---|
| HalyardVault | [`0x6137aCd41F9828dE0836EA5a776e95184bF7Df10`](https://bscscan.com/address/0x6137aCd41F9828dE0836EA5a776e95184bF7Df10#code) |
| Venus Comptroller (Core Pool) | `0xfD36E2c2a6789Db23113685031d7F16329158384` |
| Lista Moolah (flash loans) | `0x8F73b65B4caAf64FBA2aF91cC5D4a2A1318E5D8C` |

HalyardVault is immutable, has no owner and is verified on Sourcify and BscScan. It has not been audited.

## Docs

See:
- [docs/HACKATHON.md](docs/HACKATHON.md) for the hackathon rules
- [docs/IDEA.md](docs/IDEA.md) for the product
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the technical design
- [docs/RESEARCH.md](docs/RESEARCH.md) for the verified data behind it
- [docs/DECISIONS.md](docs/DECISIONS.md) for settled design decisions
- [contracts/README.md](contracts/README.md) to test and deploy the contracts
