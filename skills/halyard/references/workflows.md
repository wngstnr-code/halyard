# Workflows

Every flow starts the same way:

1. Run the `binance-agentic-wallet` preflight (CLI version, `baw wallet status --json`).
2. Get the BSC address: `baw wallet address --json`, entry with `binanceChainId` `"56"`. Call it `<wallet>` below.
3. For any write, check `baw wallet settings --json` and confirm `devMode.enabled` is `true`.

All script commands run from the skill folder: `node scripts/halyard.mjs ...`.

---

## The contract-call loop

Every transaction in this skill uses the same loop. `calldata` prints `to`, `value` and `inputData`:

```bash
node scripts/halyard.mjs calldata <action> [...]
baw contract-call preview --binanceChainId 56 --from <wallet> --to <to> --value 0 --inputData <inputData> --json
```

1. Show the user the script's `summary` and the preview: `parsedTx`, `simulationResult.simulationCode` and `simulationErrorDetail`, every item in `risks.riskDetails` and `risks.addresses`, and `authorityChanges`.
2. Ask for an explicit yes.
3. `baw contract-call execute --requestId <requestId> --json`.
4. `BROADCASTED`: show `https://bscscan.com/tx/<txHash>`. `PENDING_CONFIRMATION`: the user must approve in the Binance App; wait for them.
5. Re-read state with the script before the next step, so the user sees the change on-chain.

If the preview is intercepted (no `requestId`) or the simulation fails, stop and relay the result. Run `simulate` (below) for a readable Halyard error.

---

## 1. Show the position

```bash
node scripts/halyard.mjs position <wallet>
```

Present:

- **Health** (`health`). "no debt" means nothing is borrowed.
- **Debt and borrow limit** (`debtUsd`, `borrowLimitUsd`, `vaiDebtUsd` if not zero).
- **Asset table** from `assets`: symbol, full vToken address, supplied (raw, plus `suppliedUiAmount` when present), borrowed, USD values, collateral factor, liquidation threshold.
- **Price room** (`bStockDropToLiquidationPct`): how far all bStock prices could fall together, at today's oracle prices, before health reaches 1.00. Only the three supported bStocks count.
- **Extra borrowing** (`extraBorrowUsdt`): more USDT the account could borrow and still keep health at 1.50, 1.40 or 1.30. It is capped by the Venus borrow limit. Say that borrowing more lowers health and makes a protection sale more likely.
- **Halyard status** (`halyard`): delegated or not, the policy (or none), and `plan.due`.
- **Market** (`market`): whether the US market is open and whether the pre-close window is active.

This skill does not borrow. If the user wants to borrow more, point them to Venus (`https://app.venus.io`).

Other Venus-listed bStocks (for example SKHYB) show up in `assets` with `isBStock: false`. HalyardVault cannot sell them; say so if the user holds one.

---

## 2. Turn protection on

Two transactions, in this order. Skip a step that is already done (`halyard.delegated` is true, or the current `halyard.policy` already matches what the user wants).

### Step A. Delegate

```bash
node scripts/halyard.mjs calldata delegate
```

This calls `updateDelegate(HalyardVault, true)` on the Venus Comptroller. Explain before the preview: a Venus delegation is broad (it would allow borrowing, repaying and redeeming for the account). HalyardVault only uses it to repay the user's USDT debt and redeem the bStocks named in their policy; its code contains no call to `borrow`, it has no admin keys and it cannot be upgraded. The user can revoke it any time (flow 4). The preview may list this as an authority change; that is expected.

### Step B. Set the policy

Agree on the numbers with the user first ([policy.md](policy.md)). Then:

```bash
node scripts/halyard.mjs calldata set-policy --min 1.25 --target 1.40 --weekend 1.60 --slippage 1 --days 90 --sell TSLAB,SPCXB
```

- `--sell` order matters: the vault tries the first bStock first.
- Only list bStocks the user actually supplies on Venus (check `position` first).
- The script checks every limit the contract checks and refuses invalid numbers before anything reaches the wallet. Relay its error and ask the user for a valid value.
- The output includes `policy` (the exact on-chain values, in basis points and Unix seconds). Show the `summary` line to the user.

After both steps, run `position <wallet>` again and confirm `delegated: true` and the policy.

---

## 3. Check and run protection

```bash
node scripts/halyard.mjs plan <wallet>
```

- `due: false`: nothing to do. Say why if it is clear: no policy, no delegation, policy expired, or health above the trigger (and outside the pre-close window, or above the weekend target).
- `due: true`: show `trigger` (`LowHealth` or `PreClose`), `healthNow`, `targetHealth`, the bStock to sell (`sell.symbol`, raw amount), `repayUsdt`, `minSwapOutUsdt`, `protocolFeeUsdt` and `keeperTipUsdt`.

To run it:

```bash
node scripts/halyard.mjs calldata protect <account>
```

Then the contract-call loop. Notes:

- `protect` is permissionless. The user can run it for their own account or for any account with a due plan. The caller receives the keeper tip in USDT and pays gas in BNB.
- Re-run `plan` right before the preview. Prices move; another keeper may have run it first. If the preview simulation fails with `NothingToProtect`, nothing is due anymore.

### Scheduling

This skill acts when asked. To check on a schedule, the agent host must provide it (for example a recurring task that runs flow 3). Without one, protection depends on other keepers: the open-source `keeper/` script in the Halyard repository, the Keeper page of the Halyard app, or any bot that watches `canProtect`.

---

## 4. Turn protection off

Two transactions, in this order:

```bash
node scripts/halyard.mjs calldata clear-policy
node scripts/halyard.mjs calldata revoke
```

Either one alone already stops protection: without a policy or without delegation, `canProtect` returns nothing due. Doing both leaves no permission behind. Confirm with `position <wallet>`: `policy: null` and `delegated: false`.

---

## Simulate

To get a readable reason for a failure, run the same transaction as an `eth_call`:

```bash
node scripts/halyard.mjs simulate --from <wallet> --to <to> --data <inputData>
```

Returns `{ ok: true }` or `{ ok: false, revert: "<ErrorName>(args)" }`.

## Errors

| Error | Meaning | What to tell the user |
|---|---|---|
| `NothingToProtect()` | `canProtect` returns no trigger right now | Nothing is due. Health is above the trigger, or the policy or delegation is missing. |
| `InvalidPolicy()` | A policy value is outside the limits, the expiry is in the past, or a market is not supported | Show the limits from [policy.md](policy.md) and ask for new values. |
| `NotDelegated()` | The account has not delegated to HalyardVault on Venus | Run flow 2, step A. |
| `VenusError(code)` | A Venus call returned a non-zero error code | Relay the code as is. |
| `InsufficientProceeds(received, needed)` | The swap returned less than the flash loan plus fees | The pool price moved. Try again later; the user may raise `--slippage` (max 3%). |
| `HealthNotImproved(before, after)` | Health would not rise after the sale | The transaction reverts and nothing changes. Relay it. |
| any other | Not a Halyard error | Relay the message exactly. |
