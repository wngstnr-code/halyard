import { Metadata } from 'next'
import { Suspense } from 'react'
import { DefaultPageContainer } from '@/components/ui/DefaultPageContainer'
import { Dashboard } from '@/lib/halyard/dashboard/Dashboard'

export const metadata: Metadata = {
  title: 'Dashboard | Halyard',
  description: 'Your Venus position, health, headroom and Halyard protection status on BNB Chain.',
}

export default function DashboardPage() {
  return (
    <DefaultPageContainer minH="100vh">
      <Suspense>
        <Dashboard />
      </Suspense>
    </DefaultPageContainer>
  )
}
