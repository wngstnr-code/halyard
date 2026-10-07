'use client'

import {
  Box,
  Card,
  FormControl,
  FormHelperText,
  FormLabel,
  Grid,
  HStack,
  Heading,
  NumberInput,
  NumberInputField,
  Radio,
  RadioGroup,
  Select,
  Skeleton,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from '@chakra-ui/react'
import ReactECharts from 'echarts-for-react'
import { useEffect, useMemo, useState } from 'react'
import { BSTOCKS, BStock } from '@/lib/halyard/constants'
import { Label, useViewedAccount } from '@/lib/halyard/dashboard/Dashboard'
import {
  STATUS_COLORS,
  fmtMarketDay,
  fmtHealth,
  fmtPct,
  fmtUsd,
  healthColor,
  shortAddress,
} from '@/lib/halyard/format'
import { GAP_HISTORY_START, GapEvent } from '@/lib/halyard/gaps'
import { useGapEvents, useMarketParams, usePosition } from '@/lib/halyard/hooks'
import { Position } from '@/lib/halyard/position'
import { ReplayRow, hypotheticalPosition, replayEvents, stress } from '@/lib/halyard/simulate'

const BSTOCK_COLORS: Record<BStock['symbol'], string> = {
  TSLAB: '#0F3562',
  NVDAB: '#5B82B5',
  SPCXB: '#ADC6E8',
}

function NumberField({
  label,
  helper,
  value,
  onChange,
  step,
  min,
}: {
  label: string
  helper?: string
  value: number
  onChange: (value: number) => void
  step: number
  min?: number
}) {
  const [text, setText] = useState(String(value))

  return (
    <FormControl>
      <FormLabel fontSize="sm" mb="xs">
        {label}
      </FormLabel>
      <NumberInput
        min={min}
        onChange={valueString => {
          setText(valueString)
          onChange(Number(valueString))
        }}
        step={step}
        value={text}
      >
        <NumberInputField />
      </NumberInput>
      {helper && <FormHelperText fontSize="xs">{helper}</FormHelperText>}
    </FormControl>
  )
}

type Source = 'mine' | 'try'

function PositionCard({
  source,
  setSource,
  hasOwn,
  ownLabel,
  bStock,
  setBStock,
  collateralUsd,
  setCollateralUsd,
  borrowUsd,
  setBorrowUsd,
  weekendTarget,
  setWeekendTarget,
  position,
}: {
  source: Source
  setSource: (s: Source) => void
  hasOwn: boolean
  ownLabel: string
  bStock: BStock
  setBStock: (b: BStock) => void
  collateralUsd: number
  setCollateralUsd: (n: number) => void
  borrowUsd: number
  setBorrowUsd: (n: number) => void
  weekendTarget: number
  setWeekendTarget: (n: number) => void
  position?: Position
}) {
  const overLimit = source === 'try' && position && borrowUsd > position.borrowLimitUsd

  return (
    <Card>
      <VStack align="stretch" spacing="md">
        <Label>Position</Label>
        <RadioGroup onChange={v => setSource(v as Source)} value={source}>
          <Stack direction={{ base: 'column', md: 'row' }} spacing="lg">
            <Radio isDisabled={!hasOwn} value="mine">
              {ownLabel}
            </Radio>
            <Radio value="try">Try a position</Radio>
          </Stack>
        </RadioGroup>
        {source === 'try' && (
          <Grid gap="md" templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}>
            <FormControl>
              <FormLabel fontSize="sm" mb="xs">
                Collateral
              </FormLabel>
              <Select
                onChange={e => setBStock(BSTOCKS.find(b => b.symbol === e.target.value)!)}
                value={bStock.symbol}
              >
                {BSTOCKS.map(b => (
                  <option key={b.symbol} value={b.symbol}>
                    {b.symbol} ({b.name})
                  </option>
                ))}
              </Select>
            </FormControl>
            <NumberField
              helper="USD value at today's oracle price"
              label="Collateral value ($)"
              min={0}
              onChange={setCollateralUsd}
              step={1000}
              value={collateralUsd}
            />
            <NumberField
              helper={
                position
                  ? overLimit
                    ? `Above the Venus borrow limit of ${fmtUsd(position.borrowLimitUsd)}`
                    : `Venus borrow limit ${fmtUsd(position.borrowLimitUsd)}`
                  : undefined
              }
              label="USDT borrowed ($)"
              min={0}
              onChange={setBorrowUsd}
              step={500}
              value={borrowUsd}
            />
          </Grid>
        )}
        <HStack align="end" justify="space-between" spacing="md" wrap="wrap">
          <Box maxW="260px">
            <NumberField
              helper="Health Halyard restores before each close"
              label="Halyard weekend target"
              min={1.3}
              onChange={setWeekendTarget}
              step={0.05}
              value={weekendTarget}
            />
          </Box>
          {position && (
            <VStack align="end" spacing="0">
              <Text color="font.secondary" fontSize="sm">
                Health today
              </Text>
              <Text color={healthColor(position.health)} fontSize="3xl" fontWeight="bold">
                {fmtHealth(position.health)}
              </Text>
            </VStack>
          )}
        </HStack>
      </VStack>
    </Card>
  )
}

function SummaryCard({ rows, events }: { rows: ReplayRow[]; events: GapEvent[] }) {
  let worst = { symbol: '', gap: 0, close: 0 }

  for (const e of events) {
    for (const [symbol, gap] of Object.entries(e.gaps)) {
      if (gap !== undefined && gap < worst.gap) worst = { symbol, gap, close: e.close }
    }
  }

  const lowest = (pick: (r: ReplayRow) => number) => Math.min(...rows.map(pick))
  const liquidationsWithout = rows.filter(r => r.without.liquidated).length
  const liquidationsWith = rows.filter(r => r.with.liquidated).length
  const runs = rows.filter(r => r.with.ran)
  const fees = runs.reduce((sum, r) => sum + r.with.feesUsd, 0)
  const lossWithout = rows.reduce((sum, r) => sum + r.without.liquidationLoss, 0)

  const Stat = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <VStack align="start" spacing="0">
      <Text color="font.secondary" fontSize="sm">
        {label}
      </Text>
      <Text color={color} fontSize="2xl" fontWeight="bold">
        {value}
      </Text>
    </VStack>
  )

  return (
    <Card>
      <VStack align="stretch" spacing="md">
        <Label>
          {events.length} closes replayed since{' '}
          {new Date(GAP_HISTORY_START * 1000).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
          {worst.symbol &&
            ` · worst gap ${worst.symbol} ${fmtPct(worst.gap)} (${fmtMarketDay(worst.close)})`}
        </Label>
        <Grid gap="md" templateColumns={{ base: '1fr 1fr', md: 'repeat(4, 1fr)' }}>
          <Stat
            color={healthColor(lowest(r => r.without.health))}
            label="Lowest health without Halyard"
            value={fmtHealth(lowest(r => r.without.health))}
          />
          <Stat
            color={healthColor(lowest(r => r.with.health))}
            label="Lowest health with Halyard"
            value={fmtHealth(lowest(r => r.with.health))}
          />
          <Stat
            color={liquidationsWithout > 0 ? STATUS_COLORS.danger : undefined}
            label="Liquidations without / with"
            value={`${liquidationsWithout} / ${liquidationsWith}`}
          />
          <Stat label={`Halyard fees over ${runs.length} runs`} value={fmtUsd(fees)} />
        </Grid>
        {lossWithout > 0 && (
          <Text color={STATUS_COLORS.danger} fontSize="sm">
            Liquidations would have cost about {fmtUsd(lossWithout)} in Venus incentives.
          </Text>
        )}
        <Text color="font.secondary" fontSize="xs">
          Each close is replayed against today&apos;s position. Fees are the 0.3% protocol fee and
          the 0.1% keeper tip; swap slippage comes on top (PancakeSwap fills about 0.3% under the
          oracle today).
        </Text>
      </VStack>
    </Card>
  )
}

function GapChart({ rows }: { rows: ReplayRow[] }) {
  const ordered = [...rows].reverse()

  const option = {
    grid: { left: 48, right: 48, top: 40, bottom: 40 },
    tooltip: { trigger: 'axis' },
    legend: { top: 0, textStyle: { color: '#4E5661' } },
    xAxis: {
      type: 'category',
      data: ordered.map(r => fmtMarketDay(r.event.close).split(', ')[1]),
      axisLabel: { color: '#4E5661' },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Gap',
        axisLabel: { formatter: (v: number) => `${(v * 100).toFixed(0)}%`, color: '#4E5661' },
        splitLine: { lineStyle: { color: '#D6DBE3' } },
      },
      {
        type: 'value',
        name: 'Health',
        min: 0.8,
        axisLabel: { color: '#4E5661' },
        splitLine: { show: false },
      },
    ],
    series: [
      ...BSTOCKS.map(b => ({
        name: b.symbol,
        type: 'bar',
        data: ordered.map(r => r.event.gaps[b.symbol] ?? null),
        itemStyle: { color: BSTOCK_COLORS[b.symbol] },
        tooltip: { valueFormatter: (v: number) => (v === null ? '-' : `${(v * 100).toFixed(2)}%`) },
      })),
      {
        name: 'Health without',
        type: 'line',
        yAxisIndex: 1,
        data: ordered.map(r => +r.without.health.toFixed(3)),
        itemStyle: { color: STATUS_COLORS.danger },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [
            {
              yAxis: 1,
              label: {
                formatter: 'Liquidation at 1.00',
                position: 'insideStartTop',
                color: STATUS_COLORS.danger,
              },
            },
          ],
          lineStyle: { color: STATUS_COLORS.danger, type: 'dashed' },
        },
      },
      {
        name: 'Health with Halyard',
        type: 'line',
        yAxisIndex: 1,
        data: ordered.map(r => +r.with.health.toFixed(3)),
        itemStyle: { color: STATUS_COLORS.success },
      },
    ],
  }

  return (
    <Card>
      <Label>Gap at each reopen, and health one hour after it</Label>
      <Box h="340px" mt="md">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </Box>
    </Card>
  )
}

function EventsTable({ rows }: { rows: ReplayRow[] }) {
  const gapCell = (gap?: number) =>
    gap === undefined ? (
      '-'
    ) : (
      <Text as="span" color={gap < 0 ? STATUS_COLORS.danger : STATUS_COLORS.success}>
        {gap > 0 ? '+' : ''}
        {fmtPct(gap, 2)}
      </Text>
    )

  return (
    <Card>
      <Label>Every close</Label>
      <Box mt="md" overflowX="auto">
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Close</Th>
              <Th isNumeric>Closed</Th>
              {BSTOCKS.map(b => (
                <Th isNumeric key={b.symbol}>
                  {b.symbol}
                </Th>
              ))}
              <Th isNumeric>Without</Th>
              <Th isNumeric>With Halyard</Th>
              <Th isNumeric>Halyard fees</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map(r => (
              <Tr key={r.event.close}>
                <Td>{fmtMarketDay(r.event.close)}</Td>
                <Td isNumeric>{r.event.closedDays + 1} nights</Td>
                {BSTOCKS.map(b => (
                  <Td isNumeric key={b.symbol}>
                    {gapCell(r.event.gaps[b.symbol])}
                  </Td>
                ))}
                <Td color={healthColor(r.without.health)} fontWeight="bold" isNumeric>
                  {r.without.liquidated ? 'Liquidated' : fmtHealth(r.without.health)}
                </Td>
                <Td color={healthColor(r.with.health)} fontWeight="bold" isNumeric>
                  {r.with.liquidated ? 'Liquidated' : fmtHealth(r.with.health)}
                </Td>
                <Td isNumeric>{r.with.ran ? fmtUsd(r.with.feesUsd) : 'No run'}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Card>
  )
}

function StressCard({ position, weekendTarget }: { position: Position; weekendTarget: number }) {
  const [gap, setGap] = useState(-0.2)
  const result = stress(position, weekendTarget, gap)

  const outcome = (o: { health: number; liquidated: boolean; liquidationLoss: number }) =>
    o.liquidated
      ? `Liquidated, about ${fmtUsd(o.liquidationLoss)} lost`
      : `Health ${fmtHealth(o.health)}`

  return (
    <Card>
      <VStack align="stretch" spacing="md">
        <Label>Stress test: a hypothetical gap on every bStock</Label>
        <HStack spacing="lg">
          <Text fontSize="2xl" fontWeight="bold" minW="80px">
            {fmtPct(gap, 0)}
          </Text>
          <Slider max={0} min={-0.5} onChange={setGap} step={0.01} value={gap}>
            <SliderTrack>
              <SliderFilledTrack bg="primary.700" />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </HStack>
        <Grid gap="md" templateColumns={{ base: '1fr', md: '1fr 1fr' }}>
          <VStack align="start" spacing="0">
            <Text color="font.secondary" fontSize="sm">
              Without Halyard
            </Text>
            <Text color={healthColor(result.without.health)} fontSize="xl" fontWeight="bold">
              {outcome(result.without)}
            </Text>
          </VStack>
          <VStack align="start" spacing="0">
            <Text color="font.secondary" fontSize="sm">
              With Halyard at {weekendTarget.toFixed(2)} before the close
            </Text>
            <Text color={healthColor(result.with.health)} fontSize="xl" fontWeight="bold">
              {outcome(result.with)}
            </Text>
          </VStack>
        </Grid>
      </VStack>
    </Card>
  )
}

export function Simulator() {
  const { account, isReadOnly } = useViewedAccount()
  const { data: own } = usePosition(account)
  const hasOwn = Boolean(own && own.bStockWeightedUsd > 0 && own.debtUsd > 0)

  const [source, setSource] = useState<Source>('try')
  const [bStock, setBStock] = useState<BStock>(BSTOCKS[0]!)
  const [collateralUsd, setCollateralUsd] = useState(10_000)
  const [borrowUsd, setBorrowUsd] = useState(5_000)
  const [weekendTarget, setWeekendTarget] = useState(1.6)

  useEffect(() => {
    if (hasOwn) setSource('mine')
    if (own?.policy) setWeekendTarget(own.policy.weekendHealth)
  }, [hasOwn, own?.policy])

  const { data: market } = useMarketParams(bStock)
  const { data: events, isLoading, isError } = useGapEvents()

  const position = useMemo(() => {
    if (source === 'mine') return hasOwn ? own : undefined
    return market ? hypotheticalPosition(bStock, market, collateralUsd, borrowUsd) : undefined
  }, [source, hasOwn, own, market, bStock, collateralUsd, borrowUsd])

  const validTarget = weekendTarget >= 1.3 && weekendTarget <= 3

  const rows = useMemo(
    () =>
      position && events && validTarget ? replayEvents(position, events, weekendTarget) : null,
    [position, events, weekendTarget, validTarget]
  )

  const ownLabel = account
    ? `${isReadOnly ? 'Viewed address' : 'My position'} (${shortAddress(account)})${hasOwn ? '' : ', no bStock loan'}`
    : 'My position (connect a wallet)'

  return (
    <VStack align="stretch" spacing="md" w="full">
      <VStack align="start" spacing="xs">
        <Heading as="h1" letterSpacing="-0.04rem" size="xl">
          Gap simulator
        </Heading>
        <Text color="font.secondary" fontSize="sm">
          Every real weekend and holiday gap of TSLAB, NVDAB and SPCXB since listing, replayed
          against a position, with and without Halyard.
        </Text>
      </VStack>

      <PositionCard
        borrowUsd={borrowUsd}
        bStock={bStock}
        collateralUsd={collateralUsd}
        hasOwn={hasOwn}
        ownLabel={ownLabel}
        position={position}
        setBorrowUsd={setBorrowUsd}
        setBStock={setBStock}
        setCollateralUsd={setCollateralUsd}
        setSource={setSource}
        setWeekendTarget={setWeekendTarget}
        source={source}
        weekendTarget={weekendTarget}
      />

      {isError ? (
        <Card>
          <Text color="font.secondary">
            Could not load bStock candles from Binance (data-api.binance.vision). Try again later.
          </Text>
        </Card>
      ) : isLoading || !events ? (
        <Skeleton h="300px" rounded="lg" />
      ) : !position || position.debtUsd === 0 ? (
        <Card>
          <Text color="font.secondary">Add a USDT loan to replay the gaps.</Text>
        </Card>
      ) : !rows ? (
        <Card>
          <Text color="font.secondary">The weekend target must be between 1.30 and 3.00.</Text>
        </Card>
      ) : (
        <>
          <SummaryCard events={events} rows={rows} />
          <GapChart rows={rows} />
          <StressCard position={position} weekendTarget={weekendTarget} />
          <EventsTable rows={rows} />
        </>
      )}
      <Text color="font.secondary" fontSize="xs">
        Prices: Binance hourly candles (TSLABUSDT, NVDABUSDT, SPCXBUSDT). Pre-close is the last
        hourly close before the NYSE close, post-open is the first hourly close at least one hour
        after the reopen, matching the hourly Venus oracle. Liquidation cost assumes Venus repays
        50% of the debt with a 10% incentive.
      </Text>
    </VStack>
  )
}
