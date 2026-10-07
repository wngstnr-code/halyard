'use client'

/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Box, Card, Grid, GridItem, HStack, IconButton, Text, VStack, Link } from '@chakra-ui/react'
import { DefaultPageContainer } from '@/components/ui/DefaultPageContainer'

// @ts-ignore
import { ArrowUpRight, Code } from 'lucide-react'
import { AddIcon, MinusIcon } from '@chakra-ui/icons'
import { useState } from 'react'
import Noise from '@/components/ui/Noise'
import { AnimatePresence, motion } from 'motion/react'
import { RadialPattern } from '@/components/landing/shared/RadialPattern'
import { useBreakpoints } from '@/hooks/useBreakpoints'
import { WordsPullUp } from '@/components/ui/animations/WordsPullUp'
import { FadeIn } from '@/components/ui/animations/FadeIn'

const contracts = [
  {
    title: 'HalyardVault',
    label: 'Smart contract',
    url: 'https://bscscan.com/address/0x6137aCd41F9828dE0836EA5a776e95184bF7Df10#code',
    shortDescription: 'Plans and runs every de-risk',
    description:
      'HalyardVault stores your policy and decides when to act. Anyone can call protect, but the contract alone picks the trigger, the collateral to sell and the amounts, so a caller cannot push harmful parameters.\n\nIt is immutable, with no owner and no admin keys. The fee (0.3%), the keeper tip (0.1%) and the policy limits are constants in the code.',
  },
  {
    title: 'MarketClock',
    label: 'Smart contract',
    url: 'https://github.com/wngstnr-code/halyard/blob/main/contracts/src/MarketClock.sol',
    shortDescription: 'Knows when Wall Street is open',
    description:
      'MarketClock is an on-chain NYSE calendar: US Eastern time with daylight saving, the 2026 and 2027 holidays and the early closes.\n\nIt opens a 60-minute window before every close that leads into a weekend or a holiday. That window is when the pre-close trigger may run, enforced by the contract, not by a server.',
  },
  {
    title: 'Venus Core Pool',
    label: 'Lending market',
    url: 'https://app.venus.io',
    shortDescription: 'Where your loan stays',
    description:
      'You supply bStocks and borrow on Venus exactly as before. Halyard only needs delegate rights, granted with updateDelegate, to repay your debt and redeem collateral on your behalf.\n\nVenus delegation would also allow borrowing for you. HalyardVault has no code path that borrows, so it can only make your debt smaller. Remove the delegation any time to switch Halyard off.',
  },
  {
    title: 'Lista and PancakeSwap',
    label: 'Liquidity',
    url: 'https://pancakeswap.finance',
    shortDescription: 'Flash loans in, bStocks out',
    description:
      'Lista Moolah lends the USDT for each de-risk through a fee-free flash loan, so you do not need USDT in your wallet.\n\nThe redeemed bStock is sold on the PancakeSwap v3 TSLAB, NVDAB or SPCXB pool against USDT, with a minimum output set by your slippage limit.',
  },
]

function ContractCard({
  contract,
  isExpanded,
  onToggle,
}: {
  contract: (typeof contracts)[number]
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <Card h="full" w="full">
      <VStack alignItems="start" spacing="lg" w="full">
        <HStack alignItems="center" justifyContent="space-between" w="full">
          <HStack>
            <Box color="font.secondary">
              <Code size={16} />
            </Box>
            <Text color="font.secondary">{contract.label}</Text>
          </HStack>
          <IconButton
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            fontSize="12px"
            h="30px"
            icon={isExpanded ? <MinusIcon /> : <AddIcon />}
            isRound
            onClick={onToggle}
            size="xs"
            variant="primary"
            w="30px"
          />
        </HStack>
        <VStack alignItems="start" mb="lg">
          <HStack justifyContent="space-between" w="full">
            <Text fontSize="xl" fontWeight="bold">
              {contract.title}
            </Text>
            {isExpanded && (
              <Link href={contract.url} isExternal>
                <HStack spacing={0}>
                  <span>Learn more</span>
                  <ArrowUpRight size={16} />
                </HStack>
              </Link>
            )}
          </HStack>

          <Text color="font.secondary" sx={{ textWrap: 'balance' }} w="80%">
            {contract.shortDescription}
          </Text>
          {isExpanded && (
            <Text color="font.secondary" fontSize="lg" mt="sm" whiteSpace="pre-line">
              {contract.description}
            </Text>
          )}
        </VStack>
      </VStack>
    </Card>
  )
}

const MotionGridItem = motion(GridItem)

export function MovingParts() {
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const { isMobile } = useBreakpoints()

  return (
    <Noise>
      <Box position="relative">
        <Box
          bottom={0}
          h="700px"
          left={0}
          position="absolute"
          right={0}
          top="10rem"
          w={{ base: '80vw', lg: '45vw' }}
        >
          <RadialPattern
            circleCount={8}
            height={700}
            innerHeight={150}
            innerWidth={500}
            left={-400}
            padding="15px"
            position="absolute"
            top={0}
            width={1000}
          />
        </Box>
        <DefaultPageContainer
          minH="800px"
          noVerticalPadding
          position="relative"
          py={['3xl', '10rem']}
        >
          <Grid gap="xl" templateColumns={{ base: 'repeat(1, 1fr)', lg: 'repeat(2, 1fr)' }}>
            {!isMobile && <GridItem />}
            <GridItem borderRadius="lg">
              <VStack alignItems="start" spacing="md">
                <WordsPullUp
                  as="h3"
                  color="font.primary"
                  fontSize="4xl"
                  fontWeight="bold"
                  letterSpacing="-0.04rem"
                  lineHeight={1}
                  text="Moving parts"
                />
                <FadeIn delay={0.2} direction="up" duration={0.6}>
                  <Text color="font.secondary" fontSize="lg">
                    Halyard is one immutable contract and an on-chain market calendar, wired into
                    protocols already live on BNB Chain. There is no server in the loop and no one
                    holds keys over your funds.
                  </Text>
                </FadeIn>
              </VStack>
              <AnimatePresence initial={false} mode="wait">
                <Grid
                  gap="md"
                  mt="2xl"
                  position="relative"
                  templateColumns={{ base: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' }}
                  templateRows="repeat(2, minmax(200px, auto))"
                >
                  {contracts.map((contract, index) => (
                    <MotionGridItem
                      animate={{
                        opacity: expandedCard && expandedCard !== contract.title ? 0 : 1,
                        scale: 1,
                      }}
                      exit={{
                        opacity: 0,
                        scale: 0,
                      }}
                      gridColumn={expandedCard === contract.title ? 'span 2' : 'auto'}
                      gridRow={expandedCard === contract.title ? 'span 2' : 'auto'}
                      initial={{
                        opacity: 1,
                        scale: 1,
                      }}
                      key={contract.title}
                      layout
                      order={expandedCard && expandedCard == contract.title ? 0 : index + 1}
                      style={{
                        display:
                          expandedCard && expandedCard !== contract.title ? 'hidden' : 'block',
                        position:
                          expandedCard && expandedCard !== contract.title ? 'absolute' : 'relative',
                      }}
                      transition={{
                        layout: {
                          type: 'spring',
                          bounce: 0.2,
                          duration: 0.4,
                        },
                        opacity: { duration: 0.2 },
                      }}
                    >
                      <ContractCard
                        contract={contract}
                        isExpanded={expandedCard === contract.title}
                        onToggle={() =>
                          setExpandedCard(expandedCard === contract.title ? null : contract.title)
                        }
                      />
                    </MotionGridItem>
                  ))}
                </Grid>
              </AnimatePresence>
            </GridItem>
          </Grid>
        </DefaultPageContainer>
      </Box>
    </Noise>
  )
}
