import { Atomic } from '@/components/landing/Atomic'
import { Features } from '@/components/landing/Features'
import { Fees } from '@/components/landing/Fees'
import { Hero } from '@/components/landing/Hero'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { MovingParts } from '@/components/landing/MovingParts'
import { Security } from '@/components/landing/Security'

export function Landing() {
  return (
    <>
      <Hero />
      <Atomic />
      <MovingParts />
      <Features />
      <Fees />
      <HowItWorks />
      <Security />
    </>
  )
}
