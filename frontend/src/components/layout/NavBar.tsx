'use client'

import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  HStack,
  IconButton,
  Link,
  VStack,
  useDisclosure,
} from '@chakra-ui/react'
import { HalyardConnectButton } from '@/lib/halyard/HalyardConnectButton'
import { fadeIn, staggeredFadeIn } from '@/lib/animations'
import { clamp } from 'lodash'
import { ArrowUpRight, Menu } from 'lucide-react'
import { motion, useMotionTemplate, useMotionValue, useScroll, useTransform } from 'motion/react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { NavLogo } from '@/components/layout/NavLogo'

type NavLink = { href: string; label: string; isExternal?: boolean }

const DOCS: NavLink = {
  href: 'https://github.com/wngstnr-code/halyard#readme',
  label: 'Docs',
  isExternal: true,
}

// On the landing page the links jump to its sections.
const landingLinks: NavLink[] = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#fees', label: 'Fees' },
  { href: '#security', label: 'Security' },
  DOCS,
]

// App pages are added here as they ship.
const appLinks: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/protect', label: 'Protect' },
  { href: '/simulator', label: 'Simulator' },
  { href: '/keeper', label: 'Keeper' },
  DOCS,
]

function useBoundedScroll(threshold: number) {
  const { scrollY } = useScroll()
  const scrollYBounded = useMotionValue(0)
  const scrollYBoundedProgress = useTransform(scrollYBounded, [0, threshold], [0, 1])

  useEffect(() => {
    return scrollY.on('change', current => {
      const previous = scrollY.getPrevious() ?? current
      scrollYBounded.set(clamp(scrollYBounded.get() + current - previous, 0, threshold))
    })
  }, [threshold, scrollY, scrollYBounded])

  return scrollYBoundedProgress
}

function LinkLabel({ link }: { link: NavLink }) {
  return (
    <HStack gap="xxs">
      <Box as="span">{link.label}</Box>
      {link.isExternal && (
        <Box as="span" color="grayText" position="relative" top="-4px">
          <ArrowUpRight size={12} />
        </Box>
      )}
    </HStack>
  )
}

function MobileMenu({ links }: { links: NavLink[] }) {
  const { isOpen, onOpen, onClose } = useDisclosure()

  return (
    <>
      <IconButton
        aria-label="Open menu"
        icon={<Menu size={18} />}
        onClick={onOpen}
        variant="tertiary"
      />
      <Drawer isOpen={isOpen} onClose={onClose} placement="right">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>
            <NavLogo />
          </DrawerHeader>
          <DrawerBody>
            <VStack align="start" fontSize="xl" fontWeight="medium" spacing="md">
              {links.map(link => (
                <Link
                  href={link.href}
                  isExternal={link.isExternal}
                  key={link.href}
                  onClick={onClose}
                  variant="nav"
                >
                  <LinkLabel link={link} />
                </Link>
              ))}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  )
}

export function HalyardNavBar() {
  const pathname = usePathname()
  const isLanding = pathname === '/'
  const links = isLanding ? landingLinks : appLinks
  const [showShadow, setShowShadow] = useState(false)

  useEffect(() => {
    const handleScroll = () => setShowShadow(window.scrollY > 72)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const progress = useTransform(useBoundedScroll(72), [0, 0.75, 1], [0, 0, 1])
  const blur = useTransform(progress, [0, 1], [10, 0])
  const backdropFilter = useMotionTemplate`blur(${blur}px)`
  const top = useTransform(progress, [0, 1], [0, -72])
  const opacity = useTransform(progress, [0, 1], [1, 0])

  useEffect(() => {
    document.documentElement.style.setProperty('--navbar-height', '72px')
  }, [])

  return (
    <Box
      _before={{
        content: '""',
        position: 'absolute',
        inset: 0,
        bg: showShadow ? 'background.level1' : 'none',
        opacity: 0.5,
        zIndex: -1,
      }}
      as={motion.div}
      boxShadow={showShadow ? 'lg' : 'none'}
      pos="fixed"
      style={{ backdropFilter, top, opacity }}
      top="0"
      transition="all 0.3s ease-in-out"
      w="full"
      zIndex={100}
    >
      <HStack as="nav" justify="space-between" padding={{ base: 'sm', md: 'md' }}>
        <HStack
          animate="show"
          as={motion.div}
          initial={false}
          spacing="xl"
          variants={staggeredFadeIn}
        >
          <NavLogo />
          <HStack display={{ base: 'none', lg: 'flex' }} fontWeight="medium" spacing="lg">
            {links.map(link => (
              <Box as={motion.div} key={link.href} variants={fadeIn}>
                <Link
                  as={link.isExternal || isLanding ? undefined : NextLink}
                  color={pathname === link.href ? 'font.highlight' : 'font.primary'}
                  href={link.href}
                  isExternal={link.isExternal}
                  variant="nav"
                >
                  <LinkLabel link={link} />
                </Link>
              </Box>
            ))}
          </HStack>
        </HStack>
        <HStack spacing="sm">
          {isLanding ? (
            <Button as={NextLink} href="/dashboard" px={7} size="md" variant="primary">
              Launch app
            </Button>
          ) : (
            <HalyardConnectButton />
          )}
          <Box display={{ base: 'block', lg: 'none' }}>
            <MobileMenu links={links} />
          </Box>
        </HStack>
      </HStack>
    </Box>
  )
}
