'use client'

import {
  Box,
  Button,
  Card,
  Center,
  Grid,
  HStack,
  Heading,
  IconButton,
  Input,
  Link,
  Skeleton,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  VStack,
} from '@chakra-ui/react'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { ArrowUpRight, RefreshCw, X } from 'lucide-react'
import NextLink from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, ReactNode, useState } from 'react'
import { Address, isAddress } from 'viem'
// Halyard pages run on their own BSC-only wagmi config, not the template's UserAccountProvider.
// eslint-disable-next-line no-restricted-imports
import { useAccount } from 'wagmi'
import {
  BSCSCAN_URL,
  HEADROOM_TARGETS,
  VENUS_APP_URL,
  bStockByVToken,
} from '@/lib/halyard/constants'
import {
  STATUS_COLORS,
  fmtAmount,
  fmtBStockAmount,
  fmtCountdown,
  fmtDate,
  fmtHealth,
  fmtLocalTime,
  fmtPct,
  fmtUsd,
  healthColor,
  shortAddress,
} from '@/lib/halyard/format'
import { useNow, useOnChainMarketState, usePosition, useProtections } from '@/lib/halyard/hooks'
import { PRE_CLOSE_SECONDS, currentOrNextSession, nextGapSession } from '@/lib/halyard/marketClock'
import { Position, headroomAt, liquidationDrop } from '@/lib/halyard/position'

export function Label({ children }: { children: ReactNode }) {
  return (
    <Text color="font.secondary" fontSize="sm" fontWeight="medium">
      {children}
    </Text>
  )
}

function StatCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card h="full">
      <VStack align="start" h="full" spacing="sm">
        <Label>{title}</Label>
        {children}
      </VStack>
    </Card>
  )
}

export function useViewedAccount() {
  const { address: connected } = useAccount()
  const searchParams = useSearchParams()
  const param = searchParams.get('address')
  const viewed = param && isAddress(param) ? (param as Address) : undefined
  return { account: viewed ?? connected, isReadOnly: Boolean(viewed), connected }
}

function AddressLookup() {
  const router = useRouter()
  const pathname = usePathname()
  const [value, setValue] = useState('')
  const isValid = isAddress(value.trim())

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (isValid) router.push(`${pathname}?address=${value.trim()}`)
  }

  return (
    <HStack as="form" onSubmit={onSubmit} spacing="sm" w={{ base: 'full', md: '420px' }}>
      <Input
        fontSize="sm"
        onChange={e => setValue(e.target.value)}
        placeholder="View any address (0x…)"
        size="md"
        value={value}
      />
      <Button isDisabled={!isValid} size="md" type="submit" variant="secondary">
        View
      </Button>
    </HStack>
  )
}

function Header({
  account,
  isReadOnly,
  onRefresh,
  isFetching,
}: {
  account?: Address
  isReadOnly: boolean
  onRefresh: () => void
  isFetching: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <Stack
      align={{ base: 'start', md: 'end' }}
      direction={{ base: 'column', md: 'row' }}
      justify="space-between"
      spacing="md"
      w="full"
    >
      <VStack align="start" spacing="xs">
        <Heading as="h1" letterSpacing="-0.04rem" size="xl">
          {isReadOnly ? 'Position' : 'Your position'}
        </Heading>
        {account && (
          <HStack color="font.secondary" fontSize="sm" spacing="sm" wrap="wrap">
            <Link href={`${BSCSCAN_URL}/address/${account}`} isExternal whiteSpace="nowrap">
              {shortAddress(account)}
            </Link>
            <Text>· BNB Chain · Venus Core Pool</Text>
            {isReadOnly && (
              <Button
                leftIcon={<X size={12} />}
                onClick={() => router.push(pathname)}
                size="xs"
                variant="tertiary"
              >
                Read-only
              </Button>
            )}
            <Tooltip label="Refresh">
              <IconButton
                aria-label="Refresh"
                icon={isFetching ? <Spinner size="xs" /> : <RefreshCw size={14} />}
                onClick={onRefresh}
                size="xs"
                variant="tertiary"
              />
            </Tooltip>
          </HStack>
        )}
      </VStack>
      <AddressLookup />
    </Stack>
  )
}

function HealthCard({ position }: { position: Position }) {
  const drop = liquidationDrop(position)

  return (
    <StatCard title="Health">
      <Text color={healthColor(position.health)} fontSize="4xl" fontWeight="bold" lineHeight={1}>
        {fmtHealth(position.health)}
      </Text>
      <Text color="font.secondary" fontSize="sm">
        {drop === null
          ? 'No bStock collateral at risk'
          : drop >= 1
            ? 'bStocks alone cannot liquidate this account'
            : `Liquidated if bStocks fall ${fmtPct(Math.max(0, drop))} together`}
      </Text>
    </StatCard>
  )
}

function DebtCard({ position }: { position: Position }) {
  const borrowed = position.assets.filter(a => a.borrowedUsd > 0)

  return (
    <StatCard title="Debt">
      <Text fontSize="4xl" fontWeight="bold" lineHeight={1}>
        {fmtUsd(position.debtUsd)}
      </Text>
      <VStack align="start" color="font.secondary" fontSize="sm" spacing="0">
        {borrowed.map(a => (
          <Text key={a.vToken}>
            {a.symbol} {fmtUsd(a.borrowedUsd)}
          </Text>
        ))}
        {position.vaiDebtUsd > 0 && <Text>VAI {fmtUsd(position.vaiDebtUsd)}</Text>}
        {borrowed.length === 0 && position.vaiDebtUsd === 0 && <Text>Nothing borrowed</Text>}
      </VStack>
    </StatCard>
  )
}

function ProtectionCard({ position, isReadOnly }: { position: Position; isReadOnly: boolean }) {
  const now = useNow()
  const policy = position.policy
  const expired = policy !== null && policy.expiry <= now
  const active = policy !== null && position.delegated && !expired

  const status = active
    ? { label: 'Active', color: STATUS_COLORS.success }
    : policy && !position.delegated
      ? { label: 'Policy set, delegation missing', color: STATUS_COLORS.warning }
      : expired
        ? { label: 'Policy expired', color: STATUS_COLORS.warning }
        : { label: 'Not protected', color: 'font.secondary' }

  return (
    <StatCard title="Halyard">
      <HStack spacing="sm">
        <Box bg={status.color} h="10px" rounded="full" w="10px" />
        <Text fontSize="2xl" fontWeight="bold" lineHeight={1.2}>
          {status.label}
        </Text>
      </HStack>
      {policy ? (
        <VStack align="start" color="font.secondary" fontSize="sm" spacing="0">
          <Text>
            Below {policy.minHealth.toFixed(2)} → back to {policy.targetHealth.toFixed(2)}
          </Text>
          <Text>Before weekends → {policy.weekendHealth.toFixed(2)}</Text>
          <Text>
            Sells{' '}
            {policy.sellable.map(v => bStockByVToken(v)?.symbol ?? shortAddress(v)).join(', ')} ·
            max slippage {fmtPct(policy.maxSlippage)}
          </Text>
        </VStack>
      ) : (
        <Text color="font.secondary" fontSize="sm">
          {isReadOnly
            ? 'This account has no Halyard policy.'
            : 'Set a policy to de-risk automatically before closes and when health runs low.'}
        </Text>
      )}
      {!isReadOnly && (
        <Button as={NextLink} href="/protect" mt="auto" size="sm" variant="secondary">
          {policy ? 'Manage protection' : 'Set up protection'}
        </Button>
      )}
    </StatCard>
  )
}

export function MarketClockCard() {
  const now = useNow()
  const { data: onChain } = useOnChainMarketState()
  const session = currentOrNextSession(now)
  const gapSession = nextGapSession(now)
  const isOpen = now >= session.open && now < session.close
  const preCloseStart = gapSession.close - PRE_CLOSE_SECONDS
  const inPreClose = now >= preCloseStart && now < gapSession.close

  return (
    <Card>
      <Stack
        align={{ base: 'start', md: 'center' }}
        direction={{ base: 'column', md: 'row' }}
        justify="space-between"
        spacing="md"
      >
        <VStack align="start" spacing="xs">
          <Label>Market clock (NYSE)</Label>
          <HStack spacing="sm">
            <Box
              bg={isOpen ? STATUS_COLORS.success : 'font.secondary'}
              h="10px"
              rounded="full"
              w="10px"
            />
            <Text fontSize="xl" fontWeight="bold">
              {isOpen
                ? `Open · closes in ${fmtCountdown(session.close - now)}`
                : `Closed · opens in ${fmtCountdown(session.open - now)}`}
            </Text>
          </HStack>
          <Text color="font.secondary" fontSize="sm">
            {isOpen
              ? `Closes ${fmtLocalTime(session.close)}`
              : `Opens ${fmtLocalTime(session.open)}`}
          </Text>
        </VStack>
        <VStack align={{ base: 'start', md: 'end' }} spacing="xs">
          <Label>{inPreClose ? 'Pre-close window is open' : 'Next pre-close window'}</Label>
          <Text
            color={inPreClose ? STATUS_COLORS.warning : 'font.primary'}
            fontSize="xl"
            fontWeight="bold"
          >
            {inPreClose
              ? `Ends in ${fmtCountdown(gapSession.close - now)}`
              : `Starts in ${fmtCountdown(preCloseStart - now)}`}
          </Text>
          <Text color="font.secondary" fontSize="sm">
            {fmtLocalTime(preCloseStart)} · then closed for {gapSession.closedDays}{' '}
            {gapSession.closedDays === 1 ? 'day' : 'days'}
          </Text>
          {onChain && (
            <Text color="font.secondary" fontSize="xs">
              On-chain: {onChain.open ? 'open' : 'closed'}
              {onChain.preCloseWindow ? ', pre-close window active' : ''}
            </Text>
          )}
        </VStack>
      </Stack>
    </Card>
  )
}

function HeadroomCard({ position }: { position: Position }) {
  return (
    <Card>
      <Stack
        align={{ base: 'start', md: 'center' }}
        direction={{ base: 'column', md: 'row' }}
        justify="space-between"
        spacing="md"
      >
        <VStack align="start" spacing="xs">
          <Label>Headroom</Label>
          <Text color="font.secondary" fontSize="sm" maxW="md">
            Extra USDT you could borrow and still keep this health. Capped by the Venus borrow limit
            of {fmtUsd(position.borrowLimitUsd)}.
          </Text>
        </VStack>
        <HStack spacing={{ base: 'md', md: 'xl' }}>
          {HEADROOM_TARGETS.map(target => (
            <VStack align="start" key={target} spacing="0">
              <Text fontSize="2xl" fontWeight="bold">
                +{fmtUsd(headroomAt(position, target))}
              </Text>
              <Text color="font.secondary" fontSize="sm">
                at health {target.toFixed(2)}
              </Text>
            </VStack>
          ))}
        </HStack>
        <Button
          as={Link}
          href={VENUS_APP_URL}
          isExternal
          rightIcon={<ArrowUpRight size={14} />}
          size="md"
          variant="secondary"
        >
          Borrow on Venus
        </Button>
      </Stack>
    </Card>
  )
}

function AssetsCard({ position }: { position: Position }) {
  return (
    <Card>
      <Label>Collateral and debt</Label>
      <Box mt="md" overflowX="auto">
        <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th>Asset</Th>
              <Th isNumeric>Supplied</Th>
              <Th isNumeric>Borrowed</Th>
              <Th isNumeric>Oracle price</Th>
              <Th isNumeric>Value</Th>
              <Th isNumeric>Liq. threshold</Th>
            </Tr>
          </Thead>
          <Tbody>
            {position.assets.map(a => (
              <Tr key={a.vToken}>
                <Td>
                  <HStack spacing="sm">
                    <Text fontWeight="bold">{a.symbol}</Text>
                    {a.isBStock && (
                      <Text
                        bg="background.level4"
                        color="font.secondary"
                        fontSize="xs"
                        px="xs"
                        rounded="sm"
                      >
                        bStock
                      </Text>
                    )}
                  </HStack>
                </Td>
                <Td isNumeric>
                  {a.supplied > 0 ? fmtBStockAmount(a.supplied, a.uiMultiplier) : '-'}
                </Td>
                <Td isNumeric>{a.borrowed > 0 ? fmtAmount(a.borrowed) : '-'}</Td>
                <Td isNumeric>{fmtUsd(a.price)}</Td>
                <Td isNumeric>
                  {a.suppliedUsd > 0 ? fmtUsd(a.suppliedUsd) : `-${fmtUsd(a.borrowedUsd)}`}
                </Td>
                <Td isNumeric>{a.suppliedUsd > 0 ? fmtPct(a.liquidationThreshold, 0) : '-'}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
      {position.assets.some(a => Math.abs(a.uiMultiplier - 1) > 1e-9) && (
        <Text color="font.secondary" fontSize="xs" mt="sm">
          Amounts are raw token units, which Venus, its oracle and PancakeSwap use. UI is the holder
          amount after the token&apos;s EIP-8056 corporate-action multiplier.
        </Text>
      )}
    </Card>
  )
}

export function ProtectionsCard({
  account,
  limit = 5,
  title = 'Recent protections',
}: {
  account: Address
  limit?: number
  title?: string
}) {
  const { data, isLoading, isError } = useProtections(account)

  return (
    <Card>
      <Label>{title}</Label>
      <Box mt="md">
        {isLoading ? (
          <Skeleton h="40px" />
        ) : isError ? (
          <Text color="font.secondary" fontSize="sm">
            Could not load the history from the public RPC. Try refreshing.
          </Text>
        ) : !data || data.length === 0 ? (
          <Text color="font.secondary" fontSize="sm">
            Halyard has not acted on this account yet.
          </Text>
        ) : (
          <VStack align="stretch" spacing="sm">
            {data.slice(0, limit).map(p => (
              <HStack fontSize="sm" justify="space-between" key={p.txHash} spacing="md" wrap="wrap">
                <Text color="font.secondary" minW="110px">
                  {fmtDate(p.timestamp)}
                </Text>
                <Text minW="90px">{p.trigger}</Text>
                <Text>
                  Sold {fmtAmount(p.seized)} {p.collateral} · repaid {fmtUsd(p.repaid)}
                </Text>
                <Text fontWeight="bold">
                  {p.healthBefore.toFixed(2)} → {p.healthAfter.toFixed(2)}
                </Text>
                <Link href={`${BSCSCAN_URL}/tx/${p.txHash}`} isExternal>
                  <HStack spacing="xxs">
                    <Text>Tx</Text>
                    <ArrowUpRight size={12} />
                  </HStack>
                </Link>
              </HStack>
            ))}
          </VStack>
        )}
      </Box>
    </Card>
  )
}

function ConnectPrompt() {
  const { openConnectModal } = useConnectModal()

  return (
    <Card>
      <Center flexDirection="column" gap="md" py="xl" textAlign="center">
        <Heading size="md">Connect a wallet to see your Venus position</Heading>
        <Text color="font.secondary" maxW="lg">
          Or paste any address above to view its position read-only. Everything on this page is read
          from BNB Chain.
        </Text>
        <Button onClick={openConnectModal} variant="primary">
          Connect wallet
        </Button>
      </Center>
    </Card>
  )
}

function EmptyPosition() {
  return (
    <Card>
      <Center flexDirection="column" gap="md" py="xl" textAlign="center">
        <Heading size="md">No Venus Core Pool position found</Heading>
        <Text color="font.secondary" maxW="lg">
          Supply TSLAB, NVDAB or SPCXB as collateral on Venus to borrow against your stocks. Halyard
          can then protect the loan.
        </Text>
        <Button
          as={Link}
          href={VENUS_APP_URL}
          isExternal
          rightIcon={<ArrowUpRight size={14} />}
          variant="secondary"
        >
          Open Venus
        </Button>
      </Center>
    </Card>
  )
}

export function Dashboard() {
  const { account, isReadOnly } = useViewedAccount()
  const { data: position, isLoading, isError, refetch, isFetching } = usePosition(account)

  return (
    <VStack align="stretch" spacing="md" w="full">
      <Header
        account={account}
        isFetching={isFetching}
        isReadOnly={isReadOnly}
        onRefresh={() => refetch()}
      />

      {!account ? (
        <>
          <MarketClockCard />
          <ConnectPrompt />
        </>
      ) : isLoading ? (
        <Grid gap="md" templateColumns={{ base: '1fr', lg: 'repeat(3, 1fr)' }}>
          <Skeleton h="150px" rounded="lg" />
          <Skeleton h="150px" rounded="lg" />
          <Skeleton h="150px" rounded="lg" />
        </Grid>
      ) : isError || !position ? (
        <Card>
          <Text color="font.secondary">
            Could not read this position from BNB Chain. The public RPC may be busy, try refreshing.
          </Text>
        </Card>
      ) : position.assets.length === 0 ? (
        <>
          <MarketClockCard />
          <EmptyPosition />
        </>
      ) : (
        <>
          <Grid gap="md" templateColumns={{ base: '1fr', lg: 'repeat(3, 1fr)' }}>
            <HealthCard position={position} />
            <DebtCard position={position} />
            <ProtectionCard isReadOnly={isReadOnly} position={position} />
          </Grid>
          <MarketClockCard />
          <HeadroomCard position={position} />
          <AssetsCard position={position} />
          <ProtectionsCard account={position.account} />
        </>
      )}
    </VStack>
  )
}
