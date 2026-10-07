# Policy, costs and contracts

## Policy fields

A policy is stored per account in HalyardVault. `setPolicy` replaces the previous one.

| Flag | Field | Meaning | Allowed |
|---|---|---|---|
| `--min` | `minHealthBps` | Low-health trigger. At any time, if health is below this, protection may run. | 1.01 to 3.00 |
| `--target` | `targetHealthBps` | Health to restore after a low-health trigger. | 1.30 to 3.00, above `--min` |
| `--weekend` | `weekendHealthBps` | In the 60 minutes before a US market close that is followed by a weekend or holiday, if health is below this, protection may run and restore it to this level. | 1.30 to 3.00 |
| `--slippage` | `maxSlippageBps` | Maximum swap loss against the Venus oracle price, in percent. | 0.5 to 3 |
| `--days` | `expiry` | Policy lifetime from now. After expiry nothing runs until a new policy is set. | 1 to 3650 days |
| `--sell` | `sellable` | Comma-separated bStocks the vault may sell, in order of preference. | 1 to 3 of TSLAB, NVDAB, SPCXB, no duplicates |

Defaults the Halyard app suggests, if the user asks for a starting point: `--min 1.25 --target 1.40 --weekend 1.60 --slippage 1 --days 90`, selling whichever supported bStocks the user supplies. Present them as a starting point, not a recommendation; the user picks.

How to explain the trade-off neutrally:

- A higher `--min` or `--weekend` sells earlier and more often, so the account pays more fees and gives up more upside, and is further from liquidation.
- A lower one sells less, and leaves less room before liquidation.
- Liquidation on Venus costs the borrower a 10% incentive on the seized collateral, and up to 50% of the debt can be closed in one liquidation.

## What a protection run costs

Charged on the USD value of the bStock sold:

| Item | Rate | Paid to |
|---|---|---|
| Protocol fee | 0.3% | Halyard fee recipient |
| Keeper tip | 0.1% | Whoever calls `protect` |
| Swap price impact | up to `--slippage` | PancakeSwap v3 pool (fee tier 0.25%) |

Every USDT left after the flash loan and these fees repays more of the user's debt. The vault keeps nothing. A run repays at least 10 USDT; smaller plans are skipped.

## What the vault can and cannot do

- A Venus delegation is broad: it would let the delegate borrow, repay and redeem for the account. HalyardVault only ever calls `repayBorrowBehalf` (USDT) and `redeemUnderlyingBehalf` for one of the vTokens in the account's policy. Its code contains no call to `borrow` or `borrowBehalf`.
- It has no owner and no admin keys. It is immutable, so this behavior cannot be changed later.
- After each run, health must be higher than before, or the whole transaction reverts.
- The source is verified on Sourcify and BscScan. It has not been audited.

## Supported bStocks

| Symbol | Token | Venus vToken |
|---|---|---|
| TSLAB | `0x5b1910eAaD6450E50f816082Aa078C41F10C292f` | `0x97421799419Eb782628e73e7220d8E0A207469a3` |
| NVDAB | `0x02Fca66C1D1aFB4E2A7884261eB00F63598a7436` | `0xEb8Ca841cBe1BC4832A10b15c7dAB1081eDaD371` |
| SPCXB | `0xbe9D156892E55e7154BcD3cB0FEA677F9D3103E1` | `0xC36dFaCc7a125859C106F29b9F2d874CCF29A55A` |

## Contracts

| Contract | Address |
|---|---|
| HalyardVault | `0x6137aCd41F9828dE0836EA5a776e95184bF7Df10` |
| Venus Comptroller (Core Pool) | `0xfD36E2c2a6789Db23113685031d7F16329158384` |
| Venus ResilientOracle | `0x6592b5DE802159F3E74B2486b091D11a8256ab8A` |
| USDT | `0x55d398326f99059fF775485246999027B3197955` |
