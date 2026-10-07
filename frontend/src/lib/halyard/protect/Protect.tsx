'use client'

import {
  Box,
  Button,
  Card,
  Center,
  Checkbox,
  Divider,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Grid,
  HStack,
  Heading,
  NumberInput,
  NumberInputField,
  Select,
  Skeleton,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { Check } from 'lucide-react'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import { Address } from 'viem'
// Halyard pages run on their own BSC-only wagmi config, not the template's UserAccountProvider.
// eslint-disable-next-line no-restricted-imports
import { useAccount } from 'wagmi'
import { halyardVaultAbi, venusComptrollerAbi } from '@/lib/halyard/abis'
import { BSTOCKS, HALYARD_VAULT, VENUS_COMPTROLLER, bStockByVToken } from '@/lib/halyard/constants'
import { Label, ProtectionsCard } from '@/lib/halyard/dashboard/Dashboard'
import {
  STATUS_COLORS,
  fmtAmount,
  fmtBStockAmount,
  fmtHealth,
  fmtPct,
  fmtUsd,
  healthColor,
} from '@/lib/halyard/format'
import { useCanProtect, useNow, usePosition, useSwapQuote } from '@/lib/halyard/hooks'
import {
  FEE,
  PolicyDraft,
  SimulatedPlan,
  TIP,
  dropToHealth,
  simulatePlan,
  validatePolicy,
} from '@/lib/halyard/plan'
import { Position } from '@/lib/halyard/position'
import { TxStatus } from '@/lib/halyard/TxStatus'
import { useHalyardTx } from '@/lib/halyard/useHalyardTx'

const DEFAULT_DRAFT: Omit<PolicyDraft, 'sellable'> = {
  minHealth: 1.25,
  targetHealth: 1.4,
  weekendHealth: 1.6,
  maxSlippage: 0.01,
  expiryDays: 90,
}

const EXPIRY_OPTIONS = [30, 90, 180]
const DAY = 86_400

/** Number input that keeps the typed text (so "1." stays while typing) and reports numbers. */
function NumberField({
  label,
  helper,
  value,
  error,
  step,
  scale = 1,
  onChange,
}: {
  label: string
  helper: string
  value: number
  error?: string
  step: number
  scale?: number
  onChange: (value: number) => void
}) {
  const [text, setText] = useState(() => String(+(value * scale).toFixed(4)))

  useEffect(() => {
    if (Number(text) / scale !== value) setText(String(+(value * scale).toFixed(4)))
    // Only resync when the value changes from outside the field.
  }, [value, scale])

  return (
    <FormControl isInvalid={Boolean(error)}>
      <FormLabel fontSize="sm" mb="xs">
        {label}
      </FormLabel>
      <NumberInput
        onChange={valueString => {
          setText(valueString)
          onChange(Number(valueString) / scale)
        }}
        step={step}
        value={text}
      >
        <NumberInputField />
      </NumberInput>
      {error ? (
        <FormErrorMessage>{error}</FormErrorMessage>
      ) : (
        <FormHelperText fontSize="xs">{helper}</FormHelperText>
      )}
    </FormControl>
  )
}

function PolicyForm({
  position,
  draft,
  setDraft,
}: {
  position: Position
  draft: PolicyDraft
  setDraft: (draft: PolicyDraft) => void
}) {
  const errors = validatePolicy(draft)

  const held = BSTOCKS.filter(b => {
    const asset = position.assets.find(a => a.vToken.toLowerCase() === b.vToken.toLowerCase())
    return (asset && asset.supplied > 0) || draft.sellable.includes(b.vToken)
  })

  function toggle(vToken: Address) {
    const sellable = draft.sellable.includes(vToken)
      ? draft.sellable.filter(v => v !== vToken)
      : [...draft.sellable, vToken]

    setDraft({ ...draft, sellable })
  }

  return (
    <Card h="full">
      <VStack align="stretch" spacing="md">
        <Label>Policy</Label>
        <NumberField
          error={errors.minHealth}
          helper="Halyard acts when health falls below this"
          label="Act when health is below"
          onChange={minHealth => setDraft({ ...draft, minHealth })}
          step={0.05}
          value={draft.minHealth}
        />
        <NumberField
          error={errors.targetHealth}
          helper="Health after a low-health run"
          label="Bring it back to"
          onChange={targetHealth => setDraft({ ...draft, targetHealth })}
          step={0.05}
          value={draft.targetHealth}
        />
        <NumberField
          error={errors.weekendHealth}
          helper="In the last hour before a weekend or holiday close"
          label="Before weekends, lift health to"
          onChange={weekendHealth => setDraft({ ...draft, weekendHealth })}
          step={0.05}
          value={draft.weekendHealth}
        />
        <NumberField
          error={errors.maxSlippage}
          helper="Against the Venus oracle price. PancakeSwap usually fills about 0.3% to 0.5% below it."
          label="Max slippage (%)"
          onChange={maxSlippage => setDraft({ ...draft, maxSlippage })}
          scale={100}
          step={0.1}
          value={draft.maxSlippage}
        />
        <FormControl isInvalid={Boolean(errors.sellable)}>
          <FormLabel fontSize="sm" mb="xs">
            Halyard may sell
          </FormLabel>
          {held.length === 0 ? (
            <Text color="font.secondary" fontSize="sm">
              You have no TSLAB, NVDAB or SPCXB supplied on Venus.
            </Text>
          ) : (
            <HStack spacing="lg" wrap="wrap">
              {held.map(b => (
                <Checkbox
                  isChecked={draft.sellable.includes(b.vToken)}
                  key={b.vToken}
                  onChange={() => toggle(b.vToken)}
                >
                  {b.symbol}
                </Checkbox>
              ))}
            </HStack>
          )}
          <FormErrorMessage>{errors.sellable}</FormErrorMessage>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm" mb="xs">
            Valid for
          </FormLabel>
          <Select
            onChange={e => setDraft({ ...draft, expiryDays: Number(e.target.value) })}
            value={draft.expiryDays}
          >
            {EXPIRY_OPTIONS.map(days => (
              <option key={days} value={days}>
                {days} days
              </option>
            ))}
          </Select>
        </FormControl>
        <Divider />
        <Text color="font.secondary" fontSize="sm">
          Each run costs {fmtPct(FEE)} of the amount sold as a protocol fee plus {fmtPct(TIP)} for
          the keeper who runs it. Nothing is charged while Halyard does not act.
        </Text>
      </VStack>
    </Card>
  )
}

function PlanRows({ plan }: { plan: SimulatedPlan }) {
  return (
    <VStack align="start" fontSize="sm" spacing="0">
      <Text>
        Sell ~{fmtBStockAmount(plan.seize, plan.uiMultiplier)} {plan.symbol} ({fmtUsd(plan.sellUsd)}
        )
      </Text>
      <Text>Repay ~{fmtUsd(plan.repayUsdt)} of USDT debt</Text>
      <Text color="font.secondary">
        Fee {fmtUsd(plan.feeUsdt)} · keeper tip {fmtUsd(plan.tipUsdt)}
      </Text>
      <Text fontWeight="bold">
        Health {plan.fromHealth.toFixed(2)} → {plan.afterHealth.toFixed(2)} or higher
      </Text>
    </VStack>
  )
}

function Scenario({ title, children }: { title: string; children: ReactNode }) {
  return (
    <VStack align="start" spacing="xs">
      <Text fontSize="sm" fontWeight="bold">
        {title}
      </Text>
      {children}
    </VStack>
  )
}

function Preview({ position, draft }: { position: Position; draft: PolicyDraft }) {
  const { data: now } = useCanProtect(position.account)
  const valid = Object.keys(validatePolicy(draft)).length === 0

  const drop = dropToHealth(position, draft.minHealth)

  const lowHealthPlan =
    valid && position.health < draft.minHealth
      ? simulatePlan(position, draft.sellable, draft.maxSlippage, draft.targetHealth)
      : valid && drop !== null
        ? simulatePlan(position, draft.sellable, draft.maxSlippage, draft.targetHealth, drop)
        : null

  const weekendPlan = valid
    ? simulatePlan(position, draft.sellable, draft.maxSlippage, draft.weekendHealth)
    : null

  const quotePlan = weekendPlan ?? lowHealthPlan
  const quoteToken = quotePlan ? bStockByVToken(quotePlan.vCollateral)?.token : undefined
  const { data: quoteOut } = useSwapQuote(quoteToken, quotePlan?.seize)

  // Compare the live PancakeSwap quote with the oracle value of the same amount at today's price.
  const quoteAsset = quotePlan
    ? position.assets.find(a => a.vToken.toLowerCase() === quotePlan.vCollateral.toLowerCase())
    : undefined

  const discount =
    quotePlan && quoteAsset && quoteOut !== undefined
      ? 1 - quoteOut / (quotePlan.seize * quoteAsset.price)
      : null

  return (
    <Card h="full">
      <VStack align="stretch" spacing="md">
        <Label>What Halyard would do</Label>
        <HStack justify="space-between">
          <Text fontSize="sm">Your health now</Text>
          <Text color={healthColor(position.health)} fontSize="2xl" fontWeight="bold">
            {fmtHealth(position.health)}
          </Text>
        </HStack>
        <Divider />
        {!valid ? (
          <Text color="font.secondary" fontSize="sm">
            Fix the policy fields to see a preview.
          </Text>
        ) : (
          <>
            <Scenario
              title={
                position.health < draft.minHealth
                  ? `Health is already below ${draft.minHealth.toFixed(2)}, so Halyard would act right away`
                  : drop !== null
                    ? `If bStocks fall ${fmtPct(drop)} and health hits ${draft.minHealth.toFixed(2)}`
                    : `If health hits ${draft.minHealth.toFixed(2)}`
              }
            >
              {lowHealthPlan ? (
                <PlanRows plan={lowHealthPlan} />
              ) : (
                <Text color="font.secondary" fontSize="sm">
                  {drop === null && position.health >= draft.minHealth
                    ? 'Your bStocks alone cannot push health that low.'
                    : 'No sale needed or the selected bStocks cannot cover it.'}
                </Text>
              )}
            </Scenario>
            <Scenario
              title={`Before the next weekend close, to ${draft.weekendHealth.toFixed(2)} at today's prices`}
            >
              {weekendPlan ? (
                <PlanRows plan={weekendPlan} />
              ) : (
                <Text color="font.secondary" fontSize="sm">
                  Health is already above {draft.weekendHealth.toFixed(2)}, nothing to sell.
                </Text>
              )}
            </Scenario>
            {discount !== null && (
              <Text
                color={discount > draft.maxSlippage ? STATUS_COLORS.danger : 'font.secondary'}
                fontSize="xs"
              >
                PancakeSwap pays {fmtPct(discount, 2)} below the oracle for this size right now.
                {discount > draft.maxSlippage
                  ? ' That is more than your max slippage, so the swap would revert.'
                  : ''}
              </Text>
            )}
          </>
        )}
        <Divider />
        <Scenario title="Right now (HalyardVault.canProtect)">
          <Text color="font.secondary" fontSize="sm">
            {!now
              ? 'Checking…'
              : now.trigger
                ? `${now.trigger}: a keeper can repay ${fmtUsd(now.repayUsdt)} now by selling ${fmtAmount(now.seize)} ${bStockByVToken(now.vCollateral)?.symbol ?? ''}.`
                : 'Nothing to do. Halyard only acts under your saved policy.'}
          </Text>
        </Scenario>
      </VStack>
    </Card>
  )
}

function Step({
  done,
  title,
  detail,
  action,
}: {
  done: boolean
  title: string
  detail: string
  action: ReactNode
}) {
  return (
    <Stack
      align={{ base: 'start', md: 'center' }}
      direction={{ base: 'column', md: 'row' }}
      justify="space-between"
      spacing="sm"
    >
      <HStack align="start" spacing="sm">
        <Center
          bg={done ? STATUS_COLORS.success : 'background.level4'}
          borderColor="border.base"
          borderWidth={done ? 0 : '1px'}
          color="white"
          h="22px"
          mt="2px"
          rounded="full"
          w="22px"
        >
          {done && <Check size={14} />}
        </Center>
        <VStack align="start" spacing="0">
          <Text fontWeight="bold">{title}</Text>
          <Text color="font.secondary" fontSize="sm">
            {detail}
          </Text>
        </VStack>
      </HStack>
      {action}
    </Stack>
  )
}

function samePolicy(position: Position, draft: PolicyDraft) {
  const p = position.policy
  if (!p) return false
  const same = (a: number, b: number) => Math.abs(a - b) < 1e-9

  const sellable = (list: string[]) =>
    list
      .map(v => v.toLowerCase())
      .sort()
      .join()

  return (
    same(p.minHealth, draft.minHealth) &&
    same(p.targetHealth, draft.targetHealth) &&
    same(p.weekendHealth, draft.weekendHealth) &&
    same(p.maxSlippage, draft.maxSlippage) &&
    sellable(p.sellable) === sellable(draft.sellable)
  )
}

function Activate({ position, draft }: { position: Position; draft: PolicyDraft }) {
  const now = useNow()
  const { tx, send, busy } = useHalyardTx()
  const valid = Object.keys(validatePolicy(draft)).length === 0
  const policyLive = position.policy !== null && position.policy.expiry > now
  const policySaved = policyLive && samePolicy(position, draft)

  function saveDraft() {
    send('Save policy', {
      address: HALYARD_VAULT,
      abi: halyardVaultAbi,
      functionName: 'setPolicy',
      args: [
        {
          minHealthBps: Math.round(draft.minHealth * 10_000),
          targetHealthBps: Math.round(draft.targetHealth * 10_000),
          weekendHealthBps: Math.round(draft.weekendHealth * 10_000),
          maxSlippageBps: Math.round(draft.maxSlippage * 10_000),
          expiry: now + draft.expiryDays * DAY,
          sellable: draft.sellable,
        },
      ],
    })
  }

  return (
    <Card>
      <VStack align="stretch" spacing="md">
        <Label>Activate</Label>
        <Step
          action={
            <Button
              isDisabled={position.delegated || busy}
              onClick={() =>
                send('Allow Halyard on Venus', {
                  address: VENUS_COMPTROLLER,
                  abi: venusComptrollerAbi,
                  functionName: 'updateDelegate',
                  args: [HALYARD_VAULT, true],
                })
              }
              size="sm"
              variant={position.delegated ? 'tertiary' : 'primary'}
            >
              {position.delegated ? 'Allowed' : 'Allow'}
            </Button>
          }
          detail="Venus updateDelegate. Lets HalyardVault repay your debt and redeem collateral for you. It has no code path that borrows."
          done={position.delegated}
          title="1. Allow Halyard on Venus"
        />
        <Step
          action={
            <Button
              isDisabled={!valid || policySaved || busy}
              onClick={saveDraft}
              size="sm"
              variant={policySaved ? 'tertiary' : 'primary'}
            >
              {policySaved ? 'Saved' : policyLive ? 'Update policy' : 'Save policy'}
            </Button>
          }
          detail={
            policyLive
              ? `A policy is active until ${new Date(position.policy!.expiry * 1000).toLocaleDateString()}.`
              : 'HalyardVault setPolicy with the values above.'
          }
          done={policySaved}
          title="2. Save your policy"
        />
        <Divider />
        <Stack
          align={{ base: 'start', md: 'center' }}
          direction={{ base: 'column', md: 'row' }}
          justify="space-between"
          spacing="sm"
        >
          <Text color="font.secondary" fontSize="sm">
            Turn Halyard off: clear the policy, then remove the Venus delegation.
          </Text>
          <HStack>
            <Button
              isDisabled={!position.policy || busy}
              onClick={() =>
                send('Clear policy', {
                  address: HALYARD_VAULT,
                  abi: halyardVaultAbi,
                  functionName: 'clearPolicy',
                })
              }
              size="sm"
              variant="secondary"
            >
              Clear policy
            </Button>
            <Button
              isDisabled={!position.delegated || busy}
              onClick={() =>
                send('Remove delegation', {
                  address: VENUS_COMPTROLLER,
                  abi: venusComptrollerAbi,
                  functionName: 'updateDelegate',
                  args: [HALYARD_VAULT, false],
                })
              }
              size="sm"
              variant="secondary"
            >
              Remove delegation
            </Button>
          </HStack>
        </Stack>
        <TxStatus tx={tx} />
      </VStack>
    </Card>
  )
}

function useDraft(position: Position | undefined) {
  const [draft, setDraft] = useState<PolicyDraft | null>(null)

  useEffect(() => {
    if (!position || draft) return

    const held = BSTOCKS.filter(b =>
      position.assets.some(a => a.vToken.toLowerCase() === b.vToken.toLowerCase() && a.supplied > 0)
    ).map(b => b.vToken)

    const p = position.policy

    setDraft(
      p
        ? {
            minHealth: p.minHealth,
            targetHealth: p.targetHealth,
            weekendHealth: p.weekendHealth,
            maxSlippage: p.maxSlippage,
            expiryDays: 90,
            sellable: p.sellable,
          }
        : { ...DEFAULT_DRAFT, sellable: held }
    )
  }, [position, draft])

  return [draft, setDraft] as const
}

export function Protect() {
  const { address } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { data: position, isLoading } = usePosition(address)
  const [draft, setDraft] = useDraft(position)

  const status = useMemo(() => {
    if (!position) return null

    if (position.policy && position.delegated) {
      return { label: 'Protected', color: STATUS_COLORS.success }
    }

    if (position.policy || position.delegated) {
      return { label: 'Setup incomplete', color: STATUS_COLORS.warning }
    }

    return { label: 'Not protected', color: 'font.secondary' }
  }, [position])

  return (
    <VStack align="stretch" spacing="md" w="full">
      <Stack
        align={{ base: 'start', md: 'end' }}
        direction={{ base: 'column', md: 'row' }}
        justify="space-between"
      >
        <VStack align="start" spacing="xs">
          <Heading as="h1" letterSpacing="-0.04rem" size="xl">
            Protect
          </Heading>
          <Text color="font.secondary" fontSize="sm">
            Set when Halyard de-risks your Venus loan. You can change or turn it off any time.
          </Text>
        </VStack>
        {position && status && position.debtUsd > 0 && (
          <HStack spacing="sm">
            <Text color={healthColor(position.health)} fontWeight="bold">
              Health {fmtHealth(position.health)}
            </Text>
            <Text color="font.secondary">·</Text>
            <Box bg={status.color} h="8px" rounded="full" w="8px" />
            <Text fontWeight="medium">{status.label}</Text>
          </HStack>
        )}
      </Stack>

      {!address ? (
        <Card>
          <Center flexDirection="column" gap="md" py="xl" textAlign="center">
            <Heading size="md">Connect the wallet that holds your Venus position</Heading>
            <Text color="font.secondary" maxW="lg">
              Protection is set with transactions from your own wallet. To look at another account,
              use the Dashboard.
            </Text>
            <Button onClick={openConnectModal} variant="primary">
              Connect wallet
            </Button>
          </Center>
        </Card>
      ) : isLoading || !draft || !position ? (
        <Grid gap="md" templateColumns={{ base: '1fr', lg: '1fr 1fr' }}>
          <Skeleton h="420px" rounded="lg" />
          <Skeleton h="420px" rounded="lg" />
        </Grid>
      ) : position.debtUsd === 0 ? (
        <Card>
          <Center flexDirection="column" gap="sm" py="xl" textAlign="center">
            <Heading size="md">No debt to protect</Heading>
            <Text color="font.secondary" maxW="lg">
              Halyard protects loans backed by TSLAB, NVDAB or SPCXB on Venus. Supply a bStock and
              borrow USDT on Venus first.
            </Text>
          </Center>
        </Card>
      ) : (
        <>
          <Grid gap="md" templateColumns={{ base: '1fr', lg: '1fr 1fr' }}>
            <PolicyForm draft={draft} position={position} setDraft={setDraft} />
            <Preview draft={draft} position={position} />
          </Grid>
          <Activate draft={draft} position={position} />
          <ProtectionsCard account={position.account} limit={100} title="History" />
        </>
      )}
    </VStack>
  )
}
