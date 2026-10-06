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
