# Halyard contracts

- `src/HalyardVault.sol`: the protection contract. It is immutable, has no owner, and never borrows.
- `src/MarketClock.sol`: NYSE session math (US Eastern time with DST, 2026 and 2027 holidays, early closes).
- `src/interfaces/External.sol`: minimal Venus, Moolah and PancakeSwap v3 interfaces.
- `script/Deploy.s.sol`: BSC mainnet deployment with post-deploy wiring checks.

## Setup

Put an archive RPC in the repo root `.env` (never committed):

```
BSC_ARCHIVE_RPC=https://bsc-mainnet.nodereal.io/v1/<key>
```

Load it before running anything:

```sh
set -a; . ../.env; set +a
```

`foundry.toml` exposes it as the `bsc` RPC alias, so commands never need the URL on the command line.

## Test

```sh
forge test
```

- Unit tests cover `MarketClock`.
- Fork tests run against pinned BSC mainnet blocks: real Venus markets, a real borrower, and the real Friday Oct 2 2026 pre-close session.
- The first run needs about a minute to warm Foundry's RPC cache. Later runs take seconds.

## Deploy

The deployer key lives in Foundry's encrypted keystore, not in a file.

1. Import the key once. Run this yourself; it prompts for the private key and a password:

   ```sh
   cast wallet import halyard-deployer --interactive
   ```

2. Dry run against live mainnet state:

   ```sh
   FEE_RECIPIENT=0xYourAddress forge script script/Deploy.s.sol --rpc-url bsc --sender 0xYourAddress
   ```

3. Broadcast and verify on Sourcify:

   ```sh
   FEE_RECIPIENT=0xYourAddress forge script script/Deploy.s.sol --rpc-url bsc \
     --account halyard-deployer --sender 0xYourAddress --broadcast --verify --verifier sourcify
   ```

A broadcast writes the deployed address to `deployments/56.json`, which the frontend reads.

Estimated cost on Oct 6 2026: about 3.65M gas, roughly 0.00018 BNB at 0.05 gwei.
