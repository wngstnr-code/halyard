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

## Current status (2026-10-07)

- Contracts done in `contracts/`: `HalyardVault`, `MarketClock`, interfaces, 21 tests (unit plus mainnet fork) passing.
- **Deployed:** HalyardVault `0x6137aCd41F9828dE0836EA5a776e95184bF7Df10` on BSC mainnet (block 126043949), verified exact match on Sourcify and BscScan. Address and start block are in `contracts/deployments/56.json`. It is immutable, so a contract change means a new deployment and a new address.
- **Frontend done** in `frontend/`: a single static Next.js app (`output: 'export'`, no API routes, no server). Pages: landing, `/dashboard`, `/protect`, `/simulator`, `/keeper`. Halyard logic lives in `frontend/src/lib/halyard/` (ABIs, MarketClock port, plan and gap simulation, event scans, wallet providers). Run with `pnpm --dir frontend dev`; `pnpm --dir frontend build` writes `frontend/out/`.
- **Deployed:** https://halyard-bnb.vercel.app (Vercel project `halyard`, static, built locally with `vercel build --prod` then `vercel deploy --prebuilt --prod`).
- Every frontend write (delegate, setPolicy, protect from the Keeper page, clearPolicy, revoke) passed end to end on an Anvil fork as a real borrower (see the fork section in `frontend/README.md`). Not yet run on mainnet itself; that needs the demo position below.
- **Wallet Skill** in `skills/halyard/` (SKILL.md, references, zero-dependency `scripts/halyard.mjs`). Reads and calldata verified against mainnet and `cast`. The `rwa` command (Binance Web3 API, RWA Data) verified live. The `baw contract-call` flow is untested: `baw` sign-in needs the Binance App, which the user does not have.
- **Keeper script** in `keeper/`. `npm run once` watch-only pass verified on mainnet, with the Binance Web3 API on (RWA status logging and Transaction API simulate verified live). Broadcast through the Transaction API with MEV protection is untested until a protection is due.
- **Binance Web3 API:** key pair in the root `.env` as `BINANCE_WEB3_API_KEY` and `BINANCE_WEB3_SECRET_KEY` (never commit or print them). Used only by the skill and the keeper, never the frontend (D19). `rwa/underlying-market` returns `marketStatus: null`; read `openState` and `reasonCode`.
- **Hackathon forms:** registration submitted 2026-10-07 with `wangsitsada1234@gmail.com`; use the same email on the submission and DevEx forms.
- **Demo video:** `brag-output/brag.mp4` (3:00, git-ignored), not uploaded yet.
- **DevEx report:** written by the user. Fact sheet in git-ignored `notes/devex-report-outline.md`, ordered by the 8 form pages.
- Still open on the user side: upload the video, write and send the DevEx report, fill the submission form (needs a BSC wallet address), check the site on a real phone.
- Optional: one live mainnet `protect` with a small demo position. The deployer keystore `halyard-deployer` (`0x18E3fe26452ca4320a6C5365D349598cd855EeD7`, also the fee recipient) is funded; a small bStock plus USDT Venus position is still needed. The user runs any funding or borrowing themselves.

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
- Binance domains (`binance.com`, `developers.binance.com`) are ISP-blocked from the user's network. The Web3 API gateway (`web3.binance.com/build`) was reachable from Node on 2026-10-07; its docs pages answer `curl` with an empty 202, so read them in a browser.
