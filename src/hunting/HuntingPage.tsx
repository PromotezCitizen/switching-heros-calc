/**
 * 사냥 계산기: 온라인 효율 계산기 (floor-calc) 를 옮김 (사용자 지시 2026-11-07 "전부 다 가져온다").
 * 25층 벽 목록 · 목표 레벨까지 시간 · 도시락 · 오프라인/온라인 요약 · 1마리 보상 · 배수 · 제보 링크.
 * 좁은 화면은 floor-calc 처럼 층마다 카드, 넓은 화면은 한 줄에 층 하나씩 보는 표 (사용자 지시 "작을때는 저렇게 하고 클때는 어떻게 하는게 나을지")
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Anchor, Badge, Box, Group, Paper, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { useShallow } from 'zustand/react/shallow';
import { ACCOUNT_KEYS, readAccountInputs } from '@/account/accountKeys';
import { formatLog } from '@/calc/gameNumber';
import { FlagField, NumberField, SelectField } from '@/components/StoreFields';
import { CONSTS } from '@/CONSTS';
import {
  RESOURCES,
  baseRewardLog,
  durationParts,
  expPerMinuteLog,
  floorRows,
  lunchboxCount,
  offlineBonusPercent,
  offlineEfficiency,
  onlineBonusPercent,
  type FloorScanRow,
  type HuntingInputs,
  type Resource,
} from '@/hunting/huntingCalc';
import { HUNTING_KEY_PREFIX, HUNTING_KEYS } from '@/hunting/huntingKeys';
import { expToTargetLog } from '@/hunting/levelExp';
import { useStageRewards } from '@/hunting/useStageRewards';
import { readFlag, readNumber } from '@/store/storedValues';
import { useCalcStore } from '@/store/useCalcStore';

const KEY_PREFIX = HUNTING_KEY_PREFIX;
/** 계정 공통 칸 이름 앞부분 (account/accountKeys.ts 의 ACCOUNT_KEYS 가 모두 이 글로 시작) */
const ACCOUNT_KEY_PREFIX = 'account.';
const DEFAULTS = CONSTS.huntingDefaults;
const { EXPONENT_FORM_FROM, SMALL_VALUE_BELOW, SMALL_VALUE_DECIMALS } = CONSTS.display;
const { WALL_STEP, WIDE_FROM, REPORT_URL, RATIO_DECIMALS, DAY_DECIMALS } = CONSTS.hunting;
const { SECONDS_PER_MINUTE } = CONSTS.common;
/** 요약 숫자 카드 열 수: 좁으면 2, 넓으면 4 (분당 처치 + 자원 3개) */
const SUMMARY_COLUMNS = { base: 2, md: 4 };
const KEYS = {
  myKills: `${KEY_PREFIX}myKills`,
  currentExpPercent: `${KEY_PREFIX}currentExpPercent`,
  targetLevel: `${KEY_PREFIX}targetLevel`,
};

/** 위(오프라인 층)에서 아래로 내려가며 내 처치 수로 필요 처치 수를 채우는 가장 낮은 층. 하나도 못 채우면 null */
function lowestProfitableFloor(rows: FloorScanRow[], resource: Resource, myKills: number): number | null {
  let lowest: number | null = null;
  for (const row of rows) {
    if (row.required[resource] > myKills) break;
    lowest = row.floor;
  }
  return lowest;
}

function formatKills(killsPerMinute: number): string {
  if (!Number.isFinite(killsPerMinute)) return '-';
  if (killsPerMinute >= EXPONENT_FORM_FROM) return killsPerMinute.toExponential(SMALL_VALUE_DECIMALS);
  return killsPerMinute.toLocaleString('ko-KR', {
    maximumFractionDigits: killsPerMinute < SMALL_VALUE_BELOW ? SMALL_VALUE_DECIMALS : 0,
  });
}

/** 층 목록에 쓰는 칸만 고른다: 사냥 칸 + 계정 칸 + 유저 레벨. 다른 페이지 칸이 바뀌어도 이 페이지는 다시 그리지 않게 */
function pickPageValues(values: Record<string, string>): Record<string, string> {
  const picked: Record<string, string> = {};
  for (const key in values) {
    if (key.startsWith(KEY_PREFIX) || key.startsWith(ACCOUNT_KEY_PREFIX) || key === ACCOUNT_KEYS.userLevel) picked[key] = values[key];
  }
  return picked;
}

/** 층 하나의 화면용 값 */
interface FloorView {
  row: FloorScanRow;
  /** 1마리 기본 보상 (보너스 전). 게임 표에서 경험치와 골드는 같은 값 */
  goldLog: number;
  expLog: number;
  /** 자원별 배수 = 내 처치 수 ÷ 필요 처치 수 */
  ratio: Record<Resource, number>;
  /** 목표 레벨까지 걸리는 시간 (분), 레벨을 안 넣었으면 null */
  targetMinutes: { online: number; offline: number } | null;
}

export default function HuntingPage() {
  const { t: translate } = useTranslation();
  const values = useCalcStore(useShallow((state) => pickPageValues(state.values)));
  const stage = useStageRewards();

  const numberField = (key: string, label: string, min = 0, max?: number) => (
    <NumberField storeKey={KEY_PREFIX + key} label={label} min={min} max={max} fallback={DEFAULTS[key] ?? 0} />
  );
  const flagField = (key: string, label: string) => <FlagField storeKey={KEY_PREFIX + key} label={label} />;

  const inputs: HuntingInputs = useMemo(() => {
    const account = readAccountInputs(values);
    const perResource = <T,>(build: (resource: Resource) => T) =>
      Object.fromEntries(RESOURCES.map((resource) => [resource, build(resource)])) as Record<Resource, T>;
    return {
      vipLevel: account.vipLevel,
      fairyLevel: account.fairyLevel,
      adRemoved: account.adRemoved,
      fairyOn: account.huntingFairyOn,
      guildLevel: account.guildLevel,
      guildSkillLevels: account.guildSkillLevels,
      foodPercent: perResource((resource) => readNumber(values, `${KEY_PREFIX}food.${resource}`)),
      eventOn: perResource((resource) => readFlag(values, `${KEY_PREFIX}event.${resource}`)),
      packageOn: perResource((resource) => readFlag(values, `${KEY_PREFIX}package.${resource}`)),
      adOn: readFlag(values, `${KEY_PREFIX}adOn`),
      offlinePackageOn: readFlag(values, `${KEY_PREFIX}offlinePackageOn`),
      offlineFloor: readNumber(values, HUNTING_KEYS.offlineFloor, DEFAULTS.offlineFloor),
    };
  }, [values]);
  // 비우면 800 (floor-calc 와 같음)
  const myKills = readNumber(values, KEYS.myKills, DEFAULTS.myKills) || DEFAULTS.myKills;

  // 목표 레벨까지 필요 경험치: 레벨 칸이 바뀔 때만 다시 (레벨 차가 크면 반복이 길다)
  const userLevel = Math.floor(readNumber(values, ACCOUNT_KEYS.userLevel));
  const expPercent = readNumber(values, KEYS.currentExpPercent);
  const targetLevel = Math.floor(readNumber(values, KEYS.targetLevel));
  const targetLog = useMemo(() => expToTargetLog(userLevel, expPercent, targetLevel), [userLevel, expPercent, targetLevel]);

  const result = useMemo(() => {
    if (stage.status !== 'ready') return null;
    const rewards = stage.rewards;
    if (inputs.offlineFloor < 1 || inputs.offlineFloor > rewards.count) return { kind: 'badFloor', max: rewards.count } as const;
    const { rows, cut } = floorRows(inputs, rewards, myKills);
    const views: FloorView[] = rows.map((row) => {
      const perMinute = expPerMinuteLog(inputs, rewards, row.floor, myKills);
      const base = baseRewardLog(rewards, row.floor);
      return {
        row,
        goldLog: base.gold,
        expLog: base.exp,
        ratio: Object.fromEntries(RESOURCES.map((resource) => [resource, myKills / row.required[resource]])) as Record<Resource, number>,
        targetMinutes:
          targetLog === null
            ? null
            : { online: Math.pow(10, targetLog - perMinute.online), offline: Math.pow(10, targetLog - perMinute.offline) },
      };
    });
    const lunchbox = targetLog === null ? null : lunchboxCount(targetLog, inputs, rewards);
    return { kind: 'ok', views, cut, lunchbox } as const;
  }, [stage, inputs, myKills, targetLog]);

  const resourceName = (resource: Resource) => translate(`hunting.resource.${resource}`);
  const kindText = (row: FloorScanRow) => translate(`hunting.kind.${row.kind}`);
  const durationText = (minutes: number) => {
    const parts = durationParts(minutes);
    if (parts.kind === 'over') return translate('hunting.duration.over', { days: parts.days });
    if (parts.kind === 'unknown') return '-';
    if (parts.kind === 'minutes') return translate('hunting.duration.minutes', { minutes: parts.minutes });
    if (parts.kind === 'days')
      return translate('hunting.duration.days', { hours: parts.hours.toLocaleString('ko-KR'), days: parts.days.toFixed(DAY_DECIMALS) });
    return parts.minutes === 0
      ? translate('hunting.duration.hours', { hours: parts.hours })
      : translate('hunting.duration.hoursMinutes', { hours: parts.hours, minutes: parts.minutes });
  };
  const tone = (ratio: number) => (ratio >= 1 ? 'green' : 'red');
  const wallBadge = (row: FloorScanRow) =>
    row.floor % WALL_STEP === 0 ? (
      <Badge color="red" variant="light" size="sm">
        {translate('hunting.notRecommended')}
      </Badge>
    ) : null;
  const ratioText = (ratio: number) => translate('hunting.ratio', { ratio: ratio.toFixed(RATIO_DECIMALS) });

  const offlineKills = offlineEfficiency(inputs) * SECONDS_PER_MINUTE;

  return (
    <Stack mt="lg" gap="md">
      <Text c="dimmed">{translate('hunting.intro')}</Text>
      <Text size="sm" c="dimmed">
        {translate('hunting.accountHint')}
      </Text>

      <Paper withBorder p="md">
        <Title order={3} mb="sm">{translate('hunting.floorTitle')}</Title>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {numberField('offlineFloor', translate('hunting.offlineFloor'), 1)}
          <NumberField storeKey={KEYS.myKills} label={translate('hunting.myKills')} min={0} fallback={DEFAULTS.myKills} />
        </SimpleGrid>
        <Group mt="sm">
          {flagField('adOn', translate('hunting.adOn'))}
          {flagField('offlinePackageOn', translate('hunting.offlinePackageOn'))}
        </Group>
        <Text mt="xs" size="xs" c="dimmed">
          {translate('hunting.wallNote')}
        </Text>
      </Paper>

      <Paper withBorder p="md">
        <Title order={3} mb="sm">{translate('hunting.levelTitle')}</Title>
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <NumberField storeKey={ACCOUNT_KEYS.userLevel} label={translate('hunting.currentLevel')} min={0} />
          {numberField('currentExpPercent', translate('hunting.currentExpPercent'), 0, 100)}
          {numberField('targetLevel', translate('hunting.targetLevel'), 0)}
        </SimpleGrid>
        <Text mt="xs" size="xs" c="dimmed">
          {translate('hunting.levelNote')}
        </Text>
      </Paper>

      <Paper withBorder p="md">
        <Title order={3} mb="sm">{translate('hunting.onlineTitle')}</Title>
        <SimpleGrid cols={{ base: 1, md: 3 }}>
          {RESOURCES.map((resource) => (
            <Stack key={resource} gap="xs">
              <Text fw={600}>{resourceName(resource)}</Text>
              <SelectField
                storeKey={`${KEY_PREFIX}food.${resource}`}
                label={translate('hunting.food')}
                options={[
                  { value: String(CONSTS.emptyInput.PERCENT), label: translate('hunting.foodNone') },
                  ...CONSTS.onlineBonus.FOOD_PERCENTS.map((percent) => ({ value: String(percent), label: `+${percent}%` })),
                ]}
              />
              {flagField(`event.${resource}`, translate('hunting.eventOn'))}
              {flagField(`package.${resource}`, translate('hunting.packageOn'))}
            </Stack>
          ))}
        </SimpleGrid>
        <Text mt="xs" size="xs" c="dimmed">
          {translate('hunting.bonusScopeNote')}
        </Text>
      </Paper>

      <Title order={3}>{translate('hunting.resultTitle')}</Title>
      <Text size="sm" c="dimmed">
        {translate('hunting.resultNote', { kills: myKills.toLocaleString('ko-KR') })}
      </Text>
      {stage.status === 'loading' && <Text>{translate('hunting.loading')}</Text>}
      {stage.status === 'failed' && <Alert color="red">{translate('hunting.loadFailed')}</Alert>}
      {result?.kind === 'badFloor' && <Alert color="yellow">{translate('hunting.badFloor', { max: result.max })}</Alert>}
      {result?.kind === 'ok' && (
        <Stack gap="sm">
          {/* 요약: 항목마다 숫자 카드 (오프라인 → 온라인), 사용자 결정 2026-11-07 "1 - 2" (표가 작아 안 보임 → 숫자 카드) */}
          <SimpleGrid cols={SUMMARY_COLUMNS}>
            {[
              {
                label: translate('hunting.killsPerMinute'),
                offline: translate('hunting.killsUnit', { kills: Math.round(offlineKills).toLocaleString('ko-KR') }),
                online: translate('hunting.killsUnit', { kills: myKills.toLocaleString('ko-KR') }),
              },
              ...RESOURCES.map((resource) => ({
                label: translate('hunting.bonusRow', { resource: resourceName(resource) }),
                offline: `${offlineBonusPercent(inputs, resource)}%`,
                online: `${onlineBonusPercent(inputs, resource)}%`,
              })),
            ].map((item) => (
              <Paper key={item.label} withBorder p="md">
                <Text size="sm" c="dimmed">
                  {item.label}
                </Text>
                <SimpleGrid cols={2} mt={4} spacing="xs">
                  <Box>
                    <Text size="xs" c="dimmed">
                      {translate('hunting.offline')}
                    </Text>
                    <Text size="xl" fw={700}>
                      {item.offline}
                    </Text>
                  </Box>
                  <Box>
                    <Text size="xs" c="dimmed">
                      {translate('hunting.online')}
                    </Text>
                    <Text size="xl" fw={700}>
                      {item.online}
                    </Text>
                  </Box>
                </SimpleGrid>
              </Paper>
            ))}
          </SimpleGrid>

          {result.lunchbox && (
            <Text size="sm">
              {translate(result.lunchbox.over ? 'hunting.lunchboxOver' : 'hunting.lunchbox', {
                count: result.lunchbox.count.toLocaleString('ko-KR'),
              })}
            </Text>
          )}
          <Stack gap={2}>
            {RESOURCES.map((resource) => {
              const lowest = lowestProfitableFloor(
                result.views.map((view) => view.row),
                resource,
                myKills,
              );
              return (
                <Text key={resource} size="sm">
                  {lowest === null
                    ? translate('hunting.noProfitableFloor', { resource: resourceName(resource), kills: myKills })
                    : translate('hunting.lowestProfitableFloor', {
                        resource: resourceName(resource),
                        kills: myKills,
                        floor: lowest.toLocaleString('ko-KR'),
                      })}
                </Text>
              );
            })}
          </Stack>

          {/* 좁은 화면: 층마다 카드 (floor-calc 와 같은 모양) */}
          <Stack gap="xs" hiddenFrom={WIDE_FROM}>
            {result.views.map((view) => (
              <Paper key={view.row.floor} withBorder p="sm">
                <Group gap={6} wrap="wrap">
                  <Text fw={700}>{translate('hunting.floorLabel', { floor: view.row.floor.toLocaleString('ko-KR') })}</Text>
                  <Text size="sm" c="dimmed">
                    {kindText(view.row)}
                  </Text>
                  {wallBadge(view.row)}
                  <Text size="sm" c="dimmed">
                    {translate('hunting.perKill', { gold: formatLog(view.goldLog), exp: formatLog(view.expLog) })}
                  </Text>
                </Group>
                <SimpleGrid cols={3} mt={6} spacing="xs">
                  {RESOURCES.map((resource) => (
                    <Box key={resource}>
                      <Text size="xs" c="dimmed">
                        {resourceName(resource)}
                      </Text>
                      <Text fw={700} c={tone(view.ratio[resource])}>
                        {translate('hunting.killsUnit', { kills: formatKills(view.row.required[resource]) })}
                      </Text>
                      <Text size="xs" c={tone(view.ratio[resource])}>
                        {ratioText(view.ratio[resource])}
                      </Text>
                    </Box>
                  ))}
                </SimpleGrid>
                {view.targetMinutes && (
                  <Text size="xs" c="dimmed" mt={4}>
                    {translate('hunting.targetTime', {
                      online: durationText(view.targetMinutes.online),
                      offline: durationText(view.targetMinutes.offline),
                    })}
                  </Text>
                )}
              </Paper>
            ))}
          </Stack>

          {/* 넓은 화면: 한 줄에 층 하나 — 자원 세 가지와 목표 시간을 옆으로 비교 */}
          <Box visibleFrom={WIDE_FROM}>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{translate('hunting.floor')}</Table.Th>
                  <Table.Th>{translate('hunting.kindHeader')}</Table.Th>
                  <Table.Th>{translate('hunting.perKillExpHeader')}</Table.Th>
                  <Table.Th>{translate('hunting.perKillGoldHeader')}</Table.Th>
                  {RESOURCES.map((resource) => (
                    <Table.Th key={resource}>{resourceName(resource)}</Table.Th>
                  ))}
                  {targetLog !== null && (
                    <>
                      <Table.Th>{translate('hunting.targetOnline')}</Table.Th>
                      <Table.Th>{translate('hunting.targetOffline')}</Table.Th>
                    </>
                  )}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {result.views.map((view) => (
                  <Table.Tr key={view.row.floor}>
                    <Table.Td fw={700}>{view.row.floor.toLocaleString('ko-KR')}</Table.Td>
                    <Table.Td>
                      <Group gap={6} wrap="nowrap">
                        {kindText(view.row)}
                        {wallBadge(view.row)}
                      </Group>
                    </Table.Td>
                    <Table.Td>{formatLog(view.expLog)}</Table.Td>
                    <Table.Td>{formatLog(view.goldLog)}</Table.Td>
                    {RESOURCES.map((resource) => (
                      <Table.Td key={resource} c={tone(view.ratio[resource])}>
                        <Text span fw={700} inherit>
                          {translate('hunting.killsUnit', { kills: formatKills(view.row.required[resource]) })}
                        </Text>{' '}
                        <Text span size="xs" inherit>
                          ({ratioText(view.ratio[resource])})
                        </Text>
                      </Table.Td>
                    ))}
                    {view.targetMinutes && (
                      <>
                        <Table.Td>{durationText(view.targetMinutes.online)}</Table.Td>
                        <Table.Td>{durationText(view.targetMinutes.offline)}</Table.Td>
                      </>
                    )}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>

          {result.cut && (
            <Alert color="gray" variant="light">
              {translate('hunting.cutNote')}
            </Alert>
          )}
        </Stack>
      )}

      <Text size="sm" c="dimmed">
        {translate('hunting.reportPrefix')}{' '}
        <Anchor href={REPORT_URL} target="_blank" rel="noopener">
          {translate('hunting.reportLink')}
        </Anchor>
      </Text>
    </Stack>
  );
}
