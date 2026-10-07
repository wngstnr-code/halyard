'use client'

import { VStack, Text, Grid, GridItem, Center, Box, BoxProps, Link } from '@chakra-ui/react'
import { DefaultPageContainer } from '@/components/ui/DefaultPageContainer'
import Noise from '@/components/ui/Noise'
import { useRef } from 'react'
import { useBreakpoints } from '@/hooks/useBreakpoints'
import { FeatureCard } from '@/components/landing/shared/FeatureCard'
import { WordsPullUp } from '@/components/ui/animations/WordsPullUp'
import { FadeIn } from '@/components/ui/animations/FadeIn'
import { motion, useInView } from 'motion/react'

const MotionGrid = motion(Grid)
const MotionGridItem = motion(GridItem)

function PartnerButton({ name, href, ...props }: { name: string; href: string } & BoxProps) {
  return (
    <Link _hover={{ textDecoration: 'none' }} h="full" href={href} isExternal w="full">
      <Box
        _hover={{
          bg: 'background.level3',
        }}
        bg="background.level2"
        color="font.primary"
        cursor="pointer"
        h="full"
        minH="100px"
        p="md"
        rounded="lg"
        shadow="md"
        transition="background 0.5s ease-in-out"
        w="full"
        {...props}
      >
        <Center
          _hover={{ opacity: 1 }}
          h="full"
          opacity={0.7}
          transition="opacity 0.5s ease-in-out"
          w="full"
        >
          <Text fontSize="xl" fontWeight="bold" letterSpacing="-0.02rem" textAlign="center">
            {name}
          </Text>
        </Center>
      </Box>
    </Link>
  )
}

export function Fees() {
  const { isMobile } = useBreakpoints()

  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

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

  return (
    <Noise backgroundColor="background.level0WithOpacity" id="fees">
      <DefaultPageContainer noVerticalPadding py={['3xl', '10rem']}>
        <VStack alignItems="center" spacing="md" textAlign="center">
          <WordsPullUp
            as="h2"
            color="font.primary"
            fontSize="4xl"
            fontWeight="bold"
            letterSpacing="-0.04rem"
            lineHeight={1}
            text="Pay only when it acts"
          />
          <FadeIn delay={0.2} direction="up" duration={0.6}>
            <Text color="font.secondary" fontSize="lg" maxW="2xl">
              No subscription and no deposit. Halyard charges only when it de-risks your position.
              {isMobile ? <>&nbsp;</> : <br />}
              Every number below is a constant in the HalyardVault contract.
            </Text>
          </FadeIn>
        </VStack>
        <MotionGrid
          animate={isInView ? 'show' : 'hidden'}
          gap="md"
          initial="hidden"
          mt="2xl"
          ref={ref}
          templateColumns="repeat(12, 1fr)"
          templateRows="repeat(3, 1fr)"
          variants={gridVariants}
        >
          <MotionGridItem colSpan={{ base: 12, lg: 4 }} order={1} variants={gridItemVariants}>
            <FeatureCard
              radialPatternProps={{
                innerHeight: 100,
                innerWidth: 100,
                height: 200,
                width: 200,
                circleCount: 6,
              }}
              stat="0.3%"
              statProps={{ fontSize: '3xl', fontWeight: 'bold' }}
              subTitle="Of the de-risked amount"
              title="Protocol fee"
              titleSize="2xl"
            />
          </MotionGridItem>
          <MotionGridItem colSpan={{ base: 12, lg: 4 }} order={2} variants={gridItemVariants}>
            <FeatureCard
              radialPatternProps={{
                innerHeight: 100,
                innerWidth: 100,
                height: 200,
                width: 200,
                circleCount: 6,
              }}
              stat="0.1%"
              statProps={{ fontSize: '3xl', fontWeight: 'bold' }}
              subTitle="To whoever runs protect"
              title="Keeper tip"
              titleSize="2xl"
            />
          </MotionGridItem>
          <MotionGridItem colSpan={{ base: 12, lg: 4 }} order={3} variants={gridItemVariants}>
            <FeatureCard
              radialPatternProps={{
                innerHeight: 100,
                innerWidth: 100,
                height: 200,
                width: 200,
                circleCount: 6,
              }}
              stat="1.30"
              statProps={{ fontSize: '3xl', fontWeight: 'bold' }}
              subTitle="The lowest target you can set"
              title="Target health"
              titleSize="2xl"
            />
          </MotionGridItem>
          <MotionGridItem colSpan={{ base: 6, lg: 2 }} order={4} variants={gridItemVariants}>
            <PartnerButton href="https://app.venus.io" name="Venus" />
          </MotionGridItem>
          <MotionGridItem colSpan={{ base: 6, lg: 2 }} order={5} variants={gridItemVariants}>
            <PartnerButton href="https://lista.org" name="Lista DAO" />
          </MotionGridItem>
          <MotionGridItem
            colSpan={{ base: 12, lg: 8 }}
            order={{ base: 10, lg: 6 }}
            rowSpan={2}
            variants={gridItemVariants}
          >
            <FeatureCard
              h={{ base: '300px', lg: 'full' }}
              radialPatternProps={{
                innerHeight: 100,
                innerWidth: 100,
                height: isMobile ? 200 : 250,
                width: isMobile ? 200 : 250,
                circleCount: isMobile ? 6 : 8,
              }}
              stat="10%"
              statProps={{ fontSize: '3xl', fontWeight: 'bold' }}
              subTitle="Venus liquidators take a 10% incentive on the debt they repay. Halyard steps in before that happens."
              title="What a liquidation costs"
              titleSize="3xl"
            />
          </MotionGridItem>
          <MotionGridItem
            colSpan={{ base: 6, lg: 2 }}
            order={{ base: 7, lg: 8 }}
            variants={gridItemVariants}
          >
            <PartnerButton href="https://pancakeswap.finance" name="PancakeSwap" />
          </MotionGridItem>
          <MotionGridItem
            colSpan={{ base: 6, lg: 2 }}
            order={{ base: 8, lg: 9 }}
            variants={gridItemVariants}
          >
            <PartnerButton href="https://www.bnbchain.org" name="BNB Chain" />
          </MotionGridItem>
        </MotionGrid>
        <Text color="font.secondary" fontSize="sm" mt="xl">
          * Built on Venus, Lista DAO and PancakeSwap v3, all live on BNB Chain mainnet.
        </Text>
      </DefaultPageContainer>
    </Noise>
  )
}
