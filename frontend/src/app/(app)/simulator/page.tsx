import { Metadata } from 'next'
import { Suspense } from 'react'
import { DefaultPageContainer } from '@/components/ui/DefaultPageContainer'
import { Simulator } from '@/lib/halyard/simulator/Simulator'

export const metadata: Metadata = {
  title: 'Gap simulator | Halyard',
  description:
    'Replay every real weekend gap of TSLAB, NVDAB and SPCXB against a Venus position, with and without Halyard.',
}

export default function SimulatorPage() {
  return (
    <DefaultPageContainer minH="100vh">
      <Suspense>
        <Simulator />
      </Suspense>
    </DefaultPageContainer>
  )
}
