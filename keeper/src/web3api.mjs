import { createHmac } from 'node:crypto'

const PREFIX = '/build'
const TIMEOUT_MS = 15_000

/**
 * Tiny client for the Binance Web3 API. `path` starts with /api/v1/...; the /build prefix is added
 * to both the URL and the signed string. `now` can be injected so tests get a fixed timestamp.
 */
export function createWeb3Api({ apiKey, secretKey, baseUrl = 'https://web3.binance.com', now = () => new Date().toISOString() }) {
  async function request(method, path, query, body) {
    let requestPath = PREFIX + path
    if (query && Object.keys(query).length) requestPath += `?${new URLSearchParams(query).toString()}`
    const payload = body === undefined ? '' : JSON.stringify(body)
    const timestamp = now()
    // Sign exactly the string that is sent: timestamp + METHOD + path with raw query + body.
    const sign = createHmac('sha256', secretKey).update(timestamp + method + requestPath + payload).digest('base64')

    const headers = { 'X-OC-APIKEY': apiKey, 'X-OC-TIMESTAMP': timestamp, 'X-OC-SIGN': sign }
    if (method === 'POST') headers['Content-Type'] = 'application/json'

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    let res
    try {
      res = await fetch(baseUrl + requestPath, {
        method,
        headers,
        body: method === 'POST' ? payload : undefined,
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }

    const json = await res.json().catch(() => null)
    if (!res.ok || !json || json.code !== 0) {
      const err = new Error(`Web3 API ${json?.code ?? res.status}: ${json?.msg ?? res.statusText} (HTTP ${res.status})`)
      err.code = json?.code
      throw err
    }
    return json.data
  }

  return {
    get: (path, query) => request('GET', path, query),
    post: (path, body) => request('POST', path, undefined, body),
  }
}
