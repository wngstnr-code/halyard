'use client'

import {
  Box,
  Grid,
  GridItem,
  Heading,
  Text,
  VStack,
  Link,
  chakra,
  Stack,
  Center,
} from '@chakra-ui/react'
import { DefaultPageContainer } from '@/components/ui/DefaultPageContainer'

import { useState, useEffect, useRef } from 'react'
import Noise from '@/components/ui/Noise'
import { Activity, Clock, Undo2 } from 'lucide-react'
import { FeatureCard } from '@/components/landing/shared/FeatureCard'
import { RadialPattern } from '@/components/landing/shared/RadialPattern'
import { HalyardMarkAnimated } from '@/components/brand/HalyardMarkAnimated'
import { useBreakpoints } from '@/hooks/useBreakpoints'
import { FadeIn } from '@/components/ui/animations/FadeIn'
import { WordsPullUp } from '@/components/ui/animations/WordsPullUp'
import { motion, useInView } from 'motion/react'

const MotionBox = motion(Box)
const MotionGrid = motion(Grid)
const MotionGridItem = motion(GridItem)

const keyFeatures = [
  {
    title: 'Pre-close trigger',
    subTitle: 'Ready before every weekend',
    description:
      'In the last hour before the US market closes for a weekend or a holiday, Halyard lifts your health to your weekend target.',
    icon: <Clock size={40} strokeWidth={1.5} />,
  },
  {
    title: 'Health trigger',
    subTitle: 'A floor under your loan',
    description:
      'Whenever health drops below your minimum, Halyard sells just enough bStock to bring it back to your target.',
    icon: <Activity size={40} strokeWidth={1.5} />,
  },
  {
    title: 'Revoke any time',
    subTitle: 'One transaction to switch it off',
    description:
      'Clear your policy or remove the Venus delegation whenever you want. Your collateral never leaves Venus.',
    icon: <Undo2 size={40} strokeWidth={1.5} />,
  },
]

const features = [
  {
    title: 'Market hours on-chain',
    shortDescription:
      'MarketClock encodes NYSE sessions, holidays, early closes and daylight saving time for 2026 and 2027. The pre-close window is enforced by the contract, not by a server.',
  },
  {
    title: 'Fee-free flash loans',
    shortDescription:
      'The USDT for each de-risk comes from a Lista Moolah flash loan with no fee, so Halyard works even when your wallet holds no USDT.',
  },
  {
    title: 'Never borrows for you',
    shortDescription:
      'Venus delegation would also allow borrowing on your behalf. HalyardVault has no borrow path at all, so it can only shrink your debt.',
  },
  {
    title: 'Venus liquidation math',
    shortDescription:
      'Health is computed with the same liquidation thresholds Venus uses to liquidate, including per-user pools and VAI debt.',
  },
  {
    title: 'Health must go up',
    shortDescription:
      'After every run the vault reads your health again. If it did not improve, the transaction reverts with HealthNotImproved.',
  },
  {
    title: 'Your slippage limit',
    shortDescription:
      'You choose the maximum slippage, from 0.5% to 3%. The swap reverts if PancakeSwap would return less than that floor.',
  },
  {
    title: 'Permissionless keepers',
    shortDescription:
      'Anyone can call protect and earn a 0.1% tip: a bot, your own browser tab or your AI agent. The contract picks the amounts, so a keeper cannot choose harmful ones.',
  },
  {
    title: 'Leftovers come back to you',
    shortDescription:
      'If the sale returns more than needed, the extra repays more of your debt. Anything beyond your debt is sent to your wallet.',
  },
  {
    title: 'Immutable and verified',
    shortDescription:
      'No owner, no upgrade path, no admin keys. The source is verified on BscScan and Sourcify.',
  },
]

function FeatureText({
  title,
  shortDescription,
  description,
  index,
}: {
  title: string
  shortDescription: string
  description?: string
  index: number
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const isOdd = index % 2 === 1

  return (
    <VStack
      alignItems="start"
      position="relative"
      spacing="sm"
      {...(isOdd && { bg: 'background.level0' })}
      p="md"
      rounded="lg"
    >
      <Heading as="h5" size="md">
        {title}
      </Heading>
      <Box position="relative">
        <Text color="font.secondary" sx={{ textWrap: 'balance' }} whiteSpace="pre-line">
          {shortDescription}
          {description && (
            <Link ml="sm" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? 'Show less' : 'Read more'}
            </Link>
          )}
        </Text>
        {isExpanded && (
          <MotionBox
            animate={{ opacity: 1 }}
            bg="background.level0"
            borderRadius="md"
            boxShadow="lg"
            initial={{ opacity: 0 }}
            left={-4}
            maxW="600px"
            p={4}
            position="absolute"
            top={-4}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <Text color="font.secondary" fontSize="lg" whiteSpace="pre-line">
              {description}
              <Link ml="sm" onClick={() => setIsExpanded(false)}>
                Show less
              </Link>
            </Text>
          </MotionBox>
        )}
      </Box>
    </VStack>
  )
}

export function Features() {
  const [scrollPercentage, setScrollPercentage] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const { isMobile } = useBreakpoints()

  const gridRef = useRef(null)
  const isInView = useInView(gridRef, { once: true, margin: '-50px' })

  const gridVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  }

  const gridItemVariants = {
    show: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 10,
      },
    },
    hidden: { opacity: 0, filter: 'blur(3px)', scale: 0.95, y: 15 },
  }

  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const windowHeight = window.innerHeight

        // Add a buffer of 100px to delay the start of the animation
        const buffer = 300

        // Calculate progress with buffer
        const progress = Math.min(
          Math.max(((windowHeight - (rect.top + buffer)) / rect.height) * 100, 0),
          100
        )

        setScrollPercentage(progress)
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Initial calculation

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <Noise id="features" position="relative">
      <DefaultPageContainer
        minH="800px"
        noVerticalPadding
        position="relative"
        pt={['xl', '3xl']}
        py={['3xl', '10rem']}
      >
        <FadeIn delay={0.2} direction="up" duration={0.6}>
          <Heading as="h4" mx="auto" size="lg">
            <chakra.span color="font.primary">Protection that knows the market clock.</chakra.span>
            <chakra.span color="font.primary" style={{ opacity: 0.6 }}>
              {' '}
              The oracle updates every hour, but bStocks really reprice when the US market opens.
              Halyard acts before the gap, not after it.
            </chakra.span>
          </Heading>
        </FadeIn>

        <MotionGrid
          animate={isInView ? 'show' : 'hidden'}
          gap="xl"
          initial="hidden"
          mt="2xl"
          ref={gridRef}
          templateColumns={{ base: 'repeat(1, 1fr)', lg: 'repeat(3, 1fr)' }}
          variants={gridVariants}
        >
          {keyFeatures.map((feature, index) => (
            <MotionGridItem key={index} variants={gridItemVariants}>
              <FeatureCard {...feature} iconProps={{ color: 'font.primary' }} />
            </MotionGridItem>
          ))}
        </MotionGrid>

        <Stack direction={{ base: 'column', lg: 'row' }} gap="2xl" mt="3xl">
          <Box
            alignSelf="flex-start"
            h={isMobile ? 'auto' : '700px'}
            position="sticky"
            top="82px"
            w="full"
          >
            <VStack alignItems="start" spacing="lg">
              <WordsPullUp
                as="h2"
                color="font.primary"
                fontSize="4xl"
                fontWeight="bold"
                letterSpacing="-0.04rem"
                lineHeight={1}
                text="Under the hood"
              />
              <FadeIn delay={0.2} direction="up" duration={0.6}>
                <Text color="font.secondary" fontSize="lg" sx={{ textWrap: 'pretty' }}>
                  Halyard is small on purpose. Every rule lives in an immutable contract you can
                  read, and every de-risk is a real transaction on BNB Chain.
                </Text>
              </FadeIn>
            </VStack>
            {!isMobile && (
              <Center position="relative">
                <RadialPattern
                  circleCount={8}
                  height={600}
                  innerHeight={150}
                  innerWidth={150}
                  position="absolute"
                  progress={scrollPercentage}
                  top={-10}
                  width={600}
                >
                  <HalyardMarkAnimated size={100} />
                </RadialPattern>
              </Center>
            )}
          </Box>
          <VStack ref={containerRef} spacing="md" w="full">
            {features.map((feature, index) => (
              <FadeIn direction="up" key={index} zIndex={10 - index}>
                <FeatureText index={index} {...feature} />
              </FadeIn>
            ))}
          </VStack>
        </Stack>
      </DefaultPageContainer>

      <Box
        bgGradient="linear(transparent 0%, background.base 50%, transparent 100%)"
        bottom="0"
        h="200px"
        left="0"
        mb="-100px"
        position="absolute"
        w="full"
      />
    </Noise>
  )
}
