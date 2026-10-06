# CLAUDE.md

Guidance for Claude Code sessions working in this repository.

## Project

**Gap Guardian** (working name): market-hours-aware liquidation protection for loans backed by tokenized stocks (bStocks) on Venus and Lista, BNB Smart Chain mainnet. Built for BNB Hack: Tokenized Stocks Edition. **Submission deadline: Oct 11 2026, 12:00 UTC.**

Read these before doing anything:
- `docs/HACKATHON.md`: rules, judging criteria, deadlines, provided stack
- `docs/IDEA.md`: product concept, problem, business model
- `docs/ARCHITECTURE.md`: contracts, keeper layer, frontend, testing plan
- `docs/RESEARCH.md`: verified on-chain facts, competitor scan, open questions
- `docs/DEVEX_LOG.md`: running log of developer experience friction (feeds the DevEx report)

## Hard constraints

- **No mock data, no mock features.** Every number shown in the UI comes from chain or a real API. Every action is a real transaction. No placeholder values, no fake demo mode.
- **No backend.** Static frontend, smart contracts, permissionless keepers, and an agent on BNB Agent Studio. Do not add servers, databases or API routes.
- **BSC mainnet only, spot only.** No perps anywhere, including as a price reference.
- bStocks must stay central to the product.
- The GuardianVault must never contain a code path that borrows on behalf of a user.

## Writing conventions

- All documents, code comments, commit messages and UI copy are in **English**.
- **Never use the em dash or en dash characters.** Use commas, periods, colons, parentheses or a plain hyphen instead. Check with `grep -rn $'—\|–' .` before committing.
- Chat with the user in **Indonesian**.

## Git conventions

- The only contributor is the user's GitHub account (`wngstnr-code`). Commit with the configured git identity.
- **Do not add `Co-Authored-By` trailers or any AI attribution** to commits or PRs.
- Split work into small, focused commits. One logical change per commit.
- Commit messages read like a human wrote them: short imperative subject (under about 60 characters), lowercase after the first word is fine, no prefixes like `feat:` unless the user asks, and an optional body that explains why.

## DevEx log discipline

The Developer Experience Report is 25% of the score and must be written by a human. Whenever we hit friction (a confusing doc, an unclear error, an RPC limit, an API surprise), append a dated factual entry to `docs/DEVEX_LOG.md`: what we tried, what happened, the exact error, and how long it cost. Facts only, so the user can write the final report from it.

## Useful commands

- Foundry is installed (`cast` at `~/.foundry/bin`).
- `https://bsc-rpc.publicnode.com` works for latest-state `eth_call` but rejects archive and wide `eth_getLogs` requests.
- `https://bsc.drpc.org` (free) allows `eth_getLogs` up to 10,000 blocks per call and rate limits aggressively.
- Verified bStock token sources are on Sourcify (chain 56), not on BscScan.
