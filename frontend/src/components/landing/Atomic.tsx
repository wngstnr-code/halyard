'use client'

import { Box, Card, Center, Stack, Text, VStack } from '@chakra-ui/react'
import { DefaultPageContainer } from '@/components/ui/DefaultPageContainer'
import Noise from '@/components/ui/Noise'
import { useBreakpoints } from '@/hooks/useBreakpoints'
import { RadialPattern } from '@/components/landing/shared/RadialPattern'
import { WordsPullUp } from '@/components/ui/animations/WordsPullUp'
import { FadeIn } from '@/components/ui/animations/FadeIn'
import { BlurIn } from '@/components/ui/animations/BlurIn'
import { useEffect, useRef, useState } from 'react'
import Prism from 'prismjs'
import '@/components/landing/code-theme.css'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-solidity'
import { useInView } from 'motion/react'

const TYPING_SPEED = 20 // milliseconds per character

const codeSnippet = `// HalyardVault.onMoolahFlashLoan (excerpt)
// 1. Lista Moolah lent \`assets\` USDT, fee free
// 2. Pay down the user's Venus debt
vUsdt.repayBorrowBehalf(user, assets);
// 3. Redeem a slice of bStock collateral
IVToken(plan.vCollateral)
  .redeemUnderlyingBehalf(user, plan.seize);
// 4. Sell it for USDT on PancakeSwap v3
uint256 received = router.exactInputSingle(params);
uint256 needed = assets + plan.fee + plan.tip;
if (received < needed)
  revert InsufficientProceeds(received, needed);
// 5. Moolah pulls the loan back
usdt.forceApprove(address(moolah), assets);`

export function Atomic() {
  const { isMobile } = useBreakpoints()
  const [currentIndex, setCurrentIndex] = useState(-1)
  const codeBoxRef = useRef(null)
  const isInView = useInView(codeBoxRef, { once: true, margin: '-100px' })

  const displayedText =
    currentIndex < 0
      ? ''
      : Prism.highlight(
          codeSnippet.slice(0, currentIndex + 1),
          Prism.languages.solidity as Prism.Grammar,
          'solidity'
        )

  useEffect(() => {
    if (!isInView) return

    const intervalId = setInterval(() => {
      setCurrentIndex(prevIndex => {
        if (prevIndex >= codeSnippet.length - 1) {
          clearInterval(intervalId)
          return prevIndex
        }

        return prevIndex + 1
      })
    }, TYPING_SPEED)

    return () => clearInterval(intervalId)
  }, [isInView])

  return (
    <Noise backgroundColor="background.level0WithOpacity" position="relative">
      <DefaultPageContainer noVerticalPadding position="relative" py={['3xl', '10rem']}>
        <VStack alignItems="center" spacing="md" textAlign="center">
          <WordsPullUp
            as="h2"
            color="font.primary"
            fontSize="4xl"
            fontWeight="bold"
            letterSpacing="-0.04rem"
            lineHeight={1}
            text="One transaction, start to finish."
          />
          <FadeIn delay={0.2} direction="up" duration={0.6}>
            <Text color="font.secondary" fontSize="lg" maxW="2xl">
              Every de-risk is atomic. Halyard takes a free USDT flash loan, pays down your Venus
              debt, redeems a slice of bStock, sells it on PancakeSwap v3 and repays the loan. If
              any step fails, nothing happens.
            </Text>
          </FadeIn>
        </VStack>
        <Card mt="2xl">
          <Box background="background.level0" minH="500px" position="relative" shadow="innerXl">
            <Box
              bottom={0}
              h="100%"
              left={0}
              opacity={0.3}
              overflow="hidden"
              position="absolute"
              right={0}
              shadow="innerXl"
              top={0}
              w="100%"
            >
              <RadialPattern
                circleCount={12}
                height={800}
                innerHeight={100}
                innerWidth={100}
                intensity={2}
                left="calc(50% - 400px)"
                padding="15px"
                position="absolute"
                top="calc(50% - 400px)"
                width={800}
              />
            </Box>
            <Center px={{ base: 'xs', lg: '2xl' }} py="2xl">
              <Stack
                alignItems="center"
                direction={{ base: 'column', lg: 'row' }}
                gap="2xl"
                w="full"
              >
                <Box w="full">
                  <VStack alignItems="start" px={{ base: 'md', lg: '0' }} spacing="lg">
                    <BlurIn delay={0.4}>
                      <Text
                        background="font.special"
                        backgroundClip="text"
                        fontSize="sm"
                        variant="eyebrow"
                      >
                        Atomic
                      </Text>
                    </BlurIn>
                    <WordsPullUp
                      as="h3"
                      color="font.primary"
                      fontSize={{ base: '2xl', lg: '4xl' }}
                      fontWeight="bold"
                      letterSpacing="-0.04rem"
                      lineHeight={1}
                      pr={{ base: 'xxs', lg: '0.9' }}
                      text="No half-finished rescues"
                    />
                    <FadeIn delay={0.2} direction="up" duration={0.6}>
                      <Text color="font.secondary">
                        The vault reads your health before and after. If the swap returns less than
                        it needs, or your health does not improve, the whole transaction reverts and
                        your position stays exactly as it was. This is the code that runs inside the
                        flash loan.
                      </Text>
                    </FadeIn>
                  </VStack>
                </Box>
                <Box w="full">
                  <Card ref={codeBoxRef}>
                    <pre
                      className="language-solidity"
                      style={{
                        padding: '2rem',
                        borderRadius: '8px',
                        // Fixed size so the frame does not grow while the snippet types out
                        height: '340px',
                        margin: 0,
                        overflow: 'auto',
                      }}
                    >
                      <code
                        className="language-solidity"
                        dangerouslySetInnerHTML={{ __html: displayedText }}
                        style={{
                          whiteSpace: isMobile ? 'pre-line' : 'pre',
                          wordBreak: isMobile ? 'break-word' : 'normal',
                        }}
                      />
                    </pre>
                  </Card>
                </Box>
              </Stack>
            </Center>
          </Box>
        </Card>
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
