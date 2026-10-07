'use client'

import NextLink from 'next/link'
import { Box, Divider, HStack, IconButton, Link, Stack, Text, VStack } from '@chakra-ui/react'
import { motion } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { HalyardLogo } from '@/components/brand/HalyardLogo'
import { GithubIcon } from '@/components/icons/GithubIcon'
import { DefaultPageContainer } from '@/components/ui/DefaultPageContainer'
import { staggeredFadeIn } from '@/lib/animations'
import { BSCSCAN_URL, HALYARD_VAULT, VENUS_APP_URL } from '@/lib/halyard/constants'

const REPO = 'https://github.com/wngstnr-code/halyard'
const DEPLOY_TX = '0x9dbc7423799fa642d7edaffa2bd9518edffc766582d52b32d83a7b5d6fc48fe0'

type FooterLink = { label: string; href: string; isExternal?: boolean }

const sections: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Halyard',
    links: [
      { label: 'Home', href: '/' },
      { label: 'Docs', href: `${REPO}#readme`, isExternal: true },
      { label: 'Architecture', href: `${REPO}/blob/main/docs/ARCHITECTURE.md`, isExternal: true },
      { label: 'Source code', href: REPO, isExternal: true },
      { label: 'Report an issue', href: `${REPO}/issues`, isExternal: true },
    ],
  },
  {
    title: 'Contract',
    links: [
      {
        label: 'HalyardVault on BscScan',
        href: `${BSCSCAN_URL}/address/${HALYARD_VAULT}#code`,
        isExternal: true,
      },
      {
        label: 'Sourcify match',
        href: `https://sourcify.dev/#/lookup/${HALYARD_VAULT}`,
        isExternal: true,
      },
      { label: 'Deployment transaction', href: `${BSCSCAN_URL}/tx/${DEPLOY_TX}`, isExternal: true },
    ],
  },
  {
    title: 'Built on',
    links: [
      { label: 'Venus', href: VENUS_APP_URL, isExternal: true },
      { label: 'Lista DAO', href: 'https://lista.org', isExternal: true },
      { label: 'PancakeSwap', href: 'https://pancakeswap.finance', isExternal: true },
      { label: 'BNB Chain', href: 'https://www.bnbchain.org', isExternal: true },
    ],
  },
]

export function Footer() {
  return (
    <Box as="footer" background="background.level0" shadow="innerLg">
      <DefaultPageContainer py="xl">
        <VStack align="start" pt="md" spacing="lg">
          <Stack
            direction={{ base: 'column', lg: 'row' }}
            justify="space-between"
            py={{ base: 'sm', lg: 'md' }}
            spacing={{ base: 'xl', lg: 'md' }}
            w="full"
          >
            <VStack
              align="start"
              color="font.primary"
              spacing="lg"
              width={{ base: 'auto', md: '70%' }}
            >
              <Box w="120px">
                <HalyardLogo />
              </Box>
              <VStack align="start" spacing="sm">
                <Text fontSize="4xl" fontWeight="500" letterSpacing="-0.4px" variant="secondary">
                  Borrow more, safely.
                </Text>
                <Text maxW="420px" sx={{ textWrap: 'balance' }} variant="secondary">
                  Halyard de-risks bStock loans on Venus before the US market closes and whenever
                  health runs low. Unaudited software: use at your own risk.
                </Text>
              </VStack>
            </VStack>
            <Stack
              align="start"
              direction={{ base: 'column', lg: 'row' }}
              justify="space-between"
              spacing={{ base: 'lg', lg: 'md' }}
              w="full"
            >
              {sections.map(section => (
                <VStack align="start" key={section.title} spacing={{ base: 'sm', lg: 'ms' }}>
                  <Text color="font.secondary" fontSize="xs" variant="eyebrow">
                    {section.title}
                  </Text>
                  <VStack align="start" spacing={{ base: 'xs', lg: 'sm' }}>
                    {section.links.map(link => (
                      <Link
                        as={link.isExternal ? Link : NextLink}
                        href={link.href}
                        key={link.href}
                        variant="nav"
                        {...(link.isExternal ? { isExternal: true } : {})}
                      >
                        <HStack gap="xxs">
                          <Box
                            fontSize={{ base: 'sm', md: 'md' }}
                            fontWeight="medium"
                            letterSpacing="-0.25px"
                          >
                            {link.label}
                          </Box>
                          {link.isExternal && (
                            <Box color="grayText">
                              <ArrowUpRight size={12} />
                            </Box>
                          )}
                        </HStack>
                      </Link>
                    ))}
                  </VStack>
                </VStack>
              ))}
            </Stack>
          </Stack>
          <Divider />
          <Stack
            align="start"
            alignItems={{ base: 'none', lg: 'center' }}
            animate="show"
            as={motion.div}
            direction={{ base: 'column', lg: 'row' }}
            gap="md"
            initial="hidden"
            justify="space-between"
            variants={staggeredFadeIn}
            w="full"
          >
            <IconButton
              aria-label="Halyard on GitHub"
              as={Link}
              bg="background.level2"
              h="44px"
              href={REPO}
              isExternal
              isRound
              rounded="full"
              variant="tertiary"
              w="44px"
            >
              <GithubIcon />
            </IconButton>
            <Text color="font.secondary" fontSize={{ base: 'xs', md: 'sm' }}>
              © Halyard 2026
            </Text>
          </Stack>
        </VStack>
      </DefaultPageContainer>
    </Box>
  )
}
