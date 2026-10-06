# Architecture

Status: **HalyardVault is live on BSC mainnet** at [`0x6137aCd41F9828dE0836EA5a776e95184bF7Df10`](https://bscscan.com/address/0x6137aCd41F9828dE0836EA5a776e95184bF7Df10#code).
- Deployed Oct 6, 2026 in block 126043949, tx `0x9dbc7423...8fe0`.
- Source verified as an exact match on Sourcify and BscScan.
- 21 tests pass, including the mainnet fork tests. Every external dependency below was verified on Oct 6, 2026 (evidence in `docs/RESEARCH.md`, rationale in `docs/DECISIONS.md`).

## Overview

```
[Static frontend: Vercel or IPFS]
   reads:  BSC RPC (Venus Comptroller, ResilientOracle, PancakeSwap QuoterV2)
           data-api.binance.vision klines (historical gaps, CORS *)
   writes (user wallet): comptroller.updateDelegate, halyard.setPolicy, vUSDT.borrow (user's own borrow)
   optional "keeper tab": polls canProtect and sends protect() from the connected wallet

[HalyardVault.sol]  <-- protect(user) from anyone: third-party bots, keeper tab, Wallet Skill, keeper script
   Lista Moolah flashLoan(USDT) -> vUSDT.repayBorrowBehalf(user) -> vBStock.redeemUnderlyingBehalf(user)
   -> PancakeSwap v3 exactInputSingle(bStock -> USDT) -> repay flash loan -> fees -> leftover repays more debt

[Wallet Skill "halyard"]  natural language -> baw contract-call preview/execute (BSC, chain 56)
[keeper/ script]                open-source Node script anyone can run; not required by the protocol
```

There is no server we operate. Every off-chain piece is optional and replaceable because `protect` is permissionless and validates everything on-chain.

## Verified external contracts (BSC mainnet)

| Item | Address | Notes |
|---|---|---|
| Venus Core Pool Comptroller (Diamond) | `0xfD36E2c2a6789Db23113685031d7F16329158384` | `updateDelegate`, `getAccountLiquidity` (LT-weighted) |
| Venus ResilientOracle | `0x6592b5DE802159F3E74B2486b091D11a8256ab8A` | `getPrice(asset)`, `getUnderlyingPrice(vToken)` |
| vUSDT | `0xfD5840Cd36d94D7229439859C0112a4185BC0255` | `repayBorrowBehalf` |
| USDT (BSC-USD, 18 decimals) | `0x55d398326f99059fF775485246999027B3197955` | |
| TSLAB / vTSLAB | `0x5b1910eAaD6450E50f816082Aa078C41F10C292f` / `0x97421799419Eb782628e73e7220d8E0A207469a3` | CF 60%, LT 70% |
| NVDAB / vNVDAB | `0x02Fca66C1D1aFB4E2A7884261eB00F63598a7436` / `0xEb8Ca841cBe1BC4832A10b15c7dAB1081eDaD371` | CF 60%, LT 70% |
| SPCXB / vSPCXB | `0xbe9D156892E55e7154BcD3cB0FEA677F9D3103E1` / `0xC36dFaCc7a125859C106F29b9F2d874CCF29A55A` | CF 50%, LT 65% |
| Lista Moolah (flash loan source) | `0x8F73b65B4caAf64FBA2aF91cC5D4a2A1318E5D8C` | `flashLoan(token, assets, data)`, no fee, ~2.36M USDT |
| PancakeSwap v3 factory | `0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865` | |
| TSLAB/USDT v3 pool, fee 2500 | `0xB0f5E5400E8F0F7C242F2b7740C004f020579c41` | ~$1.96M liquidity |
| NVDAB/USDT v3 pool, fee 2500 | `0x8FB4243b553aC29BA088aCf00B9B7dA24bD6690C` | ~$4.58M liquidity |
| SPCXB/USDT v3 pool, fee 2500 | `0x977DaFFC095b33872E2741c19568925015C35b4d` | ~$1.90M liquidity |
| bStock beacon / implementation | `0x156d6dce9a4f6139a3406f1f021f1a4880de93a3` / `0xCFEd6c4679297ea4889F8183bC057B4A86C64e46` | shared by all three |
| bStock compliance | `0x53dBa7AaBDe774787A1F57236B235567dA8e14F4` | deny list only |
| bStock PauseManager | `0x9fc74Be63f3589485B2423984a7a0557e0CF700a` | can halt all transfers |
| PancakeSwap v3 SwapRouter | `0x1b81D678ffb9C0263b24A97847620C99d213eB14` | `factory()` matches the factory above |
| PancakeSwap v3 QuoterV2 | `0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997` | used by the frontend for previews |

Quote check (Oct 6): selling 1 TSLAB returned 379.47 USDT and selling 10 TSLAB returned 3,794.00 USDT, against an oracle price of 381.37. Price impact is negligible at this size, but execution sits about 0.5% under the oracle (0.25% pool fee plus the pool trading slightly below the oracle). The default `maxSlippageBps` should therefore be at least 100 (1%).

## Contracts

### HalyardVault (singleton, immutable)

Requirements:
- No proxy, no owner, no admin keys, no upgrade path. Fee recipient and fee rates are constructor constants.
- **No code path that calls `borrow` or `borrowBehalf`.** Venus delegation also grants borrowing rights, so this must be provable by reading the code. Enforced by a test that scans the bytecode for the borrow selectors.
- No arbitrary external calls. Every target address is an immutable.
- Works in **raw token units** everywhere. bStocks implement EIP-8056 scaled UI amounts, and NVDAB already has a `uiMultiplier` of 1.000778. Venus, the oracle and the DEX all use raw units.
- Small enough to audit by eye (target under 300 lines for the core).

Per-user policy (validated in `setPolicy`):

| Field | Allowed range | Notes |
|---|---|---|
| `minHealthBps` | at least 1.01 | must be below the target |
| `targetHealthBps` | 1.3 to 3.0 | see D13 for the 1.3 floor |
| `weekendHealthBps` | 1.3 to 3.0 | |
| `maxSlippageBps` | 50 to 300 | |
| `sellable` | 1 to 3 | registered bStock vTokens, no duplicates |
| `expiry` | in the future | |


```solidity
struct Policy {
    uint16 minHealthBps;        // e.g. 12000 = 1.20, health trigger
    uint16 targetHealthBps;     // e.g. 14000 = 1.40, restore point for the health trigger
    uint16 weekendHealthBps;    // e.g. 16000 = 1.60, restore point before a market close
    uint16 maxSlippageBps;      // vs Venus oracle price, capped globally (e.g. 300)
    uint40 expiry;
    address[] sellable;         // vTokens (bStock markets only) Halyard may redeem, in priority order
}
```

Functions:
- `setPolicy(Policy)` and `clearPolicy()`.
- `canProtect(address user) view returns (Trigger reason, address vCollateral, uint256 repayAmount)`. Used by keepers and the UI.
- `protect(address user)`, permissionless. **The caller passes only the user.** The contract computes the trigger, which collateral to sell and how much, so a caller cannot choose harmful parameters.

Health is defined as LT-weighted collateral divided by debt. It is computed from `getAccountLiquidity` (which returns liquidity or shortfall), plus total debt valued with the same oracle.

`protect` flow, all in one transaction:
1. Check the trigger:
   - health is below `minHealthBps` (target `targetHealthBps`), or
   - `MarketClock.inPreCloseWindow(block.timestamp)` and health is below `weekendHealthBps`.
2. Compute the repay amount `x` that brings health to the target, using the closed form `(W - LT*x) / (D - x) = target`, and cap it by the collateral available in `sellable`.
3. `Moolah.flashLoan(USDT, x, data)`. Inside `onMoolahFlashLoan`:
   1. `vUSDT.repayBorrowBehalf(user, x)`.
   2. `vBStock.redeemUnderlyingBehalf(user, c)`, where `c` is the collateral worth `x` plus fees plus slippage at the oracle price. The underlying arrives at Halyard.
   3. Swap `c` bStock for USDT on the fee 2500 pool, with `amountOutMinimum` set to the oracle value minus `maxSlippageBps`.
   4. Approve Moolah to pull back `x`.
   5. Pay the protocol fee and the keeper tip. Any leftover USDT goes to `repayBorrowBehalf(user)`.
4. Post-checks:
   - health after is at least health before;
   - health after is at most target plus a tolerance (no over-selling);
   - the user's total borrow balance went down;
   - Halyard holds no leftover user funds.
5. Emit `Protected(user, reason, vCollateral, soldRaw, repaid, healthBefore, healthAfter, fee, tip, keeper)`.

Why this order: Venus `redeemAllowed` uses the collateral factor, which is stricter than the liquidation threshold, so a position near liquidation cannot redeem first. Venus's own flash loans are allowlisted by governance (`authorizedFlashLoan`), so we use Lista Moolah, which is permissionless and free.

Failure behavior:
- If the bStock is paused, or Halyard is blocklisted by the issuer's compliance contract, `protect` reverts with a clear custom error. `canProtect` surfaces it so the UI can explain it.
- If the DEX price is worse than the oracle by more than `maxSlippageBps`, the swap reverts. Around the market open the oracle can lag the DEX by up to one hour (hourly updates). In that window Venus liquidations use the same lagging oracle, so the user is not liquidated either, and the next oracle update re-arms the trigger.

### MarketClock (library)

- `isOpen(ts)`, `nextClose(ts)`, `inPreCloseWindow(ts)` (default window: 60 minutes before a close that is followed by at least one full closed day: weekends, holidays, and early closes before a holiday weekend).
- Regular session 09:30 to 16:00 ET. US DST runs from the second Sunday of March to the first Sunday of November.
- Hard-coded NYSE calendar, verified against nyse.com:
  - **2026 holidays**: Jan 1, Jan 19, Feb 16, Apr 3, May 25, Jun 19, Jul 3, Sep 7, Nov 26, Dec 25. **Early closes** (13:00 ET): Nov 27, Dec 24.
  - **2027 holidays**: Jan 1, Jan 18, Feb 15, Mar 26, May 31, Jun 18, Jul 5, Sep 6, Nov 25, Dec 24. **Early close**: Nov 26.
- After 2027 the clock falls back to weekends only (documented limitation, and the contract is immutable).

## Keeper layer (no backend)

1. **Permissionless `protect`** with a 0.1% tip. Any BSC bot can earn it, and execution is fully validated on-chain.
2. **Keeper tab in the frontend.** While open, it polls `canProtect` for users with active policies (discovered from `PolicySet` events) and sends `protect` from the connected wallet, earning the tip.
3. **Wallet Skill.** The user's own AI agent with the Binance Agentic Wallet can call `canProtect` and `protect` through `baw contract-call`. Scheduling depends on the agent host (for example a recurring task in the user's agent).
4. **`keeper/` script.** A small open-source Node script, documented so anyone (including the user) can run it on their own machine. It is not part of the protocol and not a service we host.

Rejected options (details in `docs/DECISIONS.md`):
- Gelato automation: shut down on Mar 31, 2026.
- Chainlink Automation: v2.1 sunset Jul 31, 2026, with no activity on the BSC registry. Its replacement CRE needs Early Access approval.
- BNB Agent Studio: mainnet means our own AWS or Azure runtime, and it is request-driven with no scheduler.

## Wallet Skill: `halyard`

Follows the Binance Skills Hub format (`SKILL.md` with `name`, `description`, `version`, `license` frontmatter plus `references/`). It depends on the `binance-agentic-wallet` skill and its `baw` CLI.

Intents:

| Intent | Calls |
|---|---|
| Show my bStock loans and headroom | Read-only RPC calls |
| Protect my position with policy X | `baw contract-call` for `updateDelegate(halyard, true)` and `setPolicy(...)` |
| Check if anything needs protection / run protection | `canProtect`, then `protect` |
| Stop protecting | `clearPolicy`, then `updateDelegate(halyard, false)` |

Constraints from the Agentic Wallet:
- External contract calls need Developer Mode, enabled in the Binance App.
- Every call goes through `preview` with a risk check, then `execute`. A brand-new contract might be flagged as risky, so Halyard must be source-verified.
- The skill must follow the hub's neutral language rules (no promotion of assets).

## Frontend

Static app (Next.js static export or Vite), all reads from chain:
1. **Position and headroom.** Venus positions via `getAssetsIn`, `getAccountSnapshot` and `getAccountLiquidity`. Health, liquidation drop, and extra borrow at health 1.3, 1.4 and 1.5.
2. **Gap Simulator.** Hourly candles from `data-api.binance.vision` (TSLABUSDT, NVDABUSDT, SPCXBUSDT, history since Jun 11, 2026, CORS `*`). It measures real pre-close to post-open moves and replays them against the user's position, with and without Halyard.
3. **Halyard setup and history.** Policy form, delegate and revoke, `Protected` events with BscScan links, and the keeper tab toggle.

The Binance Web3 RWA API (`www.binance.com/bapi/...`) is not used by the frontend. It is unreachable from Indonesian ISPs without a VPN and its CORS policy is unverified. It may be used inside the Wallet Skill.

## Testing plan

- Foundry fork tests against BSC mainnet. **This needs an archive RPC** (free public RPCs keep only about 7 minutes of state). Plan: a NodeReal MegaNode free key in `.env`, never committed.
- Invariants:
  - user debt never increases;
  - no borrow selector exists in the bytecode;
  - health never decreases after `protect`;
  - Halyard never holds a balance after a transaction.
- MarketClock unit tests across DST switches, every 2026 and 2027 holiday, and the early closes.
- Live mainnet run with a small real position before recording the demo.

## Implementation notes

- **Health.** Venus `getAccountLiquidity` gives LT-weighted collateral minus debt. Debt is summed from `borrowBalanceStored` over `getAssetsIn`, priced with the same ResilientOracle, plus `getVAIRepayAmount`. Per-asset LT comes from `getEffectiveLtvFactor(user, vToken, 1)`, so Venus per-user pools are respected.
- **Only USDT debt is repaid** in the MVP (D14). The repay amount is capped by the user's vUSDT borrow balance.
- **Haircut.** The repay amount solves `(W - l*k*x) / (D - x) = T`, where `k = 1 / (1 - (maxSlippage + fee + tip))`. Proceeds above what is needed repay more USDT debt, and anything beyond the debt goes back to the user.
- **Venus return codes.** `repayBorrowBehalf` and `redeemUnderlyingBehalf` return error codes instead of reverting. Every call is checked and turned into `VenusError(code)`.
- **Build.** The compiler needs `via_ir = true` (stack depth in `_plan`).
- **Fork test results** (Oct 6 state):

  | Test | Health | Sold | Repaid | Fee + tip |
  |---|---|---|---|---|
  | Low health | 1.2138 to 1.4051 | 1.594 TSLAB | 596.59 USDT | 2.43 USDT |
  | Pre-close on the real Fri Oct 2 19:30 UTC block | 1.5339 to 1.8060 | | | |
  | Real borrower `0xAA40...57E9` | 1.3912 to 1.6047 | 12.75 TSLAB | 4,772.28 USDT | 19.46 USDT |
