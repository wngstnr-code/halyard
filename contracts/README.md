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

The deployer key lives in Foundry's encrypted keystore (`halyard-deployer`), never in a file. The repo root `.env` only holds public addresses (`DEPLOYER_ADDRESS`, `FEE_RECIPIENT`); see `.env.example`.

1. Create the keystore once. Run it in a normal terminal, because it prompts for a password:

   ```sh
   cast wallet new ~/.foundry/keystores halyard-deployer
   ```

2. Fund the printed address with a little BNB on BNB Smart Chain.

3. Dry run against live mainnet state:

   ```sh
   set -a; . ../.env; set +a
   forge script script/Deploy.s.sol --rpc-url bsc --sender $DEPLOYER_ADDRESS
   ```

4. Broadcast and verify on Sourcify. This prompts for the keystore password:

   ```sh
   forge script script/Deploy.s.sol --rpc-url bsc --account halyard-deployer \
     --sender $DEPLOYER_ADDRESS --broadcast --verify --verifier sourcify
   ```

A broadcast writes the deployed address to `deployments/56.json`, which the frontend reads.

Estimated cost on Oct 6 2026: about 3.65M gas, roughly 0.00018 BNB at 0.05 gwei.
