import { PropsWithChildren } from 'react'
import { HalyardShell } from '@/components/layout/HalyardShell'

export default function HalyardLayout({ children }: PropsWithChildren) {
  return <HalyardShell>{children}</HalyardShell>
}
