# halyard

A Wallet Skill in the [Binance Skills Hub](https://github.com/binance/binance-skills-hub) format. It lets an AI agent with the Binance Agentic Wallet read a Venus position backed by bStocks (TSLAB, NVDAB, SPCXB) and manage Halyard protection on BNB Smart Chain:

- show health, debt, borrow limit and how much more USDT fits at a chosen health level;
- turn protection on (Venus delegation plus a policy), check whether a protection run is due, run it, and turn it off.

Every transaction goes through `baw contract-call preview` and `execute`, with the user's confirmation in between.

## Layout

```text
halyard/
├── SKILL.md              routing table and rules for the agent
├── README.md
├── references/
│   ├── workflows.md      step-by-step flows and error table
│   ├── policy.md         policy fields, limits, costs, contract addresses
│   └── script.md         CLI reference for scripts/halyard.mjs
└── scripts/
    └── halyard.mjs       read-only RPC client and calldata builder
```

## scripts/halyard.mjs

- **What it does:** reads HalyardVault and Venus state through public BNB Smart Chain JSON-RPC endpoints, and encodes calldata for `updateDelegate`, `setPolicy`, `clearPolicy` and `protect`. It also runs `eth_call` simulations and decodes Halyard's custom errors.
- **What it does not do:** sign, hold keys or broadcast. The `baw` CLI does that.
- **Dependencies:** Node.js 22 or newer. No npm packages.
- **Run:** `node scripts/halyard.mjs position <address>`. See [references/script.md](references/script.md) for every command.
- **Binance Web3 API (optional):** the `rwa` command signs requests with `BINANCE_WEB3_API_KEY` and `BINANCE_WEB3_SECRET_KEY` (from https://web3.binance.com/en/dev-portal). The secret stays in the local environment.
- **Network:** `https://bsc-rpc.publicnode.com`, falling back to the public NodeReal endpoint listed in the BNB Chain docs. Override with `HALYARD_RPC_URL`.

## Requirements

- The `binance-agentic-wallet` skill and the `baw` CLI, signed in.
- Developer Mode enabled in the Binance App (needed for `contract-call`).

## Install

Copy this folder into your agent's skills directory next to `binance-agentic-wallet`.

## Notes

- HalyardVault (`0x6137aCd41F9828dE0836EA5a776e95184bF7Df10`) is immutable, has no admin keys and is source-verified on Sourcify and BscScan. It has not been audited.
- This skill does not borrow and does not give investment advice.

## License

MIT
