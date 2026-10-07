'use client'

import { fadeIn } from '@/lib/animations'
import { HalyardMark } from '@/components/brand/HalyardMark'
import { HalyardLogo } from '@/components/brand/HalyardLogo'
import { Box, Link } from '@chakra-ui/react'
import { motion } from 'motion/react'
import NextLink from 'next/link'

export function NavLogo() {
  return (
    <Box as={motion.div} variants={fadeIn}>
      <Link as={NextLink} href="/" prefetch variant="nav">
        <Box>
          <Box display={{ base: 'block', md: 'none' }}>
            <HalyardMark width="26px" />
          </Box>
          <Box display={{ base: 'none', md: 'block' }}>
            <HalyardLogo width="106px" />
          </Box>
        </Box>
      </Link>
    </Box>
  )
}
