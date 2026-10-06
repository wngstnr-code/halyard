# Halyard: product concept

Borrow more against your tokenized stocks, safely: market-hours-aware de-risking for bStock-backed loans on Venus, BNB Chain mainnet.

## One-liner

People who borrow against bStocks (TSLAB, NVDAB, SPCXB) keep huge safety buffers because nothing protects them when the US market reopens with a gap. Halyard lets them use more of their borrowing power. Halyard de-risks their position automatically before the weekend close and whenever health gets close to the edge, in one atomic transaction, for a fraction of what a liquidation costs.

## The problem: idle borrowing power

Venus listed bStocks as collateral on June 20, 2026 (collateral factor 60% for TSLAB and NVDAB, 50% for SPCXB). Measured on-chain on Oct 6, 2026 (see `docs/RESEARCH.md` section 4):

- 59 accounts borrow against bStocks today.
- 21 of them hold mostly bStocks as collateral: about $517k of stock against $205k of debt.
- Users are very conservative:
  - the riskiest stock-heavy account would only be liquidated by a 23% drop;
  - the median account needs a drop of about 42%;
  - a fully borrowed position (at the collateral factor) is liquidated by a 14.3% drop.

Why they hold back:
- The US market is open about 32 of 168 hours a week. The oracle keeps updating hourly on weekends, but the real repricing happens at the open. On Oct 2 and Oct 5 the TSLAB oracle moved +4.1% and +2.7% within the first update after the open.
- A liquidation costs a 10% incentive on the repaid amount.
- Nobody watches their health factor at 13:30 UTC on a Monday.

The result is capital sitting idle because the risk cannot be managed, not because users do not want liquidity.

## The solution

1. **See the real headroom.** The app reads the Venus position from chain and shows how much more the user could borrow at each health target. It also shows what historical Monday gaps would have done to that position.
2. **Set a Halyard policy once.** Minimum health, target health, a weekend target, max slippage, which bStocks may be sold.
3. **Borrow more, directly on Venus.** The user signs the borrow from their own wallet. Halyard never borrows.
4. **Halyard de-risks automatically.**
   - **Pre-close trigger**: in the last hour before the US market closes for a weekend or holiday, bring health up to the weekend target.
   - **Health trigger**: whenever health drops below the minimum, bring it back to the target.

   Either way it happens in one transaction:
   1. a free flash loan of USDT from Lista
   2. repay part of the debt on behalf of the user
   3. redeem a slice of bStock collateral
   4. sell it on PancakeSwap v3
   5. repay the flash loan
5. **Revoke any time** with one transaction.

Users can also manage everything in plain language through a Binance Agentic Wallet Skill: "protect my NVDAB loan, keep health above 1.3 over weekends".

## Worked example (capital efficiency)

$10,000 of TSLAB. Today the user borrows $3,000 USDT (health 2.33) and is scared to go further.

With Halyard, the user borrows $5,000 (health 1.40):
- **During the week** the stock can drop 28% before liquidation.
- **Friday, one hour before the close**, if health is under the 1.6 weekend target, Halyard sells about $1,110 of TSLAB and repays debt (solving (7000 - 0.7x) / (5000 - x) = 1.6). Health is 1.6 before the Monday open, which survives a 37% gap.
- **Cost of that de-risk:**

  | Item | Amount |
  |---|---|
  | Pool fee, 0.25% | ~$2.80 |
  | Slippage | ~$1 |
  | Protocol fee, 0.3% | ~$3.35 |
  | Keeper tip, 0.1% | ~$1.10 |
  | **Total** | **about $8** |

- **Without protection**, the same $5,000 position hit by a 30% gap is liquidated: 10% of half the debt, so $250 lost.
- **The user gains $2,000 of extra liquidity during the week**, and keeps about $890 of it over the weekend, at the cost of an occasional ~$8 rebalance.

## Why this fits the hackathon

- **bStocks are central.** Every protected position is bStock collateral, and every de-risk sells bStocks.
- **BSC mainnet, spot only.** Lending plus spot swaps, no perps anywhere.
- **Primary special prize target: Best Use of Agentic Wallet / Wallet Skills.** The Skill drives Halyard through `baw contract-call`.
- **BNB Agent Studio is not a target.** Its mainnet deployment needs our own AWS or Azure runtime, which breaks the no-backend rule. See `docs/DECISIONS.md`.
- **Unique among public submissions.** Nobody else works on the lending side. They focus on routers, price comparators, gap scanners and baskets.

## Fit with our project rules

| Rule | How we meet it |
|---|---|
| No mock data | Positions, prices and health come from chain. Historical gaps come from real Binance candles. |
| No mock features | Every action is a real mainnet transaction. |
| No backend | Static frontend, an immutable contract and permissionless keepers. The keeper can be any third party, the user's own browser tab, the user's AI agent through the Wallet Skill, or our open-source keeper script. Nothing depends on a server we operate. |
| Real problem | Measured idle borrowing power on live Venus accounts, plus a real liquidation cost. |
| Not mainstream | Lending-side protection with on-chain market hours awareness. |

## Business model

| Layer | Mechanism |
|---|---|
| B2C | 0.3% of the de-risked notional, charged only when Halyard acts. DeFi Saver charges a similar automation fee on Aave. |
| Keeper tip | 0.1% of the sold notional for whoever executes `protect`. This keeps the system alive without our own infrastructure. |
| B2B (protocols) | More borrowing against bStocks means more interest revenue for Venus, with lower weekend bad-debt risk. That supports grants, fee subsidies or a native integration. |
| B2B2C (wallets) | A "Protect" module inside Binance Wallet or Trust Wallet with revenue share. |
| Expansion | Lista and other lenders, Ondo and xStocks collateral as they get listed, and other RWA collateral with market hours. |

## Honest market sizing

The market is small today: about $640k of bStock collateral on Venus, plus some on Lista. Caps keep rising (NVDAB went from 450 to 1,500 and is almost full).

The pitch is the infrastructure that lets stock-collateral lending scale, not a large current TAM. If Halyard moves stock-heavy accounts from a median ~42% buffer to ~30%, borrowing on today's collateral alone grows by a meaningful share, and that grows with every cap increase.

## Prior art

DeFi Saver and Instadapp offer automated repay for Aave and Compound. None of them are market-hours aware, support Venus bStock markets, or handle the weekend gap problem specific to tokenized equities.
