import {
  createPublicClient,
  encodeFunctionData,
  createWalletClient,
  formatEther,
  formatUnits,
  getAbiItem,
  http,
  isHex,
  parseAbi,
  parseUnits,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { bsc } from 'viem/chains'
import { createWeb3Api } from './web3api.mjs'

const HALYARD_VAULT = '0x6137aCd41F9828dE0836EA5a776e95184bF7Df10'
const HALYARD_FROM_BLOCK = 126043949n
const VENUS_COMPTROLLER = '0xfD36E2c2a6789Db23113685031d7F16329158384'
const LOGS_BLOCK_RANGE = 49_999n
const LOGS_CONCURRENCY = 4
const BSCSCAN_URL = 'https://bscscan.com'
const WATCH_ONLY_SENDER = '0x000000000000000000000000000000000000dEaD'
const BSTOCKS = {
  TSLAB: '0x5b1910eAaD6450E50f816082Aa078C41F10C292f',
  NVDAB: '0x02Fca66C1D1aFB4E2A7884261eB00F63598a7436',
  SPCXB: '0xbe9D156892E55e7154BcD3cB0FEA677F9D3103E1',
}

const DEFAULT_RPC = 'https://bsc-rpc.publicnode.com'
// Public NodeReal endpoint from the BNB Chain docs. The only free one that serves wide eth_getLogs.
const DEFAULT_LOGS_RPC = 'https://bsc-mainnet.nodereal.io/v1/64a9df0874fb4a93b9d0a3849de012d3'

const vaultAbi = parseAbi([
  'struct Policy { uint16 minHealthBps; uint16 targetHealthBps; uint16 weekendHealthBps; uint16 maxSlippageBps; uint40 expiry; address[] sellable; }',
  'struct Plan { uint8 trigger; address vCollateral; uint256 healthBps; uint256 targetBps; uint256 repay; uint256 seize; uint256 minOut; uint256 fee; uint256 tip; }',
  'function policyOf(address user) view returns (Policy)',
  'function canProtect(address user) view returns (Plan)',
  'function marketState() view returns (bool open, bool preCloseWindow)',
  'function protect(address user) returns (Plan)',
  'event PolicySet(address indexed user, Policy policy)',
])

const comptrollerAbi = parseAbi([
  'function approvedDelegates(address user, address delegate) view returns (bool)',
])

const policySetEvent = getAbiItem({ abi: vaultAbi, name: 'PolicySet' })
const TRIGGERS = { 1: 'LowHealth', 2: 'PreClose' }

const once = process.argv.includes('--once')
const pollSeconds = Math.max(5, Number(process.env.POLL_SECONDS || 60))
const minTip = parseUnits(process.env.MIN_TIP_USDT || '0', 18)
const dryRun = ['1', 'true'].includes((process.env.DRY_RUN || '').toLowerCase())

const log = msg => console.log(`${new Date().toISOString()} ${msg}`)
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
// Keep error lines short and make sure an RPC URL (which may hold a key) never reaches the log.
const errText = e =>
  String(e?.shortMessage || e?.message || e)
    .split('\n')[0]
    .replace(/https?:\/\/\S+/g, '<url>')
    .slice(0, 200)

let account = null
const rawKey = (process.env.KEEPER_PRIVATE_KEY || '').trim()
if (rawKey) {
  const key = rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`
  if (!isHex(key) || key.length !== 66) {
    console.error('KEEPER_PRIVATE_KEY is not a 32-byte hex string')
    process.exit(1)
  }
  account = privateKeyToAccount(key)
}

const client = createPublicClient({
  chain: bsc,
  transport: http(process.env.BSC_RPC_URL || DEFAULT_RPC, { retryCount: 2 }),
})
const logsClient = createPublicClient({
  chain: bsc,
  transport: http(process.env.BSC_LOGS_RPC_URL || DEFAULT_LOGS_RPC, { retryCount: 2 }),
})
// Binance Web3 API is optional: without both keys the keeper never calls it.
const web3Key = (process.env.BINANCE_WEB3_API_KEY || '').trim()
const web3Secret = (process.env.BINANCE_WEB3_SECRET_KEY || '').trim()
const web3 = web3Key && web3Secret ? createWeb3Api({ apiKey: web3Key, secretKey: web3Secret }) : null
const useWeb3Broadcast = Boolean(web3) && (process.env.BINANCE_BROADCAST ?? '1').trim() !== '0'

const wallet = account
  ? createWalletClient({
      account,
      chain: bsc,
      transport: http(process.env.BSC_RPC_URL || DEFAULT_RPC, { retryCount: 2 }),
    })
  : null

// Discovery state, kept in memory between passes.
const policyUsers = new Set()
let nextScanBlock = HALYARD_FROM_BLOCK

/** Scan PolicySet logs from the last scanned block to the latest one. */
async function scanNewPolicies() {
  const latest = await logsClient.getBlockNumber()
  const ranges = []
  for (let from = nextScanBlock; from <= latest; from += LOGS_BLOCK_RANGE + 1n) {
    const to = from + LOGS_BLOCK_RANGE > latest ? latest : from + LOGS_BLOCK_RANGE
    ranges.push([from, to])
  }

  const found = []
  for (let i = 0; i < ranges.length; i += LOGS_CONCURRENCY) {
    const batch = ranges.slice(i, i + LOGS_CONCURRENCY)
    const chunks = await Promise.all(
      batch.map(([fromBlock, toBlock]) =>
        logsClient.getLogs({ address: HALYARD_VAULT, event: policySetEvent, fromBlock, toBlock })
      )
    )
    for (const logs of chunks) for (const l of logs) if (l.args.user) found.push(l.args.user)
  }

  // Only advance once every chunk succeeded, so a failed scan is retried from the same block.
  for (const user of found) policyUsers.add(user.toLowerCase())
  nextScanBlock = latest + 1n
}

/** Check one account. Returns true if a protect transaction was sent. */
async function handleAccount(user, now) {
  const policy = await client.readContract({
    address: HALYARD_VAULT,
    abi: vaultAbi,
    functionName: 'policyOf',
    args: [user],
  })
  // A cleared policy has no sellable markets left.
  if (policy.sellable.length === 0) return { active: false, due: false, sent: false }
  if (Number(policy.expiry) <= now) return { active: false, due: false, sent: false }

  const plan = await client.readContract({
    address: HALYARD_VAULT,
    abi: vaultAbi,
    functionName: 'canProtect',
    args: [user],
  })
  if (plan.trigger === 0) return { active: true, due: false, sent: false }

  const label = `${user} ${TRIGGERS[plan.trigger] ?? plan.trigger}`
  const tipText = `tip ${formatUnits(plan.tip, 18)} USDT`

  if (plan.tip < minTip) {
    log(`${label}: skipped, ${tipText} is below MIN_TIP_USDT`)
    return { active: true, due: false, sent: false }
  }

  const delegated = await client.readContract({
    address: VENUS_COMPTROLLER,
    abi: comptrollerAbi,
    functionName: 'approvedDelegates',
    args: [user, HALYARD_VAULT],
  })
  if (!delegated) {
    log(`${label}: skipped, user has not delegated to the vault on Venus`)
    return { active: true, due: false, sent: false }
  }

  // The vault re-validates everything on-chain, so a revert here means someone else got there first or the price moved.
  // Without a key, simulate from a placeholder: the tip transfer reverts when sent to the zero address.
  const from = account?.address ?? WATCH_ONLY_SENDER
  let request
  try {
    ;({ request } = await client.simulateContract({
      address: HALYARD_VAULT,
      abi: vaultAbi,
      functionName: 'protect',
      args: [user],
      account: from,
    }))
  } catch (e) {
    log(`${label}: simulation reverted, skipping (${errText(e)})`)
    return { active: true, due: true, sent: false }
  }

  // Second opinion from Binance. An API error never blocks the RPC path, only a FAILED verdict does.
  let web3Text = ''
  if (web3) {
    try {
      const sim = await web3.post('/api/v1/dex/pre-transaction/simulate', {
        binanceChainId: '56',
        evmTx: {
          from,
          to: HALYARD_VAULT,
          value: '0',
          data: encodeFunctionData({ abi: vaultAbi, functionName: 'protect', args: [user] }),
        },
      })
      if (String(sim?.status).toUpperCase() === 'FAILED') {
        log(`${label}: skipped, Web3 API simulation failed: ${sim.failReason || 'no reason given'}`)
        return { active: true, due: true, sent: false }
      }
      web3Text = ` web3 sim: ${sim?.status ?? 'unknown'}`
    } catch (e) {
      log(`${label}: Web3 API simulation unavailable (${errText(e)})`)
    }
  }

  let gasText = ''
  try {
    const [gas, gasPrice] = await Promise.all([
      client.estimateContractGas({
        address: HALYARD_VAULT,
        abi: vaultAbi,
        functionName: 'protect',
        args: [user],
        account: from,
      }),
      client.getGasPrice(),
    ])
    gasText = `, est. gas ${formatEther(gas * gasPrice)} BNB`
  } catch {
    gasText = ', gas estimate unavailable'
  }

  if (!wallet || dryRun) {
    const why = !wallet ? 'watch-only' : 'dry run'
    log(`${label}: due, ${tipText}${gasText} (${why}, not sending)${web3Text}`)
    return { active: true, due: true, sent: false }
  }

  try {
    let hash
    let via = ''
    if (useWeb3Broadcast) {
      try {
        // Sign locally, the secret and the key never leave this machine; Binance only relays the raw tx.
        const prepared = await wallet.prepareTransactionRequest({
          account,
          to: HALYARD_VAULT,
          data: encodeFunctionData({ abi: vaultAbi, functionName: 'protect', args: [user] }),
        })
        const signedTransaction = await wallet.signTransaction(prepared)
        const sent = await web3.post('/api/v1/dex/pre-transaction/broadcast-transaction', {
          binanceChainId: '56',
          signedTransaction,
          address: account.address,
          enableMevProtection: true,
        })
        if (!sent?.txHash) throw new Error('Web3 API broadcast returned no txHash')
        hash = sent.txHash
        via = ', via Binance Web3 API (MEV protected)'
      } catch (e) {
        log(`${label}: Web3 API broadcast failed, falling back to RPC (${errText(e)})`)
      }
    }
    if (!hash) hash = await wallet.writeContract(request)
    const receipt = await client.waitForTransactionReceipt({ hash })
    if (receipt.status !== 'success') {
      log(`${label}: tx reverted ${BSCSCAN_URL}/tx/${hash}`)
      return { active: true, due: true, sent: false }
    }
    const paid = formatEther(receipt.gasUsed * receipt.effectiveGasPrice)
    log(`${label}: protected ${BSCSCAN_URL}/tx/${hash}, ${tipText}, gas paid ${paid} BNB${web3Text}${via}`)
    return { active: true, due: true, sent: true }
  } catch (e) {
    log(`${label}: send failed (${errText(e)})`)
    return { active: true, due: true, sent: false }
  }
}

/** Log the bStock underlying market status from Binance. Sequential to stay under 5 requests per second. */
async function logRwaStatus() {
  try {
    const parts = []
    const notes = []
    for (const [symbol, address] of Object.entries(BSTOCKS)) {
      const res = await web3.get('/api/v1/dex/market/rwa/underlying-market', {
        binanceChainId: '56',
        tokenContractAddress: address,
      })
      const info = (Array.isArray(res) ? res[0] : res)?.statusInfo
      if (!info) {
        parts.push(`${symbol} unknown`)
        continue
      }
      // marketStatus is often null (seen 2026-10-07 at 08:34 UTC); reasonCode and openState are always set.
      const state = info.marketStatus ?? `${(info.reasonCode ?? 'unknown').toLowerCase()}${info.openState === false ? ' (closed)' : ''}`
      parts.push(`${symbol} ${state}${info.reasonMsg ? ` (${info.reasonMsg})` : ''}`)
      if (info.reasonCode === 'ASSET_PAUSED' || info.reasonCode === 'ASSET_LIMITED') {
        notes.push(`${symbol} ${info.reasonCode}${info.reasonMsg ? ` ${info.reasonMsg}` : ''}`)
      }
    }
    log(`rwa: ${parts.join(', ')}`)
    for (const n of notes) log(`rwa: ${n}, oracle may reprice at the next update`)
  } catch (e) {
    log(`rwa: status unavailable (${errText(e)})`)
  }
}

let passNumber = 0

async function runPass() {
  passNumber += 1
  const stats = { policies: 0, due: 0, sent: 0, errors: 0 }

  try {
    const [open, preCloseWindow] = await client.readContract({
      address: HALYARD_VAULT,
      abi: vaultAbi,
      functionName: 'marketState',
    })
    log(`market: US ${open ? 'open' : 'closed'}, pre-close window ${preCloseWindow ? 'yes' : 'no'}`)
  } catch (e) {
    log(`market state unavailable (${errText(e)})`)
  }

  if (web3) await logRwaStatus()

  try {
    await scanNewPolicies()
  } catch (e) {
    log(`log scan failed, will retry next pass (${errText(e)})`)
    stats.errors += 1
  }

  const now = Math.floor(Date.now() / 1000)
  for (const user of policyUsers) {
    try {
      const r = await handleAccount(user, now)
      if (r.active) stats.policies += 1
      if (r.due) stats.due += 1
      if (r.sent) stats.sent += 1
    } catch (e) {
      stats.errors += 1
      log(`${user}: read failed (${errText(e)})`)
    }
  }

  const errs = stats.errors ? `, ${stats.errors} errors` : ''
  log(`pass ${passNumber}: ${stats.policies} policies, ${stats.due} due, ${stats.sent} sent${errs}`)
  return stats
}

async function main() {
  const mode = !account ? 'watch-only' : dryRun ? 'dry run' : 'live'
  log(
    web3
      ? 'Binance Web3 API: on'
      : 'Binance Web3 API: off (set BINANCE_WEB3_API_KEY and BINANCE_WEB3_SECRET_KEY to enable)'
  )
  log(`halyard keeper starting (${mode}${account ? `, keeper ${account.address}` : ''})`)

  let failures = 0
  for (;;) {
    try {
      await runPass()
      failures = 0
    } catch (e) {
      failures += 1
      log(`pass failed (${errText(e)})`)
    }
    if (once) return
    // Back off after repeated failures, capped at 10 minutes.
    const wait = Math.min(pollSeconds * 2 ** Math.min(failures, 5), 600)
    await sleep(wait * 1000)
  }
}

main().then(
  () => process.exit(0),
  e => {
    console.error(errText(e))
    process.exit(1)
  }
)
