/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client'

import { Box, Button, Center, Heading, Stack, Text, VStack, Link } from '@chakra-ui/react'
import Noise from '@/components/ui/Noise'
import { AnimatePresence, motion, useInView } from 'motion/react'
import Image from 'next/image'
import { DefaultPageContainer } from '@/components/ui/DefaultPageContainer'
import { ArrowUpRight } from 'lucide-react'

// @ts-ignore
import bgDarkSrc from '@/components/landing/images/hero-bg-dark.png'
import { useRef } from 'react'
import { WordsPullUp } from '@/components/ui/animations/WordsPullUp'
import { MotionButtonProps } from '@/components/landing/types'

const MotionText = motion(Text)
const MotionHeading = motion(Heading)
const MotionButton = motion(Button) as React.FC<MotionButtonProps>

export function Hero() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  return (
    <Noise position="relative">
      <Box bottom={0} h="100vh" left={0} minH="600px" position="absolute" right={0} top={0}>
        <AnimatePresence>
          <motion.div
            animate={isInView ? { opacity: 0.55, willChange: 'opacity' } : {}}
            exit={{ opacity: 0 }}
            initial={{ opacity: 0.01 }}
            ref={ref}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            transition={{ duration: 3, ease: 'easeInOut' }}
          >
            <Image
              alt="background"
              fill
              sizes="100vw"
              src={bgDarkSrc}
              style={{ objectFit: 'cover', objectPosition: 'center' }}
            />
          </motion.div>
        </AnimatePresence>
      </Box>

      <DefaultPageContainer flex="1" h="100vh" minH="600px" noVerticalPadding position="relative">
        <Center h="full" justifyContent="start">
          <VStack alignItems="start" spacing="xl">
            <MotionText
              animate={
                isInView
                  ? {
                      opacity: 1,
                      filter: 'blur(0px)',
                      willChange: 'opacity, filter',
                    }
                  : {}
              }
              background="font.special"
              backgroundClip="text"
              fontSize="sm"
              initial={{ opacity: 0, filter: 'blur(3px)' }}
              transition={{ delay: 0.7, duration: 0.3, delayChildren: 0.5, ease: 'easeInOut' }}
              variant="eyebrow"
            >
              Live on BNB Chain
            </MotionText>

            <WordsPullUp
              as="h1"
              color="font.primary"
              delay={0.7}
              fontSize={{ base: '4xl', md: '6xl' }}
              fontWeight="bold"
              letterSpacing="-2px"
              lineHeight={1}
              pr="2"
              text="Borrow more on your bStocks"
            />
            <MotionHeading
              animate={
                isInView
                  ? {
                      opacity: 1,
                      y: 0,
                      filter: 'blur(0px)',
                      willChange: 'transform, opacity, filter',
                    }
                  : {}
              }
              as="h2"
              color="font.secondary"
              fontSize={{ base: 'xl', md: '2xl' }}
              fontWeight="thin"
              initial={{ opacity: 0, y: 10, filter: 'blur(3px)' }}
              maxW="700px"
              transition={{ duration: 1, delay: 0.9, ease: 'easeInOut' }}
              w="full"
            >
              Halyard trims your Venus position before the US market closes and whenever health runs
              low, so you can borrow closer to the limit without waking up liquidated.
            </MotionHeading>
            <Stack alignItems={{ base: 'start', md: 'center' }} direction="row" mt="0" spacing="ms">
              <MotionButton
                animate={
                  isInView
                    ? {
                        opacity: 1,
                        willChange: 'opacity',
                      }
                    : {}
                }
                as={Link}
                href="https://github.com/wngstnr-code/halyard#readme"
                initial={{ opacity: 0 }}
                rel="noopener"
                rightIcon={<ArrowUpRight size="14px" />}
                size="lg"
                target="_blank"
                transition={{ duration: 2, delay: 1.2 }}
                variant="primary"
              >
                Read the docs
              </MotionButton>

              <MotionButton
                animate={
                  isInView
                    ? {
                        opacity: 1,
                        willChange: 'opacity',
                      }
                    : {}
                }
                as={Link}
                href="https://bscscan.com/address/0x6137aCd41F9828dE0836EA5a776e95184bF7Df10#code"
                initial={{ opacity: 0 }}
                rel="noopener"
                rightIcon={<ArrowUpRight size="14px" />}
                size="lg"
                target="_blank"
                transition={{ duration: 2, delay: 1.2 }}
                variant="secondary"
              >
                View contract
              </MotionButton>
            </Stack>
            <MotionText
              animate={isInView ? { opacity: 1 } : {}}
              color="font.secondary"
              fontSize="sm"
              initial={{ opacity: 0 }}
              mt="md"
              transition={{ duration: 2, delay: 1.4 }}
            >
              Works with TSLAB, NVDAB and SPCXB on the Venus Core Pool. Your collateral never leaves
              Venus.
            </MotionText>
          </VStack>
        </Center>
      </DefaultPageContainer>
      <Box
        bgGradient="linear(transparent 0%, background.level0 50%, transparent 100%)"
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
