'use client'

import { Button, Center, Heading, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'

export default function NotFound() {
  return (
    <Center minH="100vh" px="md">
      <VStack spacing="md" textAlign="center">
        <Heading size="xl">Page not found</Heading>
        <Text color="font.secondary">This page does not exist.</Text>
        <Button as={NextLink} href="/" variant="primary">
          Back to Halyard
        </Button>
      </VStack>
    </Center>
  )
}
