# Research notes

Verified facts behind the Halyard design. Each item says how it was measured so it can be re-checked. Snapshot date: **Oct 6, 2026** (BSC block ~126,032,600).

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
- **The same delegation also allows `borrowBehalf`.** A delegate contract can borrow on behalf of the user, so Halyard must have no borrow code path.
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
- The pitch should therefore lead with **capital efficiency plus safety** ("borrow closer to the limit and let Halyard de-risk before the weekend"), not with "users are getting liquidated right now". This is an open product decision, see section 7.

## 5. Step 2 verification: can a new contract hold and move bStocks?

**Method:** read proxy slots with `cast`, then pulled verified sources from Sourcify (chain 56).

- TSLAB is a **beacon proxy**:
  - beacon `0x156d6dce9a4f6139a3406f1f021f1a4880de93a3`
  - implementation `0xCFEd6c4679297ea4889F8183bC057B4A86C64e46`, source `SecuritiesToken.sol`, verified on Sourcify, not on BscScan
- The token implements **EIP-8056 scaled UI amounts**: `uiMultiplier`, `balanceOfUI`, `pendingMultiplier`, `effectiveAt`. Current `uiMultiplier` is 1e18 with no pending change. Raw balances and UI balances can diverge after a corporate action, so Halyard must work in raw units and the UI must show both.
- `_update` checks pause state, then calls `compliance.checkIsCompliant` on `from`, `to`, and on `msg.sender` when it is a third party (transferFrom).
- Compliance contract `0x53dBa7AaBDe774787A1F57236B235567dA8e14F4` (`Compliance.sol`, verified on Sourcify):

  ```solidity
  if (blockedAddresses[token][user]) revert UserBlocked();
  if (sanctionAddressEpoch[user] == sanctionEpoch) revert UserSanctioned();
  ```

  This is a **deny list only**. There is no allow list or KYC whitelist. Calling it for a fresh random address returns without revert.
- **Conclusion: a new HalyardVault contract can receive, hold and swap bStocks**, unless the issuer explicitly blocklists it.
- Residual risks:
  - a token-wide pause by the `PauseManager` blocks every transfer, including Venus liquidations and Halyard swaps;
  - the issuer can blocklist Halyard, which needs graceful failure and a clear UI message.
- Confirmed: NVDAB and SPCXB use the same beacon, compliance contract and PauseManager (`0x9fc74Be63f3589485B2423984a7a0557e0CF700a`).
- NVDAB already has `uiMultiplier` = 1.000778223752807865 (a corporate action, most likely a dividend). TSLAB and SPCXB are at 1e18. The Venus oracle and the DEX both price **raw** units, so raw and UI balances already differ for NVDAB.

## 6. DEX liquidity (DexScreener API, Oct 6)

| Pair | Venue | Liquidity | 24h volume |
|---|---|---|---|
| NVDAB/USDT | PancakeSwap v3 | ~$4.58M | ~$8.84M |
| NVDAB/USDT | Uniswap | ~$0.97M | ~$2.86M |
| TSLAB/USDT | PancakeSwap v3 | ~$1.96M | ~$0.74M |
| SPCXB/WBNB | PancakeSwap v3 | ~$2.41M | ~$3.21M |
| SPCXB/USDT | PancakeSwap v3 | ~$1.90M | ~$0.85M |

Enough depth to sell the few thousand dollars of collateral a typical protection needs.

## 7. Questions raised on Oct 6 and how they were resolved

| # | Question | Answer | Evidence |
|---|---|---|---|
| 1 | Positioning | **Capital efficiency plus safety**, decided by the user | section 4, `docs/DECISIONS.md` |
| 2 | Cover non-bStock collateral? | No. Only bStock markets are sellable, though any debt is counted in health | `docs/DECISIONS.md` |
| 3 | Atlas oracle when the market is closed | Updates **every hour, 24/7, including weekends**; repricing happens at the US open | section 9 |
| 4 | Agent Studio on mainnet | Possible only on our own AWS or Azure, request-driven, no scheduler. **Not used.** | section 12 |
| 5 | Lista bStock positions | Out of scope for the MVP. Lista is used only as the flash loan source | `docs/DECISIONS.md` |
| 6 | Binance Web3 RWA API from the browser | Unreachable from this network (ISP block); CORS unknown. **Not used by the frontend.** | section 13 |

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

## 9. Atlas oracle behavior (TSLAB feed)

Venus ResilientOracle config for every bStock: main = `0x9E6928Ec418948ceb9f1cd9872fD312b13D841D0` (Venus `ChainlinkOracle`), pivot = `0x04480f1Ba2252CDF89deB022B58d0a03d1B4cF91`, fallback disabled.

The main oracle reads a feed per token with a `maxStalePeriod` of 3800 s:

| Token | Feed | Description |
|---|---|---|
| TSLAB | `0x63950C265e7CDB4016bA60C288c46291C0148ce2` | "SingleFeed TSLAB/USD", 18 decimals |
| NVDAB | `0x8a44cF4E55adD99EB8bAC5D5DB749C63106d54AA` | "SingleFeed NVDAB/USD" |

**Method:**
1. Took the last 300 transactions to the TSLAB feed from BscScan (`fulfillBasicOracleReport`).
2. Read the receipts and block timestamps over RPC.
3. Decoded the event data: the first 6 bytes are the timestamp, the last 10 bytes are the price with 18 decimals.
4. `latestRoundData` always returns roundId 1, so the feed keeps no on-chain history and receipts are the only record.

**Results** (Sep 23 to Oct 6, 2026):
- 300 updates with **no gap longer than 1 hour**, weekends included. Updates are hourly heartbeats; we saw no deviation-triggered updates.
- Weekend prices barely move: Sat Oct 3 to Sun Oct 4 stayed between $370.6 and $372.7.
- The repricing happens at the US open (13:30 UTC):

  | Window | Price move |
  |---|---|
  | Fri Oct 2, 12:34 to 15:08 UTC | $356.64 to $371.18 (+4.1%) |
  | Mon Oct 5, 12:08 to 15:04 UTC | $367.23 to $377.25 (+2.7%) |

**Implications:**
- Venus actions keep working on weekends (the price is never stale), so liquidations can happen any time.
- The real risk window is the first oracle update after the open, which is what the pre-close trigger addresses.
- Because the oracle can lag the DEX by up to an hour, swaps use oracle-based `minOut`, so a lagging oracle makes `protect` revert rather than sell badly.

## 10. Flash loan sources

- **Venus**: vUSDT has flash loans enabled ($42.8M cash), but `executeFlashLoan` requires `authorizedFlashLoan[msg.sender]`, a governance allowlist (`setWhiteListFlashLoanAccount`). **Not usable.**
- **Lista Moolah** `0x8F73b65B4caAf64FBA2aF91cC5D4a2A1318E5D8C`: `flashLoan(token, assets, data)` has no fee and no allowlist, only a per-token blacklist. USDT is accepted (a test call reverted only at the final `transferFrom`, as expected for an EOA). About 2.36M USDT available. **Chosen.**
- PancakeSwap v3 flash is a fallback but costs the pool fee.

## 11. Venus market action state

`actionPaused` for vTSLAB, vNVDAB and vSPCXB: only `BORROW` is paused (the stock itself cannot be borrowed). Mint, redeem, repay, seize, liquidate, transfer, enter and exit are all active.

## 12. Automation and agent options on BSC (Oct 2026)

| Option | Status | Source |
|---|---|---|
| Gelato Automate / Web3 Functions | End of life on Mar 31, 2026 | Mimic blog, Gelato docs |
| Chainlink Automation v2.1 | Registry `0xDc21E279934fF6721CaDfDD112DAfb3261f09A2C` still deployed (`KeeperRegistry 2.1.0`), sunset Jul 31, 2026, no logs in the last ~4,000 blocks | docs.chain.link, on-chain |
| Chainlink CRE | Supports BNB Chain mainnet (cron and log triggers), but workflow deployment needs **Early Access approval** | docs.chain.link/cre |
| BNB Agent Studio | BSC mainnet supported, but it deploys to **our own AWS Bedrock AgentCore or Azure AI Foundry**. The managed BNB option is a 48-hour testnet trial. Agents are request-driven (A2A, MCP, x402, ERC-8183) with no scheduler documented | docs.bnbchain.org/developer-kit/bnbchain-studio |
| Binance Agentic Wallet (`baw` CLI) | `contract-call preview/execute` on chain 56 with backend risk simulation. Needs Developer Mode enabled in the Binance App. Has `defi position` with health rates | binance/binance-skills-hub |

## 13. Data sources and network reachability (from Indonesia)

- `api.binance.com` and `www.binance.com`: no connection (curl exit 60 / 000).
- `developers.binance.com`: the TLS certificate is replaced by `xblock.gmedia.id`, which means an ISP block.
- `data-api.binance.vision` (public market data mirror) works, with `access-control-allow-origin: *`. Hourly klines for TSLABUSDT and NVDABUSDT start Jun 11, 2026, and SPCXBUSDT on Jun 12, 2026.
- `bsc-dataseed.bnbchain.org`, `bsc-rpc.publicnode.com`: fine for latest state. Historical state is kept for less than about 1,000 blocks (~7 minutes).
- NodeReal MegaNode free tier includes BSC archive data (10M CU per month), which is the plan for fork tests.

## 14. Swap execution check (PancakeSwap v3 QuoterV2)

| Sell | USDT out | Per unit | Oracle |
|---|---|---|---|
| 1 TSLAB | 379.47 | 379.47 | 381.37 |
| 10 TSLAB | 3,794.00 | 379.40 | 381.37 |

Execution is about 0.5% below the oracle at these sizes, mostly the 0.25% fee tier.

Current DEX vs oracle (DexScreener vs `getPrice`):

| Market | Deviation |
|---|---|
| TSLAB | -0.25% |
| NVDAB | -0.17% |
| SPCXB | -0.09% |
