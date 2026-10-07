#!/usr/bin/env node
// halyard CLI: self-contained, zero-dependency, Node >= 22.
// Reads Halyard and Venus state on BNB Smart Chain and builds calldata for `baw contract-call`.
// It never signs or sends anything: every write goes through the Binance Agentic Wallet.
//
// Usage: node halyard.mjs <command> [args] [--flags]
//
// Commands:
//   position <address>       Venus position, health, headroom, Halyard policy, delegation and plan
//   plan <address>           What protect(address) would do right now (HalyardVault.canProtect)
//   market                   US market state as the vault sees it (open, pre-close window)
//   calldata <action> ...    Transaction for `baw contract-call preview` (to, value, inputData)
//       delegate             Allow HalyardVault to act for you on Venus (Comptroller.updateDelegate)
//       revoke               Remove that permission
//       set-policy --min <h> --target <h> --weekend <h> --slippage <pct> --days <n> --sell <SYMBOLS>
//       clear-policy         Delete your policy
//       protect <address>    Run protection for an account (permissionless, earns the keeper tip)
//   simulate --from <address> --to <address> --data <hex>
//                            eth_call a transaction and decode a revert into a Halyard error name
//   rwa                      Binance Web3 API RWA data for the bStocks: market status, corporate
//                            actions, on-chain vs reference price, compared with the Venus oracle.
//                            Needs BINANCE_WEB3_API_KEY and BINANCE_WEB3_SECRET_KEY.
//                            eth_call a transaction and decode a revert into a Halyard error name
//
// Output is always one JSON object on stdout. Exit code 1 on invalid input, 2 on RPC failure.

// ---- addresses (BNB Smart Chain mainnet, chain id 56) ----
const HALYARD_VAULT = '0x6137aCd41F9828dE0836EA5a776e95184bF7Df10';
const VENUS_COMPTROLLER = '0xfD36E2c2a6789Db23113685031d7F16329158384';
const VENUS_ORACLE = '0x6592b5DE802159F3E74B2486b091D11a8256ab8A';
const VENUS_VBNB = '0xA07c5b74C9B40447a954e1466938b865b6BBea36';

const BSTOCKS = [
  { symbol: 'TSLAB', token: '0x5b1910eAaD6450E50f816082Aa078C41F10C292f', vToken: '0x97421799419Eb782628e73e7220d8E0A207469a3' },
  { symbol: 'NVDAB', token: '0x02Fca66C1D1aFB4E2A7884261eB00F63598a7436', vToken: '0xEb8Ca841cBe1BC4832A10b15c7dAB1081eDaD371' },
  { symbol: 'SPCXB', token: '0xbe9D156892E55e7154BcD3cB0FEA677F9D3103E1', vToken: '0xC36dFaCc7a125859C106F29b9F2d874CCF29A55A' },
];

// Public endpoints that need no key. HALYARD_RPC_URL overrides them.
const RPC_URLS = process.env.HALYARD_RPC_URL
  ? [process.env.HALYARD_RPC_URL]
  : ['https://bsc-rpc.publicnode.com', 'https://bsc-mainnet.nodereal.io/v1/64a9df0874fb4a93b9d0a3849de012d3'];

// ---- policy limits, mirrored from HalyardVault ----
const LIMITS = {
  minTrigger: 1.01,
  minTarget: 1.3,
  maxHealth: 3,
  minSlippagePct: 0.5,
  maxSlippagePct: 3,
  maxSellable: 3,
  feePct: 0.3,
  tipPct: 0.1,
};

const SELECTORS = {
  health: '0xe2d8ebee',
  policyOf: '0xf514d6e5',
  canProtect: '0xb25de344',
  marketState: '0x08fb1b77',
  setPolicy: '0x7169bfa5',
  clearPolicy: '0xa592809a',
  protect: '0x6c2754ef',
  updateDelegate: '0xddbf54fd',
  approvedDelegates: '0x10b98338',
  getAssetsIn: '0xabfceffc',
  getAccountSnapshot: '0xc37f68e2',
  getUnderlyingPrice: '0xfc57d4df',
  getEffectiveLtvFactor: '0x19ef3e8b',
  underlying: '0x6f307dc3',
  symbol: '0x95d89b41',
  decimals: '0x313ce567',
  uiMultiplier: '0xa60bf13d',
  vaiController: '0x9254f5e5',
  getVAIRepayAmount: '0x78c2f922',
};

const ERRORS = {
  '0xd06b96b1': 'InvalidPolicy',
  '0x8a4a2a3b': 'NothingToProtect',
  '0x9ccd6d76': 'NotDelegated',
  '0xe7208c36': 'VenusError',
  '0x7b268179': 'InsufficientProceeds',
  '0x9448e184': 'HealthNotImproved',
  '0xdab1e993': 'UnexpectedCallback',
  '0x3ee5aeb5': 'ReentrancyGuardReentrantCall',
  '0x08c379a0': 'Error',
};

const TRIGGERS = ['None', 'LowHealth', 'PreClose'];
const MAX_UINT = 2n ** 256n - 1n;
const WAD = 10n ** 18n;

// ---- errors and validation ----
function fail(message, exitCode = 1) {
  return Object.assign(new Error(message), { exitCode });
}

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

function address(value, name = 'address') {
  if (typeof value !== 'string' || !ADDRESS_RE.test(value)) throw fail(`${name} must be a 0x-prefixed 20-byte address`);
  return value;
}

const same = (a, b) => a.toLowerCase() === b.toLowerCase();

// ---- ABI encoding (only the static types Halyard needs) ----
const word = (hex) => hex.replace(/^0x/, '').padStart(64, '0');
const encAddress = (a) => word(a.toLowerCase());
const encUint = (n) => word(BigInt(n).toString(16));
const encBool = (b) => encUint(b ? 1 : 0);

function encodePolicy({ minHealthBps, targetHealthBps, weekendHealthBps, maxSlippageBps, expiry, sellable }) {
  // setPolicy takes one dynamic tuple: offset to the tuple, five static fields, offset to the array, the array.
  return (
    SELECTORS.setPolicy +
    encUint(0x20) +
    encUint(minHealthBps) +
    encUint(targetHealthBps) +
    encUint(weekendHealthBps) +
    encUint(maxSlippageBps) +
    encUint(expiry) +
    encUint(6 * 32) +
    encUint(sellable.length) +
    sellable.map(encAddress).join('')
  );
}

// ---- ABI decoding ----
function words(hex) {
  const body = hex.replace(/^0x/, '');
  const out = [];
  for (let i = 0; i < body.length; i += 64) out.push(body.slice(i, i + 64));
  return out;
}

const decUint = (w) => BigInt('0x' + w);
const decAddress = (w) => '0x' + w.slice(24);
const decBool = (w) => decUint(w) !== 0n;

function decAddressArray(hex, offsetWord = 0) {
  const ws = words(hex);
  const start = Number(decUint(ws[offsetWord])) / 32;
  const length = Number(decUint(ws[start]));
  return ws.slice(start + 1, start + 1 + length).map(decAddress);
}

function decString(hex) {
  const ws = words(hex);
  // Some old tokens return bytes32 instead of string.
  if (ws.length === 1) return Buffer.from(ws[0], 'hex').toString('utf8').replace(/\0+$/, '');
  const start = Number(decUint(ws[0])) / 32;
  const length = Number(decUint(ws[start]));
  return Buffer.from(ws.slice(start + 1).join(''), 'hex')
    .subarray(0, length)
    .toString('utf8');
}

// ---- JSON-RPC ----
const TIMEOUT_MS = 15_000;
let rpcId = 0;

async function rpc(method, params) {
  let lastError;
  for (const url of RPC_URLS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }),
        signal: ctrl.signal,
      });
      const body = await res.json();
      if (body.error) {
        // A revert is an answer, not an RPC failure: do not retry it on another endpoint.
        if (body.error.data !== undefined || /revert/i.test(body.error.message ?? '')) {
          return { revert: body.error.data ?? '0x', message: body.error.message };
        }
        throw new Error(body.error.message);
      }
      return { result: body.result };
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw fail(`RPC request failed: ${lastError?.message ?? 'unknown error'}`, 2);
}

async function call(to, data, from) {
  const response = await rpc('eth_call', [{ to, data, ...(from ? { from } : {}) }, 'latest']);
  if (response.revert !== undefined) throw fail(`eth_call to ${to} reverted: ${describeRevert(response.revert)}`, 2);
  return response.result;
}

function describeRevert(data) {
  if (!data || data === '0x') return 'no reason';
  const selector = data.slice(0, 10);
  const name = ERRORS[selector];
  if (!name) return `unknown error ${selector}`;
  const args = words(data.slice(10));
  if (name === 'Error') return `Error(${decString('0x' + args.join(''))})`;
  return `${name}(${args.map((w) => decUint(w).toString()).join(', ')})`;
}

// ---- Binance Web3 API (optional, signed with the user's own key) ----
const WEB3_API = 'https://web3.binance.com';
const web3Keys = () =>
  process.env.BINANCE_WEB3_API_KEY && process.env.BINANCE_WEB3_SECRET_KEY
    ? { apiKey: process.env.BINANCE_WEB3_API_KEY, secretKey: process.env.BINANCE_WEB3_SECRET_KEY }
    : null;

async function web3Get(path, query) {
  const keys = web3Keys();
  if (!keys) throw fail('Binance Web3 API keys missing: set BINANCE_WEB3_API_KEY and BINANCE_WEB3_SECRET_KEY');
  const { createHmac } = await import('node:crypto');
  // The signed path must carry the /build prefix and the query exactly as sent.
  const requestPath = `/build${path}?${new URLSearchParams(query)}`;
  const timestamp = new Date().toISOString();
  const sign = createHmac('sha256', keys.secretKey)
    .update(timestamp + 'GET' + requestPath, 'utf8')
    .digest('base64');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(WEB3_API + requestPath, {
      headers: { 'X-OC-APIKEY': keys.apiKey, 'X-OC-TIMESTAMP': timestamp, 'X-OC-SIGN': sign },
      signal: ctrl.signal,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.code !== 0) throw fail(`Web3 API ${body.code ?? res.status}: ${body.msg ?? res.statusText} (${path})`, 2);
    return body.data;
  } catch (error) {
    throw error.exitCode ? error : fail(`Web3 API request failed: ${error.message} (${path})`, 2);
  } finally {
    clearTimeout(timer);
  }
}

// ---- formatting ----
function units(value, decimals = 18) {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const base = 10n ** BigInt(decimals);
  const fraction = (abs % base).toString().padStart(decimals, '0').replace(/0+$/, '');
  return (negative ? '-' : '') + (abs / base).toString() + (fraction ? '.' + fraction : '');
}

const num = (value, decimals = 18) => Number(units(value, decimals));
const usd = (n) => n.toFixed(2);
const healthText = (bps) => (bps === MAX_UINT ? 'no debt' : (Number(bps) / 10_000).toFixed(4));

// ---- reads ----
async function readMarket() {
  const ws = words(await call(HALYARD_VAULT, SELECTORS.marketState));
  return { usMarketOpen: decBool(ws[0]), preCloseWindow: decBool(ws[1]) };
}

async function readPlan(user) {
  const ws = words(await call(HALYARD_VAULT, SELECTORS.canProtect + encAddress(user)));
  const [trigger, vCollateral, healthBps, targetBps, repay, seize, minOut, fee, tip] = ws;
  const triggerName = TRIGGERS[Number(decUint(trigger))] ?? 'Unknown';
  const collateral = BSTOCKS.find((b) => same(b.vToken, decAddress(vCollateral)));

  return {
    due: triggerName !== 'None',
    trigger: triggerName,
    // canProtect leaves health at zero when the account has no live policy or delegation.
    ...(decUint(healthBps) === 0n ? {} : { healthNow: healthText(decUint(healthBps)) }),
    ...(triggerName === 'None'
      ? {}
      : {
          targetHealth: healthText(decUint(targetBps)),
          sell: { symbol: collateral?.symbol ?? 'unknown', vToken: decAddress(vCollateral), rawAmount: units(decUint(seize)) },
          repayUsdt: units(decUint(repay)),
          minSwapOutUsdt: units(decUint(minOut)),
          protocolFeeUsdt: units(decUint(fee)),
          keeperTipUsdt: units(decUint(tip)),
        }),
  };
}

async function readPolicy(user) {
  const hex = await call(HALYARD_VAULT, SELECTORS.policyOf + encAddress(user));
  const ws = words(hex);
  // Outer offset to the tuple, then five static fields and an offset to the array (relative to the tuple).
  const base = Number(decUint(ws[0])) / 32;
  const field = (i) => decUint(ws[base + i]);
  const arrayStart = base + Number(field(5)) / 32;
  const length = Number(decUint(ws[arrayStart]));
  const sellable = ws.slice(arrayStart + 1, arrayStart + 1 + length).map(decAddress);
  if (sellable.length === 0) return null;

  const expiry = Number(field(4));
  return {
    minHealth: healthText(field(0)),
    targetHealth: healthText(field(1)),
    weekendHealth: healthText(field(2)),
    maxSlippagePct: (Number(field(3)) / 100).toFixed(2),
    expiry: new Date(expiry * 1000).toISOString(),
    expired: expiry < Date.now() / 1000,
    sellable: sellable.map((v) => BSTOCKS.find((b) => same(b.vToken, v))?.symbol ?? v),
  };
}

async function readAsset(user, vToken) {
  const native = same(vToken, VENUS_VBNB);
  const ltv = (strategy) =>
    call(VENUS_COMPTROLLER, SELECTORS.getEffectiveLtvFactor + encAddress(user) + encAddress(vToken) + encUint(strategy));

  const [snapshot, price, cf, lt, underlying] = await Promise.all([
    call(vToken, SELECTORS.getAccountSnapshot + encAddress(user)),
    call(VENUS_ORACLE, SELECTORS.getUnderlyingPrice + encAddress(vToken)),
    ltv(0),
    ltv(1),
    native ? null : call(vToken, SELECTORS.underlying),
  ]);

  const token = underlying ? decAddress(words(underlying)[0]) : null;
  const [symbol, decimals] = token
    ? await Promise.all([
        call(token, SELECTORS.symbol).then(decString),
        call(token, SELECTORS.decimals).then((h) => Number(decUint(words(h)[0]))),
      ])
    : ['BNB', 18];

  const bStock = BSTOCKS.find((b) => same(b.vToken, vToken));
  const [, vBalance, borrowRaw, exchangeRate] = words(snapshot).map(decUint);
  const suppliedRaw = (vBalance * exchangeRate) / WAD;
  const priceRaw = decUint(words(price)[0]);
  // The Venus oracle scales prices to 36 - decimals, so raw amount * price has 36 decimals.
  const suppliedUsd = num(suppliedRaw * priceRaw, 36);
  const borrowedUsd = num(borrowRaw * priceRaw, 36);

  const asset = {
    symbol,
    vToken,
    isBStock: Boolean(bStock),
    supplied: units(suppliedRaw, decimals),
    borrowed: units(borrowRaw, decimals),
    priceUsd: units(priceRaw, 36 - decimals),
    suppliedUsd: usd(suppliedUsd),
    borrowedUsd: usd(borrowedUsd),
    collateralFactor: num(decUint(words(cf)[0])),
    liquidationThreshold: num(decUint(words(lt)[0])),
  };

  // EIP-8056: bStocks may scale balances for display. Venus and the vault work in raw units.
  if (bStock) {
    const multiplier = decUint(words(await call(bStock.token, SELECTORS.uiMultiplier))[0]);
    if (multiplier !== WAD) asset.suppliedUiAmount = units((suppliedRaw * multiplier) / WAD, decimals);
  }

  return { asset, suppliedUsd, borrowedUsd };
}

async function readPosition(user) {
  const [healthHex, assetsHex, delegatedHex, vaiHex, policy, plan, market] = await Promise.all([
    call(HALYARD_VAULT, SELECTORS.health + encAddress(user)),
    call(VENUS_COMPTROLLER, SELECTORS.getAssetsIn + encAddress(user)),
    call(VENUS_COMPTROLLER, SELECTORS.approvedDelegates + encAddress(user) + encAddress(HALYARD_VAULT)),
    call(VENUS_COMPTROLLER, SELECTORS.vaiController),
    readPolicy(user),
    readPlan(user),
    readMarket(),
  ]);

  const [healthBps, weightedRaw, debtRaw] = words(healthHex).map(decUint);
  const vaiController = decAddress(words(vaiHex)[0]);
  const vTokens = decAddressArray(assetsHex);

  const [rows, vaiDebt] = await Promise.all([
    Promise.all(vTokens.map((v) => readAsset(user, v))),
    /^0x0+$/.test(vaiController)
      ? 0n
      : call(vaiController, SELECTORS.getVAIRepayAmount + encAddress(user)).then((h) => decUint(words(h)[0])),
  ]);

  const weighted = num(weightedRaw);
  const debt = num(debtRaw);
  const borrowLimit = rows.reduce((sum, r) => sum + r.suppliedUsd * r.asset.collateralFactor, 0);
  const bStockWeighted = rows
    .filter((r) => r.asset.isBStock)
    .reduce((sum, r) => sum + r.suppliedUsd * r.asset.liquidationThreshold, 0);

  const headroom = (target) => Math.max(0, Math.min(weighted / target - debt, borrowLimit - debt));

  return {
    account: user,
    health: healthText(healthBps),
    collateralWeightedUsd: usd(weighted),
    debtUsd: usd(debt),
    vaiDebtUsd: usd(num(vaiDebt)),
    borrowLimitUsd: usd(borrowLimit),
    // How far all bStock prices can fall together before the account can be liquidated.
    bStockDropToLiquidationPct: debt > 0 && bStockWeighted > 0 ? (((weighted - debt) / bStockWeighted) * 100).toFixed(2) : null,
    extraBorrowUsdt: {
      atHealth1_50: usd(headroom(1.5)),
      atHealth1_40: usd(headroom(1.4)),
      atHealth1_30: usd(headroom(1.3)),
    },
    assets: rows.map((r) => r.asset).filter((a) => a.supplied !== '0' || a.borrowed !== '0'),
    halyard: {
      vault: HALYARD_VAULT,
      delegated: decBool(words(delegatedHex)[0]),
      policy,
      plan,
    },
    market,
  };
}

async function readRwa() {
  const tokens = BSTOCKS.map((b) => b.token);
  const [list, prices] = await Promise.all([
    web3Get('/api/v1/dex/market/rwa/tokens', { binanceChainId: '56', platformId: 'bstock' }),
    web3Get('/api/v1/dex/market/rwa/price', { binanceChainId: '56', tokenContractAddresses: tokens.join(',') }),
  ]);
  const rows = Array.isArray(list) ? list : (list?.list ?? list?.items ?? []);
  const priceRows = Array.isArray(prices) ? prices : [];

  const out = [];
  // One request per token: the gateway allows 5 requests per second per endpoint.
  for (const b of BSTOCKS) {
    const market = await web3Get('/api/v1/dex/market/rwa/underlying-market', {
      binanceChainId: '56',
      tokenContractAddress: b.token,
    });
    const m = Array.isArray(market) ? market[0] : market;
    const info = rows.find((r) => same(r.tokenContractAddress, b.token)) ?? {};
    const price = priceRows.find((r) => same(r.tokenContractAddress, b.token)) ?? {};
    const oracle = num(decUint(words(await call(VENUS_ORACLE, SELECTORS.getUnderlyingPrice + encAddress(b.vToken)))[0]));
    const status = m?.statusInfo ?? info.statusInfo ?? {};
    const tokenPrice = Number(price.tokenPrice ?? info.tokenPrice);

    out.push({
      symbol: b.symbol,
      token: b.token,
      underlying: info.underlyingTicker ?? null,
      marketStatus: status.marketStatus ?? null,
      tradable: status.openState ?? null,
      reasonCode: status.reasonCode ?? null,
      reasonMsg: status.reasonMsg ?? null,
      tokenPriceUsd: price.tokenPrice ?? info.tokenPrice ?? null,
      referencePriceUsd: price.referencePrice ?? info.referencePrice ?? null,
      tokenToShareRatio: info.tokenToShareRatio ?? null,
      venusOracleUsd: oracle.toFixed(4),
      // Positive: the Binance on-chain price is above the price Venus uses for liquidations.
      onChainVsOraclePct: Number.isFinite(tokenPrice) && oracle > 0 ? (((tokenPrice - oracle) / oracle) * 100).toFixed(2) : null,
      warning:
        status.reasonCode === 'ASSET_PAUSED'
          ? `Corporate action (${status.reasonMsg}): the oracle and the collateral value may reprice when it resolves.`
          : status.reasonCode === 'ASSET_LIMITED'
            ? `Trading restricted (${status.reasonMsg}): expect a larger move at the next update.`
            : null,
    });
  }
  return { source: 'Binance Web3 API (Market API, RWA Data)', bStocks: out };
}

// ---- calldata ----
function flags(args) {
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith('--')) continue;
    out[args[i].slice(2)] = args[i + 1];
    i++;
  }
  return out;
}

function numberFlag(f, name, { min, max }) {
  const value = Number(f[name]);
  if (f[name] === undefined || !Number.isFinite(value)) throw fail(`--${name} is required and must be a number`);
  if (value < min || value > max) throw fail(`--${name} must be between ${min} and ${max}, got ${value}`);
  return value;
}

function buildPolicy(f) {
  const min = numberFlag(f, 'min', { min: LIMITS.minTrigger, max: LIMITS.maxHealth });
  const target = numberFlag(f, 'target', { min: LIMITS.minTarget, max: LIMITS.maxHealth });
  const weekend = numberFlag(f, 'weekend', { min: LIMITS.minTarget, max: LIMITS.maxHealth });
  const slippage = numberFlag(f, 'slippage', { min: LIMITS.minSlippagePct, max: LIMITS.maxSlippagePct });
  const days = numberFlag(f, 'days', { min: 1, max: 3650 });
  if (target <= min) throw fail('--target must be above --min');

  const symbols = String(f.sell ?? '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  if (symbols.length === 0 || symbols.length > LIMITS.maxSellable) {
    throw fail(`--sell needs 1 to ${LIMITS.maxSellable} of ${BSTOCKS.map((b) => b.symbol).join(', ')}`);
  }
  if (new Set(symbols).size !== symbols.length) throw fail('--sell lists the same bStock twice');
  const sellable = symbols.map((s) => {
    const b = BSTOCKS.find((x) => x.symbol === s);
    if (!b) throw fail(`${s} is not supported. Supported: ${BSTOCKS.map((x) => x.symbol).join(', ')}`);
    return b;
  });

  const bps = (h) => Math.round(h * 10_000);
  const expiry = Math.floor(Date.now() / 1000) + Math.round(days * 86_400);

  return {
    policy: {
      minHealthBps: bps(min),
      targetHealthBps: bps(target),
      weekendHealthBps: bps(weekend),
      maxSlippageBps: Math.round(slippage * 100),
      expiry,
      sellable: sellable.map((b) => b.vToken),
    },
    summary:
      `Sell ${symbols.join(' then ')} to repay USDT when health falls below ${min.toFixed(2)} (restore to ${target.toFixed(2)}), ` +
      `or before a US market close when health is below ${weekend.toFixed(2)}. Max slippage ${slippage}%, ` +
      `expires ${new Date(expiry * 1000).toISOString()}.`,
  };
}

function buildCalldata(action, rest) {
  const tx = (to, inputData, summary, extra = {}) => ({ binanceChainId: '56', to, value: '0', inputData, summary, ...extra });

  switch (action) {
    case 'delegate':
      return tx(
        VENUS_COMPTROLLER,
        SELECTORS.updateDelegate + encAddress(HALYARD_VAULT) + encBool(true),
        'Venus Comptroller.updateDelegate(HalyardVault, true): lets HalyardVault act for you on Venus. It only repays your USDT debt and redeems the bStocks your policy allows; its code has no borrow call and it cannot be upgraded.'
      );
    case 'revoke':
      return tx(
        VENUS_COMPTROLLER,
        SELECTORS.updateDelegate + encAddress(HALYARD_VAULT) + encBool(false),
        'Venus Comptroller.updateDelegate(HalyardVault, false): removes the permission. Protection stops immediately.'
      );
    case 'set-policy': {
      const { policy, summary } = buildPolicy(flags(rest));
      return tx(HALYARD_VAULT, encodePolicy(policy), `HalyardVault.setPolicy: ${summary}`, { policy });
    }
    case 'clear-policy':
      return tx(HALYARD_VAULT, SELECTORS.clearPolicy, 'HalyardVault.clearPolicy(): deletes your policy.');
    case 'protect': {
      const user = address(rest[0], 'protect <address>');
      return tx(
        HALYARD_VAULT,
        SELECTORS.protect + encAddress(user),
        `HalyardVault.protect(${user}): sells the bStock amount the vault computes and repays USDT debt. Reverts with NothingToProtect when nothing is due.`
      );
    }
    default:
      throw fail('calldata action must be one of: delegate, revoke, set-policy, clear-policy, protect');
  }
}

async function simulate(rest) {
  const f = flags(rest);
  const from = address(f.from, '--from');
  const to = address(f.to, '--to');
  if (!/^0x[0-9a-fA-F]*$/.test(f.data ?? '')) throw fail('--data must be hex calldata');
  const response = await rpc('eth_call', [{ from, to, data: f.data }, 'latest']);
  return response.revert !== undefined
    ? { ok: false, revert: describeRevert(response.revert) }
    : { ok: true, returnData: response.result };
}

// ---- dispatch ----
async function main([command, ...rest]) {
  switch (command) {
    case 'position':
      return readPosition(address(rest[0], 'position <address>'));
    case 'plan':
      return readPlan(address(rest[0], 'plan <address>'));
    case 'market':
      return readMarket();
    case 'rwa':
      return readRwa();
    case 'calldata':
      return buildCalldata(rest[0], rest.slice(1));
    case 'simulate':
      return simulate(rest);
    default:
      throw fail('command must be one of: position, plan, market, rwa, calldata, simulate');
  }
}

main(process.argv.slice(2)).then(
  (data) => console.log(JSON.stringify({ success: true, data }, null, 2)),
  (error) => {
    console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
    process.exit(error.exitCode ?? 1);
  }
);
