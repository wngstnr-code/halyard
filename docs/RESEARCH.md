# Research notes

Verified facts behind the Gap Guardian design. Each item says how it was measured so it can be re-checked. Snapshot date: **Oct 6, 2026** (BSC block ~126,032,600).

## 1. Ecosystem context

- BNB Chain is the largest chain for tokenized stocks: about $1.1B market cap, about 30% of a $3.7B market (Cointelegraph, Oct 2026).
- The three issuers that count for the hackathon:
  - **bStocks**: issued by BTech Holdings (Binance affiliate), ADGM FSRA approved, 1:1 backed, zero conversion fees.
  - **Ondo Global Markets**: 430+ assets. Total return trackers, so dividends are reinvested and one token may not equal one share.
  - **xStocks**: 50+ assets on BNB Chain, 1:1.
- Lending venues that accept bStocks as collateral:
  - **Venus** Core Pool (since June 20, 2026)
  - **Lista DAO** lending (Moolah)

## 2. Venus bStock markets (verified on-chain and via api.venus.io)

| Market | Underlying | vToken | CF | LT | Liq. incentive | Supply cap | In Venus (Oct 6) |
|---|---|---|---|---|---|---|---|
| TSLAB | `0x5b1910eAaD6450E50f816082Aa078C41F10C292f` | `0x97421799419Eb782628e73e7220d8E0A207469a3` | 60% | 70% | 10% | 236 | 121.0 (~$46k) |
| NVDAB | `0x02Fca66C1D1aFB4E2A7884261eB00F63598a7436` | `0xEb8Ca841cBe1BC4832A10b15c7dAB1081eDaD371` | 60% | 70% | 10% | 1,500 | 1,479.9 (~$357k) |
| SPCXB | `0xbe9D156892E55e7154BcD3cB0FEA677F9D3103E1` | `0xC36dFaCc7a125859C106F29b9F2d874CCF29A55A` | 50% | 65% | 10% | 2,000 | 1,375.7 (~$238k) |

- Total bStock collateral in Venus: **about $640k**. Total supply of the three tokens is about $152M, so less than 0.5% is used as collateral.
- Borrowing the stock tokens themselves is disabled (borrow cap 0). Users borrow stablecoins against them.
- NVDAB cap was raised from 450 to 1,500 and is now almost full.
- Oracle: Atlas Oracle feeds (TSLAB/USD, NVDAB/USD, SPCXB/USD) inside ResilientOracle. Comptroller oracle: `0x6592b5DE802159F3E74B2486b091D11a8256ab8A`.
- Dynamic Protection Mode (DeviationBoundedOracle) keeps a rolling 15-minute min/max window, but it only applies to the **borrow path**. Liquidations still use the plain ResilientOracle spot price.
- Venus keeps a USD 200,000 bStock liquidation buffer for weekends and thin liquidity.
- 1 vToken is roughly 1 underlying for these markets (vTSLAB total supply 120.997 with 8 decimals vs 121.0 TSLAB held).

Sources: [listing proposal](https://community.venus.io/t/bnb-chain-list-vtslab-vnvdab-and-vspcxb-markets-in-the-venus-core-pool/5832), [Dynamic Protection Mode](https://community.venus.io/t/oracle-dynamic-protection-mode/5779), `https://api.venus.io/markets/core-pool?chainId=56`.

## 3. Venus mechanics that shape the design (verified in source)

From `VenusProtocol/venus-protocol` (main branch):
- `MarketFacet.updateDelegate(delegate, approved)` sets `approvedDelegates[user][delegate]`.
- `VBep20.redeemBehalf` and `redeemUnderlyingBehalf` require `approvedDelegates(redeemer, msg.sender)`. **The underlying is sent to `msg.sender`**, which is the delegate.
- `repayBorrowBehalf` needs no approval.
- **The same delegation also allows `borrowBehalf`.** A delegate contract can borrow on behalf of the user, so the Guardian must have no borrow code path.
- `PolicyFacet.getAccountLiquidity(account)` uses **liquidation threshold** weights. `redeemAllowed` and `getHypotheticalAccountLiquidity` use **collateral factor** weights. A position close to liquidation cannot redeem before repaying, so the flow must repay first, funded by a flash loan.
- `treasuryPercent()` on the Core Pool Comptroller is `0`, so there is no redeem fee today.
- The Core Pool vToken has flash loan support (`TransferOutUnderlyingFlashLoan`).

Lista Moolah (`lista-dao/moolah`): `setAuthorization(authorized, bool)` and `isAuthorized` gate actions on behalf of a user, plus a `flashLoan(token, assets, data)` function.

## 4. Step 1 verification: do real users borrow against bStocks?

**Method:**
1. Collected current holders of vTSLAB, vNVDAB and vSPCXB from the BscScan holders pages: 40, 50 and 62 addresses, **110 unique**.
2. For each holder, read live state from `bsc-rpc.publicnode.com`:
   - `getAssetsIn`
   - `getAccountSnapshot` on every entered market
   - Venus oracle `getUnderlyingPrice`
   - `getAccountLiquidity`
3. Health factor here means LT-weighted collateral divided by debt (liquidation below 1.0).

**Results:**

| Metric | Value |
|---|---|
| Holders that entered at least one market | 81 of 110 |
| Accounts with bStock collateral **and** debt | **59** |
| Total debt of those 59 accounts (all collateral types) | ~$4.65M |
| bStock collateral inside those 59 accounts | ~$637k (almost all bStock collateral in Venus) |
| Accounts where bStocks are more than 50% of collateral | 21 |
| Debt of those 21 stock-heavy accounts | ~$205k against ~$517k of bStocks |
| Accounts currently in shortfall | 0 |
| HF under 1.2 / 1.3 / 1.5 | 4 / 6 / 21 |

**Stock drop needed to liquidate each stock-heavy account** (crypto collateral held constant): 22.7%, 24.1%, 27.1%, 27.1%, 32.4%, 33.6%, 35.7%, 36.9%, 37.1%, then 40% and above for the rest.

**What this means:**
- Demand is real: 59 live accounts borrow against bStocks today, with no tooling to protect them.
- **Today's positions are conservative.** No stock-heavy account would be liquidated by a 20% gap. The riskiest needs about a 23% drop. The four accounts under HF 1.2 are mostly crypto-collateralized, with less than 5% of collateral in bStocks.
- The protocol parameters push users there. With CF 60% and LT 70%, a fully borrowed position starts at HF 1.167 and is liquidated by a 14.3% drop. Users seem to leave a large buffer instead, which is idle borrowing capacity.
- The pitch should therefore lead with **capital efficiency plus safety** ("borrow closer to the limit and let the Guardian de-risk before the weekend"), not with "users are getting liquidated right now". This is an open product decision, see section 7.

## 5. Step 2 verification: can a new contract hold and move bStocks?

**Method:** read proxy slots with `cast`, then pulled verified sources from Sourcify (chain 56).

- TSLAB is a **beacon proxy**:
  - beacon `0x156d6dce9a4f6139a3406f1f021f1a4880de93a3`
  - implementation `0xCFEd6c4679297ea4889F8183bC057B4A86C64e46`, source `SecuritiesToken.sol`, verified on Sourcify, not on BscScan
- The token implements **EIP-8056 scaled UI amounts**: `uiMultiplier`, `balanceOfUI`, `pendingMultiplier`, `effectiveAt`. Current `uiMultiplier` is 1e18 with no pending change. Raw balances and UI balances can diverge after a corporate action, so the Guardian must work in raw units and the UI must show both.
- `_update` checks pause state, then calls `compliance.checkIsCompliant` on `from`, `to`, and on `msg.sender` when it is a third party (transferFrom).
- Compliance contract `0x53dBa7AaBDe774787A1F57236B235567dA8e14F4` (`Compliance.sol`, verified on Sourcify):

  ```solidity
  if (blockedAddresses[token][user]) revert UserBlocked();
  if (sanctionAddressEpoch[user] == sanctionEpoch) revert UserSanctioned();
  ```

  This is a **deny list only**. There is no allow list or KYC whitelist. Calling it for a fresh random address returns without revert.
- **Conclusion: a new GuardianVault contract can receive, hold and swap bStocks**, unless the issuer explicitly blocklists it.
- Residual risks:
  - a token-wide pause by the `PauseManager` blocks every transfer, including Venus liquidations and Guardian swaps;
  - the issuer can blocklist the Guardian, which needs graceful failure and a clear UI message.
- To do: confirm NVDAB and SPCXB use the same implementation and compliance contract.

## 6. DEX liquidity (DexScreener API, Oct 6)

| Pair | Venue | Liquidity | 24h volume |
|---|---|---|---|
| NVDAB/USDT | PancakeSwap v3 | ~$4.58M | ~$8.84M |
| NVDAB/USDT | Uniswap | ~$0.97M | ~$2.86M |
| TSLAB/USDT | PancakeSwap v3 | ~$1.96M | ~$0.74M |
| SPCXB/WBNB | PancakeSwap v3 | ~$2.41M | ~$3.21M |
| SPCXB/USDT | PancakeSwap v3 | ~$1.90M | ~$0.85M |

Enough depth to sell the few thousand dollars of collateral a typical protection needs.

## 7. Open questions

1. **Positioning**: lead with capital efficiency (borrow more safely) or with gap protection? Data in section 4 favors capital efficiency plus a weekend auto de-risk.
2. Should the Guardian also cover non-bStock collateral (the HF 1.04 account holds $281k debt on mostly crypto)? Wider market, but bStocks must stay central for the hackathon.
3. How does the Atlas oracle behave while the US market is closed: frozen, or tracking 24/7 DEX trading?
4. Can a BNB Agent Studio agent run on mainnet during the hackathon? The runtime credits mention testnet, but submissions must be mainnet.
5. Are Lista bStock positions structured the same way, and how many exist?
6. Is the Binance Web3 RWA API callable from a browser (CORS), or only from an agent or skill?

## 8. Competitor scan (public repos for this hackathon)

Most entries cluster in a few spaces:

| Space | Projects |
|---|---|
| Cross-issuer price comparison and best-execution routing | OneTicker, Orchard, Tally, Parity, yostocks |
| Weekend gap scanners and desks | Sunday Desk, Executable Gap Desk, afterclose, Bystok |
| Baskets and ETFs | League of Stocks, ETF |
| Agent accountability | Covenant (on-chain decision ledger) |

Nobody works on the lending side or on liquidation protection.

Useful findings from other teams:
- OneTicker reports an undocumented `40304` compliance error from the Binance Web3 API in some regions.
- OneTicker also found that Binance `referencePrice` is circular (token price divided by share ratio).
