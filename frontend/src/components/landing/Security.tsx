'use client'

import {
  VStack,
  Button,
  Text,
  GridItem,
  Grid,
  Box,
  Center,
  Link,
  Stack,
  IconButton,
  Heading,
} from '@chakra-ui/react'
import { DefaultPageContainer } from '@/components/ui/DefaultPageContainer'
import Noise from '@/components/ui/Noise'
import { ArrowUpRight } from 'lucide-react'
import { Picture } from '@/components/ui/Picture'
import { WordsPullUp } from '@/components/ui/animations/WordsPullUp'
import { BlurIn } from '@/components/ui/animations/BlurIn'
import { motion } from 'motion/react'
import { ReactNode, useState, useMemo, memo } from 'react'

const MotionBox = motion(Box)

const HOVER_ANIMATION = {
  scale: 1.0,
  transition: { duration: 0.3 },
}

const ARROW_ICON = <ArrowUpRight size="14px" />

const CENTER_HOVER_STYLES = { transform: 'scale(1.12)', color: 'font.maxContrast' }
const ICON_BUTTON_HOVER_STYLES = { opacity: 1 }

const GRADIENT_OVERLAYS = [
  {
    background: 'linear-gradient(90deg, #0F3562 50%, #396295 75%, #85A7D3 100%)',
    blendMode: 'overlay',
  },
  {
    background: 'linear-gradient(90deg, rgba(133, 167, 211, 0.00) 0.08%, #396295 90%)',
    blendMode: 'soft-light',
  },
  {
    background: 'linear-gradient(90deg, #CDDEF4 0%, #5B82B5 98.03%)',
    blendMode: 'soft-light',
  },
] as const

function SourceLabel({ name, note }: { name: string; note: string }) {
  return (
    <VStack spacing="0">
      <Text color="inherit" fontSize="3xl" fontWeight="bold" letterSpacing="-0.04rem">
        {name}
      </Text>
      <Text color="font.secondary" fontSize="sm">
        {note}
      </Text>
    </VStack>
  )
}

const AuditCard = memo(function AuditCard({
  href,
  logo,
  bgImageName,
  gradientIndex,
}: {
  href: string
  logo: ReactNode
  bgImageName: string
  gradientIndex: number
}) {
  const [isHovered, setIsHovered] = useState(false)

  const gradientOverlay = useMemo(() => GRADIENT_OVERLAYS[gradientIndex], [gradientIndex])

  return (
    <Link cursor="pointer" href={href} isExternal>
      <MotionBox
        _hover={{ shadow: 'xl' }}
        data-group
        minH="180px"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        overflow="hidden"
        position="relative"
        role="group"
        rounded="lg"
        shadow="2xl"
        whileHover={HOVER_ANIMATION}
      >
        {/* Background with rock texture and gradient overlay */}
        <Box
          h="full"
          left="0"
          overflow="hidden"
          pointerEvents="none"
          position="absolute"
          top="0"
          w="full"
          zIndex="0"
        >
          <Picture
            altText="Background texture"
            defaultImgType="png"
            directory="/images/textures/rocks/slate-portrait/"
            height="100%"
            imgAvif
            imgAvifDark
            imgJpg
            imgJpgDark
            imgName={`slate${bgImageName}`}
            width="100%"
          />
          {/* Flash overlay on initial hover */}
          <Box
            bg="white"
            h="full"
            left="0"
            opacity={0}
            position="absolute"
            sx={{
              animation: isHovered ? 'flash 0.3s ease-out' : 'none',
              '@keyframes flash': {
                '0%': { opacity: 0.15 },
                '100%': { opacity: 0 },
              },
            }}
            top="0"
            w="full"
            zIndex="1"
          />
          {/* Gradient overlay with blend mode shown on hover */}
          <Box
            background={gradientOverlay?.background}
            h="full"
            left="0"
            opacity={isHovered ? 1 : 0}
            position="absolute"
            sx={{
              mixBlendMode: gradientOverlay?.blendMode,
            }}
            top="0"
            transition="opacity 0.5s var(--ease-out-cubic) 0.05s"
            w="full"
            zIndex="3"
          />
        </Box>
        <Center
          _groupHover={CENTER_HOVER_STYLES}
          _hover={{ shadow: 'innerRockShadow' }}
          color="font.primary"
          h="full"
          left="0"
          position="absolute"
          shadow="innerRockShadowSm"
          top="0"
          transition="transform 1s var(--ease-out-cubic), color 1s var(--ease-out-cubic)"
          w="full"
          zIndex="1"
        >
          {logo}
        </Center>
        <IconButton
          _groupHover={ICON_BUTTON_HOVER_STYLES}
          aria-label="View report"
          h="40px"
          icon={ARROW_ICON}
          isRound
          opacity={0}
          position="absolute"
          right="md"
          shadow="2xl"
          top="md"
          transition="opacity 0.3s ease"
          w="40px"
          zIndex="2"
        />
      </MotionBox>
    </Link>
  )
})

export function Security() {
  const bscscanLogo = useMemo(() => <SourceLabel name="BscScan" note="Verified source" />, [])
  const sourcifyLogo = useMemo(() => <SourceLabel name="Sourcify" note="Exact match" />, [])
  const githubLogo = useMemo(() => <SourceLabel name="GitHub" note="Code, tests and docs" />, [])

  return (
    <Noise backgroundColor="background.level0WithOpacity" id="security">
      <DefaultPageContainer noVerticalPadding pb={['3xl', '6rem']} pt={['md', 'xl']}>
        <VStack align="start" spacing="lg" w="full">
          <Stack
            align="end"
            alignItems={{ base: 'start', lg: 'end' }}
            direction={{ base: 'column', lg: 'row' }}
            justify="space-between"
            spacing="lg"
            w="full"
          >
            <VStack align="start" spacing="lg">
              <BlurIn delay={0.4}>
                <Text
                  background="font.special"
                  backgroundClip="text"
                  fontSize="sm"
                  variant="eyebrow"
                >
                  SAFETY & SECURITY
                </Text>
              </BlurIn>
              <WordsPullUp
                as="h2"
                color="font.primary"
                fontSize="4xl"
                fontWeight="bold"
                letterSpacing="-0.04rem"
                lineHeight={1}
                text="Read every line"
              />
            </VStack>
            <Button
              as={Link}
              href="https://github.com/wngstnr-code/halyard/tree/main/contracts"
              isExternal
              rightIcon={ARROW_ICON}
              variant="secondary"
            >
              View source
            </Button>
          </Stack>
          <Grid
            gap="md"
            templateColumns={{ base: 'repeat(1, 1fr)', lg: 'repeat(3, 1fr)' }}
            w="full"
          >
            <GridItem>
              <AuditCard
                bgImageName="0"
                gradientIndex={0}
                href="https://bscscan.com/address/0x6137aCd41F9828dE0836EA5a776e95184bF7Df10#code"
                logo={bscscanLogo}
              />
            </GridItem>
            <GridItem>
              <AuditCard
                bgImageName="1"
                gradientIndex={1}
                href="https://sourcify.dev/#/lookup/0x6137aCd41F9828dE0836EA5a776e95184bF7Df10"
                logo={sourcifyLogo}
              />
            </GridItem>
            <GridItem>
              <AuditCard
                bgImageName="2"
                gradientIndex={2}
                href="https://github.com/wngstnr-code/halyard"
                logo={githubLogo}
              />
            </GridItem>
          </Grid>
          <VStack align="start" mt="xs" spacing="xs">
            <Heading fontSize="lg" pb="xs" variant="h6">
              Not audited yet
            </Heading>
            <Text color="font.secondary">
              Halyard is new and has not had a third-party audit. Its 21 tests include mainnet fork
              tests against live Venus, Lista and PancakeSwap state. Found something? Open an issue
              on{' '}
              <Link
                alignItems="center"
                display="inline-flex"
                gap="2px"
                href="https://github.com/wngstnr-code/halyard/issues"
                isExternal
              >
                GitHub
                {ARROW_ICON}
              </Link>
            </Text>
          </VStack>
        </VStack>
      </DefaultPageContainer>
    </Noise>
  )
}
