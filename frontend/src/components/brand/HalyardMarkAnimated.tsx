'use client'

import { useColorModeValue } from '@chakra-ui/react'
import { motion } from 'motion/react'

export function HalyardMarkAnimated({
  iconColor,
  noShadow,
  size = 128,
}: {
  iconColor?: string
  noShadow?: boolean
  size?: number
}) {
  const _iconColor = useColorModeValue('#0F3562', '#88B6E6')

  return (
    <motion.div
      style={{
        filter: noShadow ? 'none' : 'drop-shadow(0 0 20px rgba(0, 0, 0, 0.3))',
        padding: '16px',
        borderRadius: '50%',
      }}
    >
      <motion.svg
        fill="none"
        height={size}
        viewBox="0 0 48 48"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Halyard mark: mast and hull stay still, the sails are hoisted */}
        <path d="M24 5V41" stroke={iconColor || _iconColor} strokeLinecap="round" strokeWidth="3" />
        <path
          d="M8 42Q24 47 40 42"
          fill="none"
          stroke={iconColor || _iconColor}
          strokeLinecap="round"
          strokeWidth="3"
        />
        {/* Main sail */}
        <motion.path
          animate={{ y: [0, -2, 0] }}
          d="M27 9L40 37H27Z"
          fill={iconColor || _iconColor}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
            repeatDelay: 0.2,
            delay: 1,
          }}
        />
        {/* Jib */}
        <motion.path
          animate={{ y: [0, -1.2, 0] }}
          d="M21 15L11 37H21Z"
          fill={iconColor || _iconColor}
          opacity={0.45}
          transition={{
            duration: 3.4,
            repeat: Infinity,
            ease: 'easeInOut',
            repeatDelay: 0.2,
            delay: 1,
          }}
        />
      </motion.svg>
    </motion.div>
  )
}
