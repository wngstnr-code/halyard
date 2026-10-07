# BNB Hack: Tokenized Stocks Edition

Official page: https://www.bnbchain.org/en/hackathons/tokenized-stocks
Announcement: https://www.bnbchain.org/en/blog/bnb-hack-tokenized-stocks-edition-with-binance-web3-wallet

Organized by BNB Chain together with Binance Web3 Wallet. Online, solo builders and teams welcome, one entry per team.

## Timeline (UTC)

| Milestone | Date |
|---|---|
| Registration opens, building starts | Wed, Sep 16 2026, 12:00 |
| Submissions lock | **Sun, Oct 11 2026, 12:00** |
| Screening | Oct 12 to Oct 14 |
| Judging | Oct 12 to Oct 23 |
| Winners announced | Week of Oct 26 |

## Prizes ($20,000 total)

| Place | Amount |
|---|---|
| 1st | $6,000 |
| 2nd | $4,000 |
| 3rd | $3,000 |
| 4th | $2,000 |
| 5th | $1,000 |
| Best Use of Agentic Wallet / Wallet Skills | $2,000 |
| Best Use of BNB Agent Studio | $2,000 |

A project can win a main placement and a special prize at the same time.

Extras: winner spotlights on X and bnbchain.org, Kickstart Package eligibility, elevated API rate limits during the event, mentors for finalists.

## Track

One track: **Tokenized Stocks Products & Agents**. Build something people would actually use with tokenized stocks on BSC: an autonomous agent, trading interface, portfolio tool, dashboard, Telegram bot, MCP server or SDK.

## Hard rules

- At least one of **bStocks, Ondo or xStocks** must be central to the submission.
- **BSC mainnet only.**
- **Spot only. Perps are out.**
- Cross-asset products are allowed (tokenized equities paired with crypto or stablecoins).
- Repository, demo and deployed link must stay accessible through judging.
- Not open to residents or citizens of: US, Canada, Netherlands, UK, Japan, Iran, Cuba, North Korea, Crimea, Donetsk People's Republic, Luhansk People's Republic.

## Judging criteria

| Criterion | Weight | What judges look for |
|---|---|---|
| Technical implementation | 30% | Functionality, integration depth, error handling |
| Creativity and originality | 25% | Unexpected API usage, uniqueness |
| Developer Experience Report | 25% | Specific, actionable, honest, no fluff |
| Product quality and UX | 20% | Usability for the target user |

## Submission requirements

1. **Working project**: public repository plus a deployed link or instructions a judge can follow.
2. **Demo video**: 4 minutes or less (optional but strongly recommended).
3. **Developer Experience Report**: uses the official template and is worth about 25% of the score. It must cover:
   - time from opening the docs to the first successful API call
   - where we got stuck, with exact doc pages
   - clarity of error messages and edge cases
   - observed asset behavior (liquidity, slippage, market hours)
   - practical differences between bStocks, Ondo and xStocks
   - an AI stack section
   - capabilities we wish existed

   AI-assisted code is fine. **AI-generated reports are rejected.** The report has to be written by a human from real notes, which is why we keep `docs/DEVEX_LOG.md` up to date while building.

## Forms and links

- Registration (raises Binance Web3 API rate limits, not the submission): https://docs.google.com/forms/d/e/1FAIpQLScV9gD2wo4LBOI5IXqAX6P-Q3UeSwlChvAM3rHAAPtu6vISOA/viewform. Needs a Binance UID or the email of the Binance account that created a Web3 API key at https://web3.binance.com/en/dev-portal.
- Project submission: https://docs.google.com/forms/d/e/1FAIpQLSdMtogkNnWzkI6xUifE78Ks4TohOM1YuWMuNgV-UPLVnpHD4Q/viewform
- Use the **same contact email** on the registration, the project submission and the Developer Experience Report; that is how the organizers match them.
- Builder Telegram group: https://t.me/+MhiOLT0YUnlmNWFk
- Restricted jurisdictions: https://web3.binance.com/en/dev-docs/web3-api-prohibited-regions (US and territories, Canada, Netherlands, Iran, Cuba, North Korea, Crimea, Donetsk, Luhansk, UK, Japan conditionally). Indonesia is not listed (checked 2026-10-07).

## Provided stack

Binance Web3 API modules:
- RWA Data API (tokenized stock metadata, market status, corporate action codes, attestation reports)
- Market API (prices, candlesticks, analytics)
- Trading API (cross-DEX quotes, swaps, MEV protection)
- Transaction API (simulation, broadcasting)
- Wallet API (balances, positions)
- DeFi API (protocol info, TVL, APY, calldata)
- b402 Payments (pay-per-call for agents)

Agent tooling:
- Binance Agentic Wallet and Wallet Skills (AI execution layer, Skills Hub)
- BNB Agent Studio (one-prompt agent deployment, ERC-8004 identity, ERC-8183 task interface, x402 self-funding)

## Ideas suggested by the organizers

LLM strategy agents, market-hours arbitrage, cross-issuer arbitrage, auto-DCA and rebalancing, earnings-calendar agents, card-to-stock onboarding without seed phrases, thematic baskets, and MCP servers or SDK wrappers for the Binance Web3 API. Many public submissions already cover these, see `docs/RESEARCH.md`.

## Support

Builder Telegram group, BNB Chain Discord, workshops (TBA), mentors from BNB Chain and Binance Web3 Wallet.
