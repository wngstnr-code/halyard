# Halyard keeper

A small script that finds every account with an active Halyard protection policy on BNB Smart Chain and calls `protect(user)` on the HalyardVault whenever `canProtect(user)` says it is due. The caller earns the 0.1% keeper tip, paid in USDT.

## Why it exists

`protect` is permissionless: anyone can call it for any user, and the vault re-validates everything on-chain. Halyard has no backend, so someone has to trigger it. This script is one optional way to run it on your own machine. The Keeper page of the Halyard frontend is another. It is not a hosted service.

## Requirements

- Node.js 22.9 or newer (for `--env-file-if-exists`)
- Optional: a fresh hot wallet with a little BNB for gas (needed only to send transactions)

## Setup

```sh
npm install
cp .env.example .env
```

Edit `.env` if you want to change anything. All values are optional.

## Running

Watch-only (no key set): reports what is due and never sends.

```sh
npm run once    # single pass, then exit
npm start       # loop forever
```

Live: set `KEEPER_PRIVATE_KEY` in `.env`, then run the same commands. Set `DRY_RUN=1` to simulate everything without sending, even with a key.

## Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `KEEPER_PRIVATE_KEY` | unset | Hot wallet key. Without it the keeper is watch-only. |
| `BSC_RPC_URL` | `https://bsc-rpc.publicnode.com` | RPC for reads and sending transactions. |
| `BSC_LOGS_RPC_URL` | public NodeReal endpoint | RPC for `eth_getLogs`. Must allow ranges of 49,999 blocks and serve history. |
| `POLL_SECONDS` | `60` | Seconds between passes (minimum 5). |
| `MIN_TIP_USDT` | `0` | Skip plans whose tip is below this amount. |
| `DRY_RUN` | `0` | `1` simulates only and never sends. |
| `BINANCE_WEB3_API_KEY` | unset | Optional Binance Web3 API key. Both keys are needed to enable the API. |
| `BINANCE_WEB3_SECRET_KEY` | unset | Optional Binance Web3 API secret, used only to sign requests locally. |
| `BINANCE_BROADCAST` | `1` | With the keys set, live sends use the Web3 API broadcast (MEV protected). `0` uses the RPC. |

## Binance Web3 API (optional)

Get keys at https://web3.binance.com/en/dev-portal and set `BINANCE_WEB3_API_KEY` and `BINANCE_WEB3_SECRET_KEY`. Without both, the keeper makes no Web3 API calls and behaves as described above. With them it adds three things:

- **bStock market status:** each pass calls `rwa/underlying-market` for TSLAB, NVDAB and SPCXB and logs one `rwa:` line. If an asset is paused or limited (a corporate action or earnings), an extra line warns that the oracle may reprice.
- **Second-opinion simulation:** for a due account that passed the RPC simulation, `pre-transaction/simulate` checks `protect(user)` again. A `FAILED` verdict skips the send. An API error is logged and the RPC path continues.
- **MEV-protected broadcast:** in live mode the transaction is signed locally and relayed through `pre-transaction/broadcast-transaction` with MEV protection, then the keeper waits for the receipt over RPC. If the broadcast fails it falls back to a normal RPC send. Set `BINANCE_BROADCAST=0` to always use the RPC.

Requests are signed with HMAC-SHA256 using the secret, which never leaves your machine. That is why the static Halyard frontend cannot use this API: it has nowhere to keep a secret.

## Safety notes

- Use a fresh hot wallet funded with a little BNB for gas only. Do not reuse a wallet that holds anything else.
- The script never moves user funds. It only calls `protect(user)`; the vault decides what to sell and repay, within the user's own policy.
- Tips are paid in USDT to the keeper address. Gas is paid in BNB, so check that the tip covers it (each log line shows both).
- `.env` is git-ignored. Never commit it, and the script never prints the key.

## How it works

- On the first pass it scans `PolicySet` logs from the vault deploy block in 49,999-block chunks (4 at a time). Later passes scan only new blocks.
- Each pass re-reads `policyOf` for every discovered account. An empty `sellable` list means the policy was cleared, and expired policies are skipped.
- For active policies it reads `canProtect`. If the trigger is not `None` and the tip is at least `MIN_TIP_USDT`, it checks the user's Venus delegation to the vault.
- It simulates `protect(user)` from the keeper account and skips on revert (for example `NothingToProtect` when another keeper was first).
- If a key is set and `DRY_RUN` is off, it sends the transaction, waits for the receipt, and logs the BscScan link, the tip and the gas cost.
- One log line per account only when something is due or fails, plus one summary line per pass. RPC errors are handled per account and never stop the loop.
