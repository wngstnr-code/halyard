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
