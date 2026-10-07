'use client'

import { HalyardProviders } from '@/lib/halyard/HalyardProviders'
import { PropsWithChildren } from 'react'
import { HalyardNavBar } from '@/components/layout/NavBar'
import { Footer } from '@/components/layout/Footer'

// Landing and Halyard app pages: BSC-only providers, the Halyard navbar and the footer.
export function HalyardShell({ children }: PropsWithChildren) {
  return (
    <HalyardProviders>
      <HalyardNavBar />
      {children}
      <Footer />
    </HalyardProviders>
  )
}
