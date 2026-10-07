'use client'

import {
  Box,
  BoxProps,
  Button,
  Card,
  Grid,
  GridItem,
  VStack,
  Text,
  Stack,
  Link,
} from '@chakra-ui/react'
import { DefaultPageContainer } from '@/components/ui/DefaultPageContainer'
import Noise from '@/components/ui/Noise'
import { ArrowUpRight } from 'lucide-react'
import { SandBg } from '@/components/landing/shared/SandBg'
import { RadialPattern } from '@/components/landing/shared/RadialPattern'
import { WordsPullUp } from '@/components/ui/animations/WordsPullUp'

const steps = {
  policy: {
    step: '01',
    title: 'Set your policy once',
    description:
      'Pick a minimum health, a target health, a weekend target, your maximum slippage and which bStocks Halyard may sell. Then grant Halyard delegate rights on Venus. Both are single transactions from your own wallet.',
  },
  borrow: {
    step: '02',
    title: 'Borrow more on Venus',
    description: 'You sign the borrow yourself, on Venus. Halyard never borrows for you.',
  },
  watch: {
    step: '03',
    title: 'Halyard watches the clock',
    description: 'Before a weekend close or when health runs low, a keeper runs protect.',
  },
  revoke: {
    step: '04',
    title: 'Switch it off any time',
    description: 'Clear the policy or the delegation in one transaction.',
  },
}

export function StepBox({
  bgVariant,
  id,
  feature = false,
  ...props
}: BoxProps & {
  bgVariant?: 1 | 2 | 3
  id: keyof typeof steps
  feature?: boolean
}) {
  const step = steps[id]

  return (
    <Box
      background="background.level0"
      overflow="hidden"
      position="relative"
      rounded="md"
      shadow="md"
      {...props}
    >
      {bgVariant && <SandBg variant={bgVariant} />}
      <VStack
        align="start"
        bottom="0"
        justify="space-between"
        left="0"
        p={feature ? 'xl' : 'md'}
        position="absolute"
        right="0"
        spacing="sm"
        top="0"
      >
        <Text
          background="font.special"
          backgroundClip="text"
          fontSize={feature ? '6xl' : '3xl'}
          fontWeight="bold"
          lineHeight={1}
        >
          {step.step}
        </Text>
        <VStack align="start" spacing="xs">
          <Text fontSize={feature ? '3xl' : 'lg'} fontWeight="bold">
            {step.title}
          </Text>
          <Text color="font.secondary" fontSize={feature ? 'lg' : 'md'} maxW="2xl">
            {step.description}
          </Text>
        </VStack>
      </VStack>
    </Box>
  )
}

export function HowItWorks() {
  return (
    <Noise backgroundColor="background.level0WithOpacity" id="how-it-works" position="relative">
      <Box minH="500px" position="absolute" w="full">
        <Box bottom={0} h="500px" left={0} position="absolute" top={0} w="100vw">
          <RadialPattern
            circleCount={8}
            height={700}
            innerHeight={150}
            innerWidth={500}
            padding="15px"
            position="absolute"
            right={-400}
            top={-100}
            width={1000}
          />
        </Box>
      </Box>
      <DefaultPageContainer
        noVerticalPadding
        pb={['md', 'xl']}
        position="relative"
        pt={['3xl', '10rem']}
        zIndex={2}
      >
        <VStack align="start" spacing="lg" w="full">
          <Stack
            align={{ base: 'start', lg: 'end' }}
            direction={{ base: 'column', lg: 'row' }}
            justify="space-between"
            spacing="lg"
            w="full"
          >
            <WordsPullUp
              as="h2"
              color="font.primary"
              fontSize="4xl"
              fontWeight="bold"
              letterSpacing="-0.04rem"
              lineHeight={1}
              text="How it works"
            />
            <Button
              as={Link}
              href="https://github.com/wngstnr-code/halyard/blob/main/docs/ARCHITECTURE.md"
              isExternal
              rightIcon={<ArrowUpRight size="14px" />}
              variant="secondary"
            >
              Read the architecture
            </Button>
          </Stack>
          <Card>
            <StepBox bgVariant={1} feature id="policy" mb="md" minH="320px" />
            <Grid gap="md" templateColumns={{ base: 'repeat(1, 1fr)', lg: 'repeat(3, 1fr)' }}>
              <GridItem>
                <StepBox bgVariant={1} id="borrow" minH="200px" />
              </GridItem>
              <GridItem>
                <StepBox bgVariant={2} id="watch" minH="200px" />
              </GridItem>
              <GridItem>
                <StepBox bgVariant={3} id="revoke" minH="200px" />
              </GridItem>
            </Grid>
          </Card>
        </VStack>
      </DefaultPageContainer>
      <Box minH="500px" position="absolute" w="full" zIndex={-1}>
        <Box bottom={0} h="500px" left={0} position="absolute" top={0} w="100vw">
          <RadialPattern
            circleCount={8}
            height={700}
            innerHeight={150}
            innerWidth={500}
            left={-400}
            padding="15px"
            position="absolute"
            top={-500}
            width={1000}
          />
        </Box>
      </Box>
    </Noise>
  )
}
