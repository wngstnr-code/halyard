import { Metadata } from 'next'
import { DefaultPageContainer } from '@/components/ui/DefaultPageContainer'
import { Protect } from '@/lib/halyard/protect/Protect'

export const metadata: Metadata = {
  title: 'Protect | Halyard',
  description: 'Set when Halyard de-risks your bStock loan on Venus, activate it, or turn it off.',
}

export default function ProtectPage() {
  return (
    <DefaultPageContainer minH="100vh">
      <Protect />
    </DefaultPageContainer>
  )
}
