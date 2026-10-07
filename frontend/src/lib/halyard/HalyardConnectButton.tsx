'use client'

import { Button, HStack, Text } from '@chakra-ui/react'
import { ConnectButton } from '@rainbow-me/rainbowkit'

// Connect, wrong-network and account states in the Halyard navbar style.
export function HalyardConnectButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, mounted, openAccountModal, openChainModal, openConnectModal }) => {
        if (!mounted) return <Button isLoading size="md" variant="primary" />

        if (!account || !chain) {
          return (
            <Button onClick={openConnectModal} px={6} size="md" variant="primary">
              Connect wallet
            </Button>
          )
        }

        if (chain.unsupported) {
          return (
            <Button onClick={openChainModal} size="md" variant="secondary">
              Switch to BNB Chain
            </Button>
          )
        }

        return (
          <Button onClick={openAccountModal} size="md" variant="tertiary">
            <HStack spacing="sm">
              <Text as="span" bg="green.500" h="8px" rounded="full" w="8px" />
              <Text as="span">{account.displayName}</Text>
            </HStack>
          </Button>
        )
      }}
    </ConnectButton.Custom>
  )
}
