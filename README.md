# Gap Guardian

Market-hours-aware liquidation protection for loans backed by tokenized stocks on BNB Chain.

People who borrow against bStocks (TSLAB, NVDAB, SPCXB) on Venus or Lista can get liquidated when the US market reopens with a gap, and they pay a 10% liquidation penalty when that happens. Gap Guardian lets them set a policy once. Before the weekend, or before their health factor gets close to the edge, the position is de-risked in one atomic transaction: a flash loan repays part of the debt, a slice of collateral is redeemed and sold on PancakeSwap, and the flash loan is paid back. The cost is a fraction of a liquidation.

- Immutable contracts, no admin keys, never borrows on behalf of a user
- No backend: static frontend, permissionless keepers, a keeper agent on BNB Agent Studio
- A Wallet Skill so users can manage protection in plain language

Built for [BNB Hack: Tokenized Stocks Edition](https://www.bnbchain.org/en/hackathons/tokenized-stocks).

## Status

Design phase. See:
- [docs/HACKATHON.md](docs/HACKATHON.md) for the hackathon rules
- [docs/IDEA.md](docs/IDEA.md) for the product
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the technical design
- [docs/RESEARCH.md](docs/RESEARCH.md) for the verified data behind it
