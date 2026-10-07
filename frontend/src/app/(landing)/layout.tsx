import { PropsWithChildren } from 'react'
import { HalyardShell } from '@/components/layout/HalyardShell'

export default function LandingLayout({ children }: PropsWithChildren) {
  return <HalyardShell>{children}</HalyardShell>
}
