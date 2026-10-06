# Gap Guardian: product concept

Working name. Liquidation protection for loans backed by tokenized stocks on BNB Chain, aware of US market hours.

## One-liner

Borrowers who post bStocks (TSLAB, NVDAB, SPCXB) as collateral on Venus or Lista get their position de-risked automatically, before the weekend or before the health factor gets close to liquidation, for a fraction of what a liquidation would cost them.

## The problem

- Venus listed bStocks as collateral in its Core Pool on June 20, 2026. Lista DAO also accepts bStocks.
- The underlying US market is open about 32 of the 168 hours in a week. On-chain tokens trade 24/7, but the real price discovery happens when NYSE/Nasdaq reopen, often with a gap.
- If the price gaps down, a borrower gets liquidated and pays a **10% liquidation incentive** on the repaid amount (Venus parameter for TSLAB/NVDAB/SPCXB).
- Venus itself treats this as a real risk: it set aside a USD 200,000 bStock liquidation buffer for weekends and thin liquidity, and uses an oracle protection trigger of 16.67%.
- Repaying manually on a weekend is slow, and most retail users are not watching their health factor on Sunday night.

## Worked example

Collateral: $10,000 of TSLAB. Debt: $6,500 USDT. Liquidation threshold: 70%.

TSLA gaps down 10% at the open. Collateral is now $9,000, the liquidation limit is $6,300, and the debt is $6,500, so the position can be liquidated.

| Scenario | User loss |
|---|---|
| No protection: liquidator repays 50% of the debt ($3,250) and seizes collateral with a 10% bonus | about $325 |
| Gap Guardian: sells about $1,500 of TSLAB earlier, at a 0.05% pool fee plus slippage, plus a 0.3% protocol fee | about $6 to $10 |

## How it works (user view)

1. Connect a wallet. The app reads the Venus/Lista position straight from chain and shows the health factor and distance to liquidation.
2. The Gap Simulator replays real historical Monday gaps for that stock and shows what each gap would cost with and without protection.
3. The user sets a policy:
   - minimum health factor
   - target health factor
   - weekend target
   - max slippage
   - which collateral may be sold
4. The user signs `comptroller.updateDelegate(guardian, true)` on Venus (or `setAuthorization` on Lista) plus `setPolicy`. No migration, the position stays where it is.
5. When a trigger fires, anyone (or our keeper agent) calls `protect(user)`. In one atomic transaction the contract:
   1. takes a USDT flash loan
   2. repays part of the debt on behalf of the user
   3. redeems collateral on behalf of the user
   4. swaps it on PancakeSwap v3
   5. repays the flash loan
6. The user can revoke the delegation with one click at any time.

The user can also manage everything through natural language with the Wallet Skill: "protect my NVDAB, never let health drop under 1.2 over the weekend".

## Triggers

- **Health trigger**: the health factor, computed from Venus `getAccountLiquidity` (which already uses the liquidation threshold), falls below the user's `minHF`.
- **Market clock trigger**: within a window before the US market closes for the weekend or a holiday, de-risk to `weekendTargetHF`. The NYSE calendar is computed on-chain (US DST rules plus a holiday table). This is what separates us from generic auto-repay tools.

## Why this fits the hackathon

- bStocks are central. Every protected position is a bStock position.
- BSC mainnet, spot only. Lending and spot swaps, no perps anywhere in the product or its price checks.
- Uses both special-prize tools: a BNB Agent Studio keeper agent and an Agentic Wallet Skill.
- Nobody else in the public submissions touches the lending side. Most entries are routers, price comparators, gap scanners and baskets (see `docs/RESEARCH.md`).

## Fit with our project rules

| Rule | How we meet it |
|---|---|
| No mock data | Every number comes from chain (Venus, the oracle, the PancakeSwap quoter) or from real historical candles. |
| No mock features | Every action is a real mainnet transaction. |
| No backend | Static frontend, immutable contracts, permissionless keeper calls. The keeper agent runs on BNB Agent Studio, not on our server. |
| Real problem | Liquidation penalties on stock collateral, a risk Venus itself acknowledges. |
| Not mainstream | Lending-side protection with on-chain market hours awareness. No other submission does it. |

## Business model

| Layer | Mechanism |
|---|---|
| B2C | 0.3% of the de-risked notional, charged only when the Guardian acts. Comparable to DeFi Saver automation fees on Aave (around 0.25%). |
| Keeper tip | 0.1% of the sold notional goes to whoever executed `protect`. This keeps the system alive without our own infrastructure. |
| B2B (protocols) | Fewer weekend liquidations means less bad debt risk for Venus and Lista. That supports grants, fee subsidies or a native integration in their UI. |
| B2B2C (wallets) | A "Protect" module inside Binance Wallet or Trust Wallet with revenue share. |
| Expansion | Ondo and xStocks collateral as lenders list them, tokenized-stock LP positions, other RWA collateral. |

## Honest market sizing

The market is small today: about $640k of bStock collateral in Venus (Oct 6, 2026) plus a few hundred thousand on Lista. Supply caps keep getting raised (NVDAB went from 450 to 1,500 and is near the cap). The pitch is "the safety layer that has to exist before stock-collateral lending can scale", not a large current TAM.

Verified on-chain: 59 Venus accounts borrow against bStocks today, and 21 of them hold mostly bStocks as collateral ($205k debt against $517k of stock). These users are conservative. None would be liquidated by a 20% gap, and the riskiest needs about a 23% drop. So the strongest message is **capital efficiency plus safety**: borrow closer to the limit and let the Guardian de-risk before the weekend. See `docs/RESEARCH.md` sections 4 and 7.

## Prior art

DeFi Saver and Instadapp offer automated repay for Aave and Compound. None of them are market-hours aware, none support Venus bStock markets, and none handle the weekend gap problem specific to tokenized equities.
