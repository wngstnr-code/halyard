import { parseAbi } from 'viem'

export const halyardVaultAbi = parseAbi([
  'struct Policy { uint16 minHealthBps; uint16 targetHealthBps; uint16 weekendHealthBps; uint16 maxSlippageBps; uint40 expiry; address[] sellable; }',
  'struct Plan { uint8 trigger; address vCollateral; uint256 healthBps; uint256 targetBps; uint256 repay; uint256 seize; uint256 minOut; uint256 fee; uint256 tip; }',
  'function health(address user) view returns (uint256 healthBps, uint256 weighted, uint256 debt)',
  'function policyOf(address user) view returns (Policy)',
  'function canProtect(address user) view returns (Plan)',
  'function marketState() view returns (bool open, bool preCloseWindow)',
  'function setPolicy(Policy policy)',
  'function clearPolicy()',
  'function protect(address user) returns (Plan)',
  'event PolicySet(address indexed user, Policy policy)',
  'event PolicyCleared(address indexed user)',
  'event Protected(address indexed user, uint8 indexed trigger, address indexed vCollateral, uint256 seized, uint256 repaid, uint256 healthBefore, uint256 healthAfter, uint256 fee, uint256 tip, address keeper)',
])

export const venusComptrollerAbi = parseAbi([
  'function getAssetsIn(address account) view returns (address[])',
  'function approvedDelegates(address user, address delegate) view returns (bool)',
  'function getEffectiveLtvFactor(address account, address vToken, uint8 weightingStrategy) view returns (uint256)',
  'function vaiController() view returns (address)',
  'function updateDelegate(address delegate, bool approved)',
])

export const venusVTokenAbi = parseAbi([
  'function getAccountSnapshot(address account) view returns (uint256 err, uint256 vTokenBalance, uint256 borrowBalance, uint256 exchangeRate)',
  'function underlying() view returns (address)',
  'function symbol() view returns (string)',
])

export const venusOracleAbi = parseAbi([
  'function getUnderlyingPrice(address vToken) view returns (uint256)',
])

export const venusVaiControllerAbi = parseAbi([
  'function getVAIRepayAmount(address account) view returns (uint256)',
])

// EIP-8056 scaled UI amounts on bStocks. Venus, the oracle and PancakeSwap all use raw units.
export const bStockAbi = parseAbi(['function uiMultiplier() view returns (uint256)'])

export const erc20Abi = parseAbi([
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
])

// PancakeSwap v3 QuoterV2. Not a view function, so it is called with eth_call (simulate).
export const pancakeQuoterV2Abi = parseAbi([
  'struct QuoteExactInputSingleParams { address tokenIn; address tokenOut; uint256 amountIn; uint24 fee; uint160 sqrtPriceLimitX96; }',
  'function quoteExactInputSingle(QuoteExactInputSingleParams params) returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
])
