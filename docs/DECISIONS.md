# Decision log

Decisions that are settled. Do not reopen them without new evidence. Newest first within each date.

## 2026-10-06

### D1. Positioning: capital efficiency plus safety
- **Decision:** Lead with "borrow more against your bStocks, safely", not "stop getting liquidated".
- **Why:** On-chain, 59 Venus accounts borrow against bStocks, but none of the stock-heavy ones are close to liquidation. The riskiest needs a 23% drop and the median about 42%. The real loss is idle borrowing power. Chosen by the user.

### D2. Scope: Venus Core Pool, bStocks only
- **Decision:** Halyard only sells bStock collateral (vTSLAB, vNVDAB, vSPCXB). Health counts every asset and debt in the account. Lista lending positions are out of scope for the MVP.
- **Why:** bStocks must stay central for the hackathon. Venus holds most bStock collateral and has the delegation primitives we verified.

### D3. Flash loan source: Lista Moolah
- **Decision:** Use `Moolah.flashLoan` (`0x8F73b65B4caAf64FBA2aF91cC5D4a2A1318E5D8C`).
- **Why:** Free and permissionless. Venus flash loans require a governance allowlist. PancakeSwap flash costs the pool fee.

### D4. Swap venue: PancakeSwap v3, fee 2500 pools, direct exactInputSingle
- **Decision:** Swap through SwapRouter `0x1b81D678ffb9C0263b24A97847620C99d213eB14`, pairing bStock with USDT, with `minOut` taken from the Venus oracle minus `maxSlippageBps`. The default slippage is at least 1%.
- **Why:** The deepest bStock/USDT pools all use the 2500 tier. Measured execution is about 0.5% under the oracle.

### D5. No Agent Studio, no hosted keeper
- **Decision:** Do not target the Best Use of BNB Agent Studio prize. Keepers are permissionless:
  - any bot, earning the tip;
  - the frontend keeper tab;
  - the Wallet Skill;
  - an optional open-source script.
- **Why:**
  - Agent Studio on mainnet requires our own AWS or Azure runtime, which is a backend, and it has no scheduler.
  - Gelato automation is end of life.
  - Chainlink Automation v2.1 is sunset, and CRE needs Early Access approval.
- **Revisit if:** Chainlink CRE Early Access is granted. A CRE cron workflow calling `protect` would be a clean upgrade, but it is not required.

### D6. Special prize target: Agentic Wallet / Wallet Skills
- **Decision:** Ship a `halyard` skill in the Binance Skills Hub format that drives Halyard through `baw contract-call`.
- **Why:** It runs in the user's own agent, needs no backend, and directly uses the sponsor's stack.

### D7. Halyard computes everything; callers pass only the user
- **Decision:** `protect(user)` decides the trigger, the collateral and the amount on-chain.
- **Why:** This removes any ability for a permissionless caller to pick harmful parameters (amount griefing, sandwich setups beyond the slippage cap).

### D8. Market clock: on-chain NYSE calendar for 2026 and 2027, pre-close window of 60 minutes
- **Decision:** Hard-code the verified NYSE holidays and early closes. Compute DST on-chain. Weekend-only fallback after 2027.
- **Why:** The oracle updates hourly 24/7 and the repricing happens at the open, so de-risking within the last hour before a multi-day close is the right moment. Data in `docs/RESEARCH.md` section 9.

### D9. Raw token units everywhere
- **Decision:** Contracts work in raw units. The UI shows the UI amount next to the raw amount when they differ.
- **Why:** bStocks are EIP-8056 tokens and NVDAB already has a non-1 `uiMultiplier`. Venus, the oracle and the DEX all use raw units.

### D10. Frontend data: chain plus data-api.binance.vision only
- **Decision:** No dependency on `www.binance.com/bapi` from the browser.
- **Why:** Binance domains are ISP-blocked from Indonesia and CORS is unverified. The public kline mirror works with CORS `*`.

### D11. Fork testing with an archive RPC
- **Decision:** Use a NodeReal MegaNode free key (stored in `.env` as `BSC_ARCHIVE_RPC`, never committed) for Foundry fork tests. Verified working on Oct 6.
- **Why:** Free public RPCs keep only about 7 minutes of historical state, which breaks fork tests.

### D12. Product name: Halyard
- **Decision:** The product is called **Halyard**. Contract `HalyardVault`, Wallet Skill `halyard`.
- **Why:** A halyard is the line that raises a sail. The metaphor is more speed with control, which matches the capital efficiency positioning. No crypto project uses the name, while Keel and Ballast are already taken. Chosen by the user over Prebell, Headroom and Afterbell.

### D13. Health targets have a 1.3 floor
- **Decision:** `targetHealthBps` and `weekendHealthBps` must be at least 13,000.
- **Why:** Venus `redeemAllowed` checks the collateral factor, not the liquidation threshold. For SPCXB (CF 50%, LT 65%), an LT-based health below 1.3 means the final state is still short on CF, and the redeem would be rejected. 1.3 covers all three bStock markets.

### D14. Only USDT debt is repaid in the MVP
- **Decision:** Halyard repays vUSDT debt only. Users whose debt is in another asset see no protection plan.
- **Why:** One flash loan asset and one swap leg keep the contract small and auditable. USDT is the deepest stablecoin on Venus and in the bStock pools.

### D15. Frontend: one static Next.js app, no template monorepo
- **Decision:** Rebuild the frontend as a single Next.js app with `output: 'export'`, keeping only the UI pieces we use. All Balancer template code, packages and its `/api` routes are removed.
- **Why:** The rules forbid a backend, and the template's API routes and multi-chain packages could not ship as a static site. A static export can be hosted anywhere and makes it obvious that no server is involved.

### D16. Event scans through the public NodeReal endpoint
- **Decision:** The browser reads `eth_getLogs` from the public NodeReal endpoint listed in the BNB Chain docs, in 49,999-block chunks starting at the vault deploy block. The keeper script uses the same default.
- **Why:** publicnode rejects historical log queries and drpc rejects every range (checked Oct 6). The NodeReal endpoint allows browser CORS and full history up to 49,999 blocks per call, without a key of ours.

### D17. Wallet connection falls back to injected wallets
- **Decision:** RainbowKit's full wallet list is used only when `NEXT_PUBLIC_WALLET_CONNECT_ID` is set. Otherwise the app uses wagmi's `injected()` connector.
- **Why:** RainbowKit throws without a WalletConnect project id, which crashed the app. EIP-6963 still discovers every installed browser wallet, so the app stays usable from a fresh clone.

### D18. SKHYB and later bStock listings are not supported
- **Decision:** HalyardVault supports TSLAB, NVDAB and SPCXB only. Other Venus-listed bStocks (SKHYB today) are shown in the position but cannot be in a policy.
- **Why:** The vault is immutable with no admin, so its market list is fixed at deployment. Adding a market means deploying a new vault, which we defer until after the hackathon.

### D19. Binance Web3 API only in local tools, never in the frontend
- **Decision:** The Wallet Skill (`rwa` command) and the keeper call the Binance Web3 API with the user's own key pair. The static frontend does not.
- **Why:** Every Web3 API request is signed with HMAC-SHA256 using a secret key. A static site would have to ship that secret to every visitor, and the rules forbid a backend that could hold it. Local tools keep the secret on the user's machine.
