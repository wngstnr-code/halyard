'use client'

import { Box, HStack, Link, Text } from '@chakra-ui/react'
import { ArrowUpRight } from 'lucide-react'
import { BSCSCAN_URL } from '@/lib/halyard/constants'
import { TxState } from '@/lib/halyard/useHalyardTx'

export function TxStatus({ tx }: { tx: TxState | null }) {
  if (!tx) return null

  return (
    <Box bg="background.level1" fontSize="sm" p="sm" rounded="md">
      <HStack justify="space-between" wrap="wrap">
        <Text>
          {tx.label}:{' '}
          {tx.status === 'signing'
            ? 'confirm in your wallet…'
            : tx.status === 'pending'
              ? 'waiting for BNB Chain…'
              : tx.status === 'success'
                ? 'confirmed'
                : `failed${tx.error ? `: ${tx.error}` : ''}`}
        </Text>
        {tx.hash && (
          <Link href={`${BSCSCAN_URL}/tx/${tx.hash}`} isExternal>
            <HStack spacing="xxs">
              <Text>View on BscScan</Text>
              <ArrowUpRight size={12} />
            </HStack>
          </Link>
        )}
      </HStack>
    </Box>
  )
}
