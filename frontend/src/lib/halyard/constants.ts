import { Address } from 'viem'

// Addresses verified on BSC mainnet, see docs/ARCHITECTURE.md and contracts/deployments/56.json.
export const HALYARD_VAULT: Address = '0x6137aCd41F9828dE0836EA5a776e95184bF7Df10'
export const HALYARD_FROM_BLOCK = 126043949n

export const VENUS_COMPTROLLER: Address = '0xfD36E2c2a6789Db23113685031d7F16329158384'
export const VENUS_ORACLE: Address = '0x6592b5DE802159F3E74B2486b091D11a8256ab8A'
export const VENUS_VBNB: Address = '0xA07c5b74C9B40447a954e1466938b865b6BBea36'
export const VUSDT: Address = '0xfD5840Cd36d94D7229439859C0112a4185BC0255'
export const USDT: Address = '0x55d398326f99059fF775485246999027B3197955'

export const PANCAKE_QUOTER_V2: Address = '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997'
// Every bStock/USDT pool HalyardVault swaps through uses the 0.25% fee tier.
export const BSTOCK_POOL_FEE = 2500

export type BStock = {
  symbol: 'TSLAB' | 'NVDAB' | 'SPCXB'
  name: string
  token: Address
  vToken: Address
}

export const BSTOCKS: BStock[] = [
  {
    symbol: 'TSLAB',
    name: 'Tesla',
    token: '0x5b1910eAaD6450E50f816082Aa078C41F10C292f',
    vToken: '0x97421799419Eb782628e73e7220d8E0A207469a3',
  },
  {
    symbol: 'NVDAB',
    name: 'NVIDIA',
    token: '0x02Fca66C1D1aFB4E2A7884261eB00F63598a7436',
    vToken: '0xEb8Ca841cBe1BC4832A10b15c7dAB1081eDaD371',
  },
  {
    symbol: 'SPCXB',
    name: 'SpaceX',
    token: '0xbe9D156892E55e7154BcD3cB0FEA677F9D3103E1',
    vToken: '0xC36dFaCc7a125859C106F29b9F2d874CCF29A55A',
  },
]

export function bStockByVToken(vToken: string): BStock | undefined {
  return BSTOCKS.find(b => b.vToken.toLowerCase() === vToken.toLowerCase())
}

// Health targets shown as headroom on the dashboard (1.30 is the lowest target the vault accepts).
export const HEADROOM_TARGETS = [1.5, 1.4, 1.3]

/*
  Public RPCs that answer browser requests (CORS) without a key.
  - publicnode serves eth_call on recent state.
  - The NodeReal endpoint is the public one listed in the BNB Chain docs. It also serves
    eth_getLogs over ranges of up to 49,999 blocks, which publicnode does not.
*/
export const BSC_RPC_URLS = [
  'https://bsc-rpc.publicnode.com',
  'https://bsc-mainnet.nodereal.io/v1/64a9df0874fb4a93b9d0a3849de012d3',
]
export const BSC_LOGS_RPC_URL =
  'https://bsc-mainnet.nodereal.io/v1/64a9df0874fb4a93b9d0a3849de012d3'
export const LOGS_BLOCK_RANGE = 49_999n

export const BSCSCAN_URL = 'https://bscscan.com'
export const VENUS_APP_URL = 'https://app.venus.io'
