import type { NextConfig } from 'next'

// Halyard has no backend: the app is exported as static files and talks to BNB Chain from the
// browser. `output: 'export'` makes any server-only feature (API routes, middleware, ISR) a build
// error instead of a silent dependency.
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  // Pin the workspace root so Next does not pick up lockfiles from parent folders.
  turbopack: { root: process.cwd() },
  // Do not let `next dev` write AGENTS.md and CLAUDE.md into the app folder.
  agentRules: false,
}

export default nextConfig
