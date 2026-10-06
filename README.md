# Halyard

Borrow more against your tokenized stocks on BNB Chain, safely.

People who borrow against bStocks (TSLAB, NVDAB, SPCXB) on Venus keep huge safety buffers, because nothing protects them when the US market reopens with a gap and a liquidation costs 10%. Halyard lets them use more of their borrowing power.

Set a policy once. Before the market closes for the weekend, or whenever health gets low, the position is de-risked in one atomic transaction:
1. a free flash loan repays part of the debt;
2. a slice of bStock collateral is redeemed and sold on PancakeSwap;
3. the flash loan is paid back.

The cost is a few dollars instead of a liquidation.

- Immutable contracts, no admin keys, never borrows on behalf of a user
- No backend: static frontend and permissionless keepers
- A Wallet Skill so users can manage protection in plain language

Built for [BNB Hack: Tokenized Stocks Edition](https://www.bnbchain.org/en/hackathons/tokenized-stocks).

## Status

- **HalyardVault on BSC mainnet:** [`0x6137aCd41F9828dE0836EA5a776e95184bF7Df10`](https://bscscan.com/address/0x6137aCd41F9828dE0836EA5a776e95184bF7Df10#code) (source verified).
- **In progress:** frontend and Wallet Skill.

See:
- [docs/HACKATHON.md](docs/HACKATHON.md) for the hackathon rules
- [docs/IDEA.md](docs/IDEA.md) for the product
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the technical design
- [docs/RESEARCH.md](docs/RESEARCH.md) for the verified data behind it
- [docs/DECISIONS.md](docs/DECISIONS.md) for settled design decisions
- [contracts/README.md](contracts/README.md) to test and deploy the contracts
