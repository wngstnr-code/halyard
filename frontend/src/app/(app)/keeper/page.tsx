import { Metadata } from 'next'
import { DefaultPageContainer } from '@/components/ui/DefaultPageContainer'
import { Keeper } from '@/lib/halyard/keeper/Keeper'

export const metadata: Metadata = {
  title: 'Keeper | Halyard',
  description: 'Run protect for Halyard positions that need it and earn the 0.1% keeper tip.',
}

export default function KeeperPage() {
  return (
    <DefaultPageContainer minH="100vh">
      <Keeper />
    </DefaultPageContainer>
  )
}
