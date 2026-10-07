# CLAUDE.md

Guidance for Claude Code sessions working in this repository.

## Project

**Halyard**: lets people borrow more against their bStocks (TSLAB, NVDAB, SPCXB) on Venus, safely, by de-risking positions automatically before US market closes and when health gets low. BNB Smart Chain mainnet. Positioning: capital efficiency plus safety. Built for BNB Hack: Tokenized Stocks Edition. **Submission deadline: Oct 11 2026, 12:00 UTC.**

Read these before doing anything:
- `docs/HACKATHON.md`: rules, judging criteria, deadlines, provided stack
- `docs/IDEA.md`: product concept, problem, business model
- `docs/ARCHITECTURE.md`: contracts, keeper layer, frontend, testing plan
- `docs/RESEARCH.md`: verified on-chain facts, competitor scan, resolved questions
- `docs/DECISIONS.md`: settled decisions (do not reopen without new evidence)
- `docs/DEVEX_LOG.md`: running log of developer experience friction (feeds the DevEx report)

## Hard constraints

- **No mock data, no mock features.** Every number shown in the UI comes from chain or a real API. Every action is a real transaction. No placeholder values, no fake demo mode.
- **No backend.** Static frontend, smart contracts, permissionless keepers, and an agent on BNB Agent Studio. Do not add servers, databases or API routes.
- **BSC mainnet only, spot only.** No perps anywhere, including as a price reference.
- bStocks must stay central to the product.
- The HalyardVault must never contain a code path that borrows on behalf of a user.

## Current status (2026-10-06)

- Contracts done in `contracts/`: `HalyardVault`, `MarketClock`, interfaces, 21 tests (unit plus mainnet fork) passing.
- **Deployed:** HalyardVault `0x6137aCd41F9828dE0836EA5a776e95184bF7Df10` on BSC mainnet (block 126043949), verified exact match on Sourcify and BscScan. Address and start block are in `contracts/deployments/56.json`. It is immutable, so a contract change means a new deployment and a new address.
- **Frontend done** in `frontend/`: a single static Next.js app (`output: 'export'`, no API routes, no server). Pages: landing, `/dashboard`, `/protect`, `/simulator`, `/keeper`. Halyard logic lives in `frontend/src/lib/halyard/` (ABIs, MarketClock port, plan and gap simulation, event scans, wallet providers). Run with `pnpm --dir frontend dev`; `pnpm --dir frontend build` writes `frontend/out/`.
- The on-chain Protect and Keeper transactions are built but not yet run end to end; that needs the demo position below.
- **Wallet Skill** in `skills/halyard/` (SKILL.md, references, zero-dependency `scripts/halyard.mjs`). Reads and calldata verified against mainnet and `cast`; the `baw contract-call` flow itself is untested until the user has a VPN and Developer Mode.
- **Keeper script** in `keeper/` (`npm run once` watch-only pass verified on mainnet).
- Next step: deploy the frontend, then end-to-end transaction tests with the demo position.
- Blocked on the user for:
  1. Done: NodeReal MegaNode key is in `.env` as `BSC_ARCHIVE_RPC` (archive verified, never commit or print it).
  2. Deployer keystore `halyard-deployer` (`0x18E3fe26452ca4320a6C5365D349598cd855EeD7`, also the fee recipient) exists and is funded. A small bStock plus USDT position for the live demo is still needed.
  3. A VPN when testing the `baw` CLI or Binance APIs (Binance domains are ISP-blocked in Indonesia).
  4. Developer Mode enabled in the Binance App for the Agentic Wallet `contract-call` flow.

## Writing conventions

- All documents, code comments, commit messages and UI copy are in **English**.
- **Never use the em dash or en dash characters.** Use commas, periods, colons, parentheses or a plain hyphen instead. Check with `grep -rn $'—\|–' .` before committing.
- Chat with the user in **Indonesian**.

## Git conventions

- The only contributor is the user's GitHub account (`wngstnr-code`). Commit with the configured git identity.
- **Do not add `Co-Authored-By` trailers or any AI attribution** to commits or PRs.
- Split work into small, focused commits. One logical change per commit.
- Commit messages read like a human wrote them: short imperative subject (under about 60 characters), lowercase after the first word is fine, no prefixes like `feat:` unless the user asks, and an optional body that explains why.

## DevEx log discipline

The Developer Experience Report is 25% of the score and must be written by a human. Whenever we hit friction (a confusing doc, an unclear error, an RPC limit, an API surprise), append a dated factual entry to `docs/DEVEX_LOG.md`: what we tried, what happened, the exact error, and how long it cost. Facts only, so the user can write the final report from it.

## Useful commands

- Foundry is installed (`cast`, `forge`, `anvil` at `~/.foundry/bin`).
- Archive RPC: load it with `set -a; . ./.env; set +a` and use `$BSC_ARCHIVE_RPC`.
  - **Never pass the URL as a CLI argument and never echo it.** zsh does not word-split variables, and `cast` prints the full URL in errors. Export it as `ETH_RPC_URL` (cast reads it automatically) and pipe output through `sed -E 's#https://[^ "]+#<rpc>#g'`.
- Run tests with `cd contracts && set -a; . ../.env; set +a; forge test`. The fork tests read `BSC_ARCHIVE_RPC` and pin blocks, so cached runs take about a second.
  - Always pin `--fork-block-number` so Foundry's RPC cache is reused.
  - The first Venus `getAccountLiquidity` on a cold fork takes about 50 s (many storage reads); later calls are instant.
  - Pass `--rpc-timeout 300` to `cast` when hitting a cold fork.
  - NodeReal `eth_getLogs` rejects ranges of 50,000 blocks; 5,000 works.
- `https://bsc-rpc.publicnode.com` works for latest-state `eth_call` but rejects archive and wide `eth_getLogs` requests.
- `https://bsc.drpc.org` (free) now rejects every `eth_getLogs` range (checked 2026-10-06).
- The public NodeReal endpoint from the BNB Chain docs (`https://bsc-mainnet.nodereal.io/v1/64a9df0874fb4a93b9d0a3849de012d3`) allows browser CORS and `eth_getLogs` up to 49,999 blocks with full history. The frontend uses it for event scans.
- Verified bStock token sources are on Sourcify (chain 56), not on BscScan.
- `https://data-api.binance.vision/api/v3/klines` serves bStock candles (TSLABUSDT, NVDABUSDT, SPCXBUSDT) with CORS enabled.
- Binance domains (`binance.com`, `developers.binance.com`) are ISP-blocked from the user's network.
