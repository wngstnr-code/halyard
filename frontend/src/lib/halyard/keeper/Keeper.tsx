'use client'

import {
  Box,
  Button,
  Card,
  Center,
  Checkbox,
  HStack,
  Heading,
  IconButton,
  Link,
  Skeleton,
  Spinner,
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
import { ArrowUpRight, RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Address } from 'viem'
// Halyard pages run on their own BSC-only wagmi config, not the template's UserAccountProvider.
// eslint-disable-next-line no-restricted-imports
import { useAccount } from 'wagmi'
import { halyardVaultAbi } from '@/lib/halyard/abis'
import { BSCSCAN_URL, HALYARD_VAULT } from '@/lib/halyard/constants'
import { Label, MarketClockCard } from '@/lib/halyard/dashboard/Dashboard'
import {
  STATUS_COLORS,
  fmtAmount,
  fmtDate,
  fmtHealth,
  fmtUsd,
  healthColor,
  shortAddress,
} from '@/lib/halyard/format'
import { useAllProtections, useKeeperRows, useNow } from '@/lib/halyard/hooks'
import { KeeperRow, KeeperStatus } from '@/lib/halyard/keeper'
import { TxStatus } from '@/lib/halyard/TxStatus'
import { useHalyardTx } from '@/lib/halyard/useHalyardTx'

const STATUS_COLOR: Record<KeeperStatus, string> = {
  Ready: STATUS_COLORS.warning,
  Waiting: STATUS_COLORS.success,
  'No delegation': 'font.secondary',
  Expired: 'font.secondary',
}

function AccountLink({ account }: { account: Address }) {
  return (
    <Link href={`${BSCSCAN_URL}/address/${account}`} isExternal>
      {shortAddress(account)}
    </Link>
  )
}

function notify(title: string, body: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  new Notification(title, { body })
}

function PositionsCard({
  rows,
  isLoading,
  isError,
  isFetching,
  updatedAt,
  onRefresh,
  onRun,
  busy,
}: {
  rows?: KeeperRow[]
  isLoading: boolean
  isError: boolean
  isFetching: boolean
  updatedAt: number
  onRefresh: () => void
  onRun: (account: Address) => void
  busy: boolean
}) {
  const now = useNow()
  const ready = rows?.filter(r => r.status === 'Ready').length ?? 0
  const active = rows?.filter(r => r.status === 'Ready' || r.status === 'Waiting').length ?? 0

  return (
    <Card>
      <VStack align="stretch" spacing="md">
        <HStack justify="space-between">
          <Label>Protected positions</Label>
          <HStack color="font.secondary" fontSize="sm" spacing="sm">
            {rows && (
              <Text>
                {active} active · {ready} ready
                {updatedAt > 0 &&
                  ` · scanned ${Math.max(0, now - Math.floor(updatedAt / 1000))}s ago`}
              </Text>
            )}
            <Tooltip label="Scan again">
              <IconButton
                aria-label="Scan again"
                icon={isFetching ? <Spinner size="xs" /> : <RefreshCw size={14} />}
                onClick={onRefresh}
                size="xs"
                variant="tertiary"
              />
            </Tooltip>
          </HStack>
        </HStack>

        {isLoading ? (
          <Skeleton h="80px" />
        ) : isError ? (
          <Text color="font.secondary" fontSize="sm">
            Could not scan the vault events from the public RPC. Try again.
          </Text>
        ) : !rows || rows.length === 0 ? (
          <Center flexDirection="column" gap="xs" py="lg" textAlign="center">
            <Text fontWeight="bold">No active policies yet</Text>
            <Text color="font.secondary" fontSize="sm" maxW="lg">
              Accounts appear here as soon as they save a policy on the Protect page. The list is
              read from HalyardVault PolicySet events.
            </Text>
          </Center>
        ) : (
          <Box overflowX="auto">
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Account</Th>
                  <Th isNumeric>Health</Th>
                  <Th>Policy</Th>
                  <Th>Status</Th>
                  <Th>Plan</Th>
                  <Th />
                </Tr>
              </Thead>
              <Tbody>
                {rows.map(row => (
                  <Tr key={row.account}>
                    <Td>
                      <AccountLink account={row.account} />
                    </Td>
                    <Td color={healthColor(row.health)} fontWeight="bold" isNumeric>
                      {fmtHealth(row.health)}
                    </Td>
                    <Td color="font.secondary">
                      {row.minHealth.toFixed(2)} → {row.targetHealth.toFixed(2)}, weekend{' '}
                      {row.weekendHealth.toFixed(2)}
                    </Td>
                    <Td>
                      <HStack spacing="xs">
                        <Box bg={STATUS_COLOR[row.status]} h="8px" rounded="full" w="8px" />
                        <Text>{row.plan ? row.plan.trigger : row.status}</Text>
                      </HStack>
                    </Td>
                    <Td color="font.secondary">
                      {row.plan
                        ? `Sell ~${fmtAmount(row.plan.seize)} ${row.plan.collateral} · repay ${fmtUsd(row.plan.repayUsdt)} · tip ${fmtUsd(row.plan.tipUsdt)}`
                        : '-'}
                    </Td>
                    <Td>
                      {row.status === 'Ready' && (
                        <Button
                          isDisabled={busy}
                          onClick={() => onRun(row.account)}
                          size="xs"
                          variant="primary"
                        >
                          Run
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </VStack>
    </Card>
  )
}

function RecentRunsCard() {
  const { data, isLoading, isError } = useAllProtections()

  return (
    <Card>
      <Label>Recent runs, all accounts</Label>
      <Box mt="md">
        {isLoading ? (
          <Skeleton h="40px" />
        ) : isError ? (
          <Text color="font.secondary" fontSize="sm">
            Could not load runs from the public RPC.
          </Text>
        ) : !data || data.length === 0 ? (
          <Text color="font.secondary" fontSize="sm">
            No protect calls yet.
          </Text>
        ) : (
          <Box overflowX="auto">
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Time</Th>
                  <Th>Account</Th>
                  <Th>Trigger</Th>
                  <Th isNumeric>Repaid</Th>
                  <Th isNumeric>Health</Th>
                  <Th>Keeper</Th>
                  <Th isNumeric>Tip</Th>
                  <Th />
                </Tr>
              </Thead>
              <Tbody>
                {data.slice(0, 20).map(p => (
                  <Tr key={p.txHash}>
                    <Td>{fmtDate(p.timestamp)}</Td>
                    <Td>
                      <AccountLink account={p.user} />
                    </Td>
                    <Td>{p.trigger}</Td>
                    <Td isNumeric>{fmtUsd(p.repaid)}</Td>
                    <Td isNumeric>
                      {p.healthBefore.toFixed(2)} → {p.healthAfter.toFixed(2)}
                    </Td>
                    <Td>
                      <AccountLink account={p.keeper} />
                    </Td>
                    <Td isNumeric>{fmtUsd(p.tip)}</Td>
                    <Td>
                      <Link href={`${BSCSCAN_URL}/tx/${p.txHash}`} isExternal>
                        <ArrowUpRight size={12} />
                      </Link>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>
    </Card>
  )
}

export function Keeper() {
  const { address } = useAccount()
  const { openConnectModal } = useConnectModal()
  const [watch, setWatch] = useState(false)

  const {
    data: rows,
    isLoading,
    isError,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useKeeperRows(watch)

  const { tx, send, busy } = useHalyardTx()
  // Accounts already prompted in watch mode, keyed by scan time, so each scan prompts once.
  const prompted = useRef(new Set<string>())

  function run(account: Address) {
    send(`protect(${shortAddress(account)})`, {
      address: HALYARD_VAULT,
      abi: halyardVaultAbi,
      functionName: 'protect',
      args: [account],
    })
  }

  useEffect(() => {
    if (!watch || !address || busy || !rows) return

    const next = rows.find(
      r => r.status === 'Ready' && !prompted.current.has(`${r.account}-${dataUpdatedAt}`)
    )

    if (!next) return
    prompted.current.add(`${next.account}-${dataUpdatedAt}`)
    notify('Halyard: a position is ready', `${shortAddress(next.account)} can be protected now.`)
    run(next.account)
  }, [watch, address, busy, rows, dataUpdatedAt])

  async function toggleWatch(enabled: boolean) {
    setWatch(enabled)

    if (enabled && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  return (
    <VStack align="stretch" spacing="md" w="full">
      <VStack align="start" spacing="xs">
        <Heading as="h1" letterSpacing="-0.04rem" size="xl">
          Keeper
        </Heading>
        <Text color="font.secondary" fontSize="sm" maxW="3xl">
          Anyone can run protect for a position that needs it and earn 0.1% of the amount sold. The
          contract picks the trigger, collateral and amounts, so a keeper cannot hurt the position
          owner.
        </Text>
      </VStack>

      <MarketClockCard />

      <PositionsCard
        busy={busy}
        isError={isError}
        isFetching={isFetching}
        isLoading={isLoading}
        onRefresh={() => refetch()}
        onRun={account => (address ? run(account) : openConnectModal?.())}
        rows={rows}
        updatedAt={dataUpdatedAt}
      />

      <Card>
        <VStack align="stretch" spacing="sm">
          <Label>Watch mode</Label>
          <Checkbox
            isChecked={watch}
            isDisabled={!address}
            onChange={e => toggleWatch(e.target.checked)}
          >
            Keep watching while this tab is open
          </Checkbox>
          <Text color="font.secondary" fontSize="sm">
            {address
              ? 'Rescans every 60 seconds. When a position becomes ready, you get a browser notification and your wallet asks you to confirm the protect transaction.'
              : 'Connect a wallet to run protect and earn the tip.'}
          </Text>
          <Text color="font.secondary" fontSize="xs">
            Browser wallets always ask before signing, so this tab cannot run unattended. Fully
            automatic runs need a signer that does not ask each time, such as an AI agent with the
            Binance Agentic Wallet or a bot with its own key. See the{' '}
            <Link
              href="https://github.com/wngstnr-code/halyard/blob/main/docs/ARCHITECTURE.md"
              isExternal
            >
              architecture docs
            </Link>
            .
          </Text>
          <TxStatus tx={tx} />
        </VStack>
      </Card>

      <RecentRunsCard />
    </VStack>
  )
}
