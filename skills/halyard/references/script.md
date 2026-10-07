# scripts/halyard.mjs

A self-contained Node.js (22 or newer) script with no dependencies. It reads BNB Smart Chain state over public JSON-RPC and builds calldata. It never signs or broadcasts.

```bash
node scripts/halyard.mjs <command> [args] [--flags]
```

Output: one JSON object, `{ "success": true, "data": ... }` or `{ "success": false, "error": "..." }`. Exit code 0 on success, 1 on invalid input, 2 on RPC failure.

RPC: `https://bsc-rpc.publicnode.com`, then the public NodeReal endpoint from the BNB Chain docs as a fallback. Set `HALYARD_RPC_URL` to use another endpoint.

## Read commands

| Command | Returns |
|---|---|
| `position <address>` | Venus position (health, weighted collateral, debt, borrow limit, per-asset rows), extra borrowing at health 1.50 / 1.40 / 1.30, bStock price drop to liquidation, Halyard delegation, policy, current plan, market state |
| `plan <address>` | `HalyardVault.canProtect`: `due`, `trigger`, `healthNow`, and when due the target, the bStock to sell, repay amount, minimum swap output, fee and tip |
| `market` | `HalyardVault.marketState`: `usMarketOpen`, `preCloseWindow` |
| `rwa` | Binance Web3 API (Market API, RWA Data) per bStock: `marketStatus`, `tradable`, `reasonCode`, `reasonMsg`, `tokenPriceUsd`, `referencePriceUsd`, `tokenToShareRatio`, `venusOracleUsd`, `onChainVsOraclePct`, `warning`. Needs `BINANCE_WEB3_API_KEY` and `BINANCE_WEB3_SECRET_KEY` |

Amounts are strings in token units (18 decimals unless the token says otherwise). USD fields have two decimals. Health is a string with four decimals, or `"no debt"`.

### `position` fields

| Field | Meaning |
|---|---|
| `health` | LT-weighted collateral / debt, from `HalyardVault.health` |
| `collateralWeightedUsd` | Collateral weighted by liquidation thresholds |
| `debtUsd` | All debt, including VAI |
| `borrowLimitUsd` | Collateral weighted by collateral factors (the Venus borrow limit) |
| `bStockDropToLiquidationPct` | Uniform drop in TSLAB, NVDAB and SPCXB prices that brings health to 1.00; `null` without debt or supported bStocks |
| `extraBorrowUsdt` | Additional USDT borrowable while keeping health at the given level, capped by the borrow limit |
| `assets[]` | `symbol`, `vToken`, `isBStock` (supported by Halyard), `supplied`, `borrowed`, `priceUsd`, `suppliedUsd`, `borrowedUsd`, `collateralFactor`, `liquidationThreshold`, and `suppliedUiAmount` when the bStock's EIP-8056 multiplier is not 1 |
| `halyard.delegated` | Whether the account approved HalyardVault as a Venus delegate |
| `halyard.policy` | `null`, or the policy with `expired` |
| `halyard.plan` | Same as the `plan` command |

## Write helpers

`calldata` returns `{ binanceChainId, to, value, inputData, summary }` for `baw contract-call preview`.

| Command | Target | Call |
|---|---|---|
| `calldata delegate` | Venus Comptroller | `updateDelegate(HalyardVault, true)` |
| `calldata revoke` | Venus Comptroller | `updateDelegate(HalyardVault, false)` |
| `calldata set-policy --min <h> --target <h> --weekend <h> --slippage <pct> --days <n> --sell <A,B>` | HalyardVault | `setPolicy(policy)`; also returns `policy` with the encoded values |
| `calldata clear-policy` | HalyardVault | `clearPolicy()` |
| `calldata protect <address>` | HalyardVault | `protect(address)` |

`set-policy` rejects values outside the contract's limits (see [policy.md](policy.md)) before building anything.

## simulate

```bash
node scripts/halyard.mjs simulate --from <address> --to <address> --data <hex>
```

Runs `eth_call` and returns `{ ok: true, returnData }` or `{ ok: false, revert }`, with HalyardVault custom errors decoded by name.

## Binance Web3 API

`rwa` calls three signed endpoints on `https://web3.binance.com/build` with the user's own key pair (HMAC-SHA256 over `timestamp + method + /build path with query + body`, headers `X-OC-APIKEY`, `X-OC-TIMESTAMP`, `X-OC-SIGN`):

- `GET /api/v1/dex/market/rwa/tokens?binanceChainId=56&platformId=bstock`: underlying ticker and `tokenToShareRatio`.
- `GET /api/v1/dex/market/rwa/price?binanceChainId=56&tokenContractAddresses=...`: on-chain price and reference price.
- `GET /api/v1/dex/market/rwa/underlying-market?binanceChainId=56&tokenContractAddress=...`: `statusInfo` (`openState`, `marketStatus`, `reasonCode`, `reasonMsg`).

`marketStatus` can be `null` (seen during US premarket hours); read `tradable` (`openState`) and `reasonCode` instead.

Errors come back as `Web3 API <code>: <msg>` with exit code 2, for example `40101 Invalid API Key`, `40102` (bad signature), `42900` (rate limit, 5 requests per second per endpoint).
