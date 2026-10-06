# Architecture

Status: design only, no code yet. Everything here is a plan and may change after the open questions in `docs/RESEARCH.md` are answered.

## Overview

```
[Static frontend: Vercel or IPFS] --reads--> BSC RPC (Venus Comptroller, ResilientOracle, PancakeSwap quoter)
        | user signs: updateDelegate + setPolicy
        v
[GuardianVault.sol] <-- protect(user) -- anyone / Keeper Agent (BNB Agent Studio, ERC-8004 identity)
        | flash loan USDT (Lista) -> repayBorrowBehalf -> redeemUnderlyingBehalf -> swap (PancakeSwap v3) -> repay flash loan
        v
   event Protected(user, sold, repaid, hfBefore, hfAfter, fee, keeper)

[Wallet Skill "guardian"] -- natural language -> builds policy txs, reads status, revokes
```

No backend. The only off-chain actors are the user's browser, permissionless keepers, and an agent hosted on BNB Agent Studio.

## Contracts

### GuardianVault (singleton, immutable)

Requirements:
- No proxy, no owner, no admin keys, no upgrade path.
- **No code path that calls `borrow` or `borrowBehalf`.** Venus delegation also grants borrowing rights, so this must be provable by reading the code.
- No arbitrary external calls. Router, flash loan source and Venus addresses are fixed at deploy time.
- Small enough to audit by eye (target under 300 lines for the core).

Storage per user:

```solidity
struct Policy {
    uint64  minHF;            // 1e4 precision, e.g. 11500 = 1.15
    uint64  targetHF;         // do not sell beyond this
    uint64  weekendTargetHF;  // target used by the market clock trigger
    uint16  maxSlippageBps;   // vs Venus oracle price
    uint16  keeperTipBps;     // capped by a global max
    uint40  expiry;
    address[] collateral;     // vTokens the guardian may redeem
    address debtVToken;       // e.g. vUSDT
}
```

Core functions:
- `setPolicy(Policy)`, `clearPolicy()`
- `protect(address user, address vCollateral, uint256 repayAmount)`, permissionless
- `canProtect(address user) view` returns the trigger reason and a suggested amount, used by keepers and the UI

`protect` flow, all in one transaction:
1. Check the trigger. Either health below `minHF`, or the market clock window is open and health is below `weekendTargetHF`.
2. Flash loan `repayAmount` USDT from Lista Moolah (free) or a PancakeSwap v3 flash.
3. `vDebt.repayBorrowBehalf(user, repayAmount)`.
4. `vCollateral.redeemUnderlyingBehalf(user, collateralAmount)`. The underlying is sent to the Guardian (msg.sender of the redeem).
5. Swap the collateral to USDT on PancakeSwap v3, with `minOut` taken from the Venus oracle price minus `maxSlippageBps`.
6. Repay the flash loan, take the protocol fee and the keeper tip, and use any leftover USDT to repay more of the user's debt.
7. Post-checks:
   - health after is at least health before
   - health after does not exceed `targetHF` by more than a small tolerance (no over-selling)
   - the user's total debt did not increase

Order matters. Venus `redeemAllowed` uses the collateral factor (stricter than the liquidation threshold), so a position close to liquidation cannot redeem first. It must repay first, which is why the flash loan is needed.

### MarketClock (library)

- Computes whether NYSE is open from `block.timestamp`.
- Handles US DST rules (second Sunday of March to first Sunday of November) and a hard-coded holiday table for 2026 and 2027, including early closes.
- Exposes `nextClose(ts)` and `isPreCloseWindow(ts, window)`.
- Fully on-chain and deterministic, so keepers cannot lie about market state.

### ListaAdapter (phase 2)

The same flow against Lista Moolah, using `setAuthorization` and Moolah's own `repay`, `withdrawCollateral` and `flashLoan`.

## Keeper layer

1. **Permissionless**: anyone can call `protect` and earn the tip. Same economics as liquidators, so the system survives without us.
2. **Keeper Agent on BNB Agent Studio**: watches `PolicySet` events, polls `canProtect`, calls `protect` and earns tips. It has an ERC-8004 identity and an ERC-8183 task interface, so other agents can ask it to protect a position. Target for the Agent Studio prize.
3. **Wallet Skill**: a Skill for Binance Agentic Wallet with these intents:
   - protect a position
   - show status
   - simulate a gap
   - revoke

   It builds the `updateDelegate` and `setPolicy` transactions. Target for the Agentic Wallet prize.

## Frontend

Static app, all reads straight from chain:
1. **Position scan**: Venus and Lista positions, health factor, distance to liquidation per collateral.
2. **Gap Simulator**: replays real historical weekend and overnight gaps (from bStock candles or Binance Market API K-lines) against the user's actual position.
3. **Guardian setup and history**: policy form, approve and revoke, and a list of `Protected` events linked to BscScan.

Optional data from the Binance Web3 RWA API (market status, corporate action codes) only if it is callable from the browser (CORS). On-chain data stays the source of truth.

## Testing plan

- Foundry fork tests against BSC mainnet state, using real Venus markets and real PancakeSwap pools.
- Invariant tests:
  - user debt never increases
  - no borrow is ever executed
  - health never decreases after `protect`
- MarketClock unit tests across DST switches and holidays.
- A live mainnet demo with a small real position.

## Key addresses (BSC mainnet)

| Item | Address |
|---|---|
| Venus Core Pool Comptroller | `0xfD36E2c2a6789Db23113685031d7F16329158384` |
| TSLAB / vTSLAB | `0x5b1910eAaD6450E50f816082Aa078C41F10C292f` / `0x97421799419Eb782628e73e7220d8E0A207469a3` |
| NVDAB / vNVDAB | `0x02Fca66C1D1aFB4E2A7884261eB00F63598a7436` / `0xEb8Ca841cBe1BC4832A10b15c7dAB1081eDaD371` |
| SPCXB / vSPCXB | `0xbe9D156892E55e7154BcD3cB0FEA677F9D3103E1` / `0xC36dFaCc7a125859C106F29b9F2d874CCF29A55A` |
| bStock compliance contract | `0x53dBa7AaBDe774787A1F57236B235567dA8e14F4` |

Verify every address again before deploying.
