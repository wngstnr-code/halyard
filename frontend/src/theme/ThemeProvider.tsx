'use client'

import { ChakraProvider } from '@chakra-ui/react'
import { ReactNode } from 'react'
import { useIsMounted } from '@/hooks/useIsMounted'
import { theme } from './theme'

// Halyard uses the light, silver palette, so the color mode is pinned to light.
const lightColorModeManager = {
  get: () => 'light' as const,
  set: () => {},
  type: 'localStorage' as const,
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const isMounted = useIsMounted()

  // Chakra reads the color mode on the client; render after mount to avoid a hydration mismatch.
  if (!isMounted) return null

  return (
    <ChakraProvider
      colorModeManager={lightColorModeManager}
      cssVarsRoot="body"
      theme={theme}
      toastOptions={{ defaultOptions: { position: 'bottom-left' } }}
    >
      {children}
    </ChakraProvider>
  )
}
