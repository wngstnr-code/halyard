# Developer experience log

Raw, dated notes for the Developer Experience Report. Facts only: what we tried, what happened, exact errors, time lost. The final report must be written by a human from these notes.

## 2026-10-06

- **Venus API has no account endpoints.** `api.venus.io/markets/core-pool?chainId=56` gives market data, including bStock markets. Guessed account or supplier routes return `Cannot GET`. To find who uses bStock collateral, we had to combine BscScan holder pages with direct RPC calls.
- **Public RPC limits for historical logs:**
  - `bsc-rpc.publicnode.com`: `Archive requests require a personal token` for any `eth_getLogs` older than recent blocks.
  - `bsc.drpc.org` (free): `ranges over 10000 blocks are not supported on free plan`, then `You reached Public endpoint rate limit` after a few hundred calls.
  - `bsc.blockrazor.xyz`: `log query range must not exceed 25 blocks`.
  - `bsc.meowrpc.com`: `eth_getLogs` not supported.
  - `rpc.ankr.com/bsc` and nodies: require an API key or a paid plan.
  - With BSC at about 0.45 s per block, scanning the roughly 22M blocks since the bStock listing is not practical on free endpoints.
- **bStock source code is not on BscScan.** TSLAB is a beacon proxy (`0x156d6dce...93a3` beacon, `0xCFEd6c46...4e46` implementation). The implementation and the compliance contract are verified on Sourcify (chain 56), so BscScan shows no source. We found this by reading the EIP-1967 beacon slot with `cast storage`.
- **bStocks use EIP-8056 scaled UI amounts** (`uiMultiplier`, `balanceOfUI`). This is not mentioned in the bStocks launch blog. Integrators must decide whether to use raw or UI balances.
- **Venus delegation is documented only in code comments.** `updateDelegate` also enables `borrowBehalf`. A protocol that only needs to redeem and repay on behalf of a user still gets borrowing rights, with no way to scope them.
- Time spent today on verification: roughly 2 hours, most of it spent working around RPC log limits.

## 2026-10-06 (afternoon)

- **Binance domains blocked by the ISP in Indonesia.**
  - `developers.binance.com` serves a TLS certificate for `xblock.gmedia.id`.
  - `api.binance.com` and `www.binance.com` do not connect at all.
  - We could not open the Agentic Wallet docs or test the RWA API without a VPN.
  - `data-api.binance.vision` works and has CORS `*`, which saved the Gap Simulator.
- **Atlas oracle feeds keep no history.** `latestRoundData` always returns roundId 1, so the only way to study weekend behavior was to scrape the update transactions from BscScan and decode the event data by hand. The packing is 6 bytes of timestamp and 10 bytes of price, and it is not documented anywhere we found. Took about 40 minutes.
- **Venus flash loans are allowlisted** (`authorizedFlashLoan`). The VToken has `isFlashLoanEnabled() == true` on vUSDT, which suggests they are open, but the Comptroller rejects non-whitelisted callers. We only found out by reading `FlashLoanFacet.sol`.
- **The bStock token has a dividend multiplier nobody mentions.** NVDAB `uiMultiplier` is 1.000778. The bStocks launch posts talk about dividends but not about EIP-8056 raw vs UI balances.
- **Automation on BSC is a moving target in 2026.**
  - Gelato automation ended on Mar 31.
  - Chainlink Automation v2.1 was sunset on Jul 31.
  - CRE needs Early Access.
  - Agent Studio mainnet needs AWS or Azure.
  - There is no turnkey way to run a scheduled job against BSC without operating something yourself.
- **Agent Studio docs**: the quickstart is clear (`bag` CLI, `sellerCore.ts`), but the mainnet path is hard to find. Only the deployment page says the managed BNB option is a 48-hour testnet trial.
- **Free archive state is scarce.** Public RPCs serve historical state for about 1,000 blocks. Anvil forks start failing with `failed to get storage` within minutes.
- **DexScreener rate limits** returned empty bodies (not JSON errors) when called three times in a row. Spacing calls by 4 seconds fixed it.

## 2026-10-06 (evening)

- **NodeReal onboarding took about 5 minutes** (GitHub login, Create Now, BSC RPC endpoint). It was the first RPC that let us fork BSC reliably.
- A cold Anvil fork needs about 52 s for one Venus `getAccountLiquidity` call, because the Diamond Comptroller loops over every market and each storage slot is a separate archive request. The default `cast` timeout of 45 s fails on it with `operation timed out`. `--rpc-timeout 300` fixes it.

## 2026-10-06 (contracts)

- **Venus per-user pools.** The Core Pool Comptroller now has `userPoolId` and `getEffectiveLtvFactor(account, vToken, weighting)`. Reading `markets(vToken).liquidationThresholdMantissa` alone would be wrong for users in a non-zero pool. This is only discoverable from `ComptrollerLens.sol`.
- **Venus still returns error codes.** `repayBorrowBehalf` and `redeemUnderlyingBehalf` return a uint error code instead of reverting on some failures. Integrators who forget to check the return value can silently continue after a failed repay.
- **PancakeSwap v3 router variants.** The BSC SwapRouter at `0x1b81...eB14` uses the `exactInputSingle` struct with a `deadline` field (selector `0x414bf389`), not the SwapRouter02 layout. We confirmed it by grepping the deployed bytecode for both selectors.
- **The first fork test run took 54 s** against NodeReal. Later runs were about 1 s thanks to Foundry's RPC cache with pinned blocks.
- `deal()` from forge-std worked on bStocks despite the EIP-8056 beacon proxy layout, which made it easy to open test positions.

## 2026-10-06 (deployment)

- **Deploy cost** was 2,807,407 gas at 0.05 gwei = 0.00014037 BNB. BSC gas is effectively free at this scale.
- **Verifying through Sourcify was enough for BscScan.** `forge script --verify --verifier sourcify` returned `exact_match` within about 10 seconds, and BscScan showed "Source Code Verified (Exact Match)" with the full standard JSON input. No Etherscan API key was needed, which matters because the Etherscan V2 free tier's chain coverage for BSC was unclear.
- **`cast wallet import --interactive` from Claude Code's `!` prefix fails** with `Device not configured (os error 6)` because there is no TTY. Pasting a key into the hidden prompt in macOS Terminal gave `invalid string length`. Creating a fresh keystore with `cast wallet new ~/.foundry/keystores halyard-deployer` was simpler and avoided handling a raw key at all.
- **`forge script` records `block.number` of the simulation**, not the inclusion block (126043865 vs 126043949). We store it as `fromBlock`, a lower bound for event scans.

## 2026-10-06 (frontend: reading BSC from the browser)

- **Event history is the hard part of a no-backend dApp on BSC.** We tested `eth_getLogs` on the HalyardVault from block 126043949, from a browser origin:
  - `bsc-rpc.publicnode.com`: works for about the last hour only, older ranges fail with `Archive requests require a personal token`.
  - `bsc.drpc.org`: every range failed with `ranges over 10000 blocks are not supported on free plan`, even a 1,000 block range. Earlier the same endpoint accepted 10,000 blocks.
  - `bsc-dataseed.bnbchain.org`: `limit exceeded` for 5,000 blocks.
  - `1rpc.io/bnb`: `eth_getLogs is limited to 0 - 50 blocks range`.
  - `56.rpc.thirdweb.com`: maximum 1,000 blocks.
  - `bsc.blockrazor.xyz`: maximum 25 blocks.
  - `rpc.ankr.com/bsc` and `bsc-pokt.nodies.app`: need an API key or a paid plan.
  - The public NodeReal endpoint listed in the BNB Chain docs (`bsc-mainnet.nodereal.io/v1/64a9…12d3`) worked: CORS enabled, 49,999 blocks per call, full history. It is the only free option we found.
  - Cost: about 30 minutes of probing.
- **The open-source DeFi frontend we started from had no BSC support.** Its chains, RPCs and providers were keyed to its own GraphQL chain enum and `/api/rpc` proxy routes. We added a separate BSC-only wagmi and RainbowKit stack instead of patching it.
- **The browser automation tool blocks URLs with a wallet address in the query string**, so read-only views had to be tested through the page's own input field.
- **Venus lists more tokenized stocks than the three Halyard supports.** A live account held `SKHYB` as collateral next to TSLAB and SPCXB. HalyardVault is immutable, so supporting new bStocks means a new deployment.

## 2026-10-06 (frontend: static export)

- **Trimmed the template down to what Halyard uses.** Tracing imports from the five Halyard routes found 130 reachable files out of the template's monorepo, and several of those were only pulled in through one config object. After cutting those links, about 80 source files remain in a single Next.js app (`frontend/src`), down from a turbo monorepo with an SDK, a GraphQL client, Sentry and API routes.
- **`output: 'export'` worked once server-only pieces were gone.** The only build error was a server component (`not-found.tsx`) passing `next/link` into a Chakra client component: `Functions cannot be passed directly to Client Components`. Marking the page `'use client'` fixed it.
- **RainbowKit refuses to start without a WalletConnect project id**: `Error: No projectId found. Every dApp must now provide a WalletConnect Cloud projectId`. The page rendered "This page couldn't load" with no other hint. Falling back to wagmi's plain `injected()` connector when no id is set keeps every installed browser wallet working through EIP-6963 discovery.
- **Next.js picked up a stray `package-lock.json` from the home folder** as the workspace root. Setting `turbopack.root` in `next.config.ts` fixed the warning.
- The static build is about 8.5 MB in `frontend/out` and serves from any static file server.

### 2026-10-07: Skills Hub frontmatter format is documented three different ways
- Tried: writing the `halyard` Wallet Skill in the Binance Skills Hub format (cloned `binance/binance-skills-hub` with `gh`, since GitHub is reachable but `developers.binance.com` is not).
- Found: the repo `README.md` example uses `title:` plus `metadata.version` and `metadata.author`; `CONTRIBUTING.md` requires top-level `name`, `description`, `version`, `license`; the official `binance-agentic-wallet` skill uses `name` with `metadata.version` and no `license`. We used `name`, `description`, `version`, `license` at the top level (CONTRIBUTING) plus `metadata` (as the official skill does).
- Also: CONTRIBUTING says a skill with `scripts/` must explain them in a skill `README.md`, but the example tree names the main file `skill.md` while every existing skill uses `SKILL.md`.
- `contract-call` docs are clear about the preview then execute flow and the `--value` unit (wei). Nothing explains how a skill should encode calldata, so we wrote a zero-dependency encoder and checked its output byte for byte against `cast calldata`.
- Cost: about 20 minutes of reading before writing.

### 2026-10-07: End-to-end test on an Anvil fork
- Tried: running every write (delegate, setPolicy, protect, clearPolicy, revoke) from the frontend against `anvil --fork-url` with `--auto-impersonate`, as a real Venus borrower.
- Venus oracle on a fork: about 3 minutes after the fork started, `ResilientOracle.getUnderlyingPrice` reverted with `invalid resilient oracle price` for vBNB, vBTC and vETH, while bStock and USDT prices still worked. The error does not say which check failed (staleness). Any account holding those markets can no longer be read. Fixed by restarting the fork and calling `anvil_setBlockTimestampInterval 1` so block time only moves one second per block. Cost about 20 minutes.
- wagmi's EIP-6963 discovery (`multiInjectedProviderDiscovery`, on by default) reconnected a real browser wallet even though the config listed only the mock connector. On a fork that would have signed on mainnet. Disabled it in fork mode.
- RainbowKit's modal does not list connectors that are not RainbowKit wallets (the wagmi `mock` connector), so the test account is auto-connected with `defaultConnected: true` instead.
- BSC USDT reverts `transfer` to the zero address (`BEP20: transfer to the zero address`). Our keeper's watch-only mode simulated `protect` without a sender, so the keeper tip went to `address(0)` and every simulation reverted with an empty reason in viem's message. Fixed by simulating from a placeholder address.
- `next dev` (Next.js 16.3) wrote `AGENTS.md` and `CLAUDE.md` into the app folder on first start. Disabled with `agentRules: false` in `next.config.ts`.
- Result on the fork, demo borrower: health 1.4302 to 1.6035, 10.3519 TSLAB sold, 3,864.63 USDT repaid plus about 39 USDT of leftover proceeds, 11.76 USDT fee, 3.92 USDT tip, vault balance zero after the call.
