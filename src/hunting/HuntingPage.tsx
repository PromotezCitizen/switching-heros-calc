import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Group, Paper, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { readAccountInputs } from '../account/accountKeys';
import { FlagField, NumberField, SelectField } from '../components/StoreFields';
import { readFlag, readNumber } from '../store/storedValues';
import { useCalcStore } from '../store/useCalcStore';
import { useShallow } from 'zustand/react/shallow';
import { CONSTS } from '../CONSTS';
import {
  RESOURCES,
  offlineEfficiency,
  scanFloors,
  type FloorScanRow,
  type HuntingInputs,
  type Resource,
} from './huntingCalc';
import { useStageRewards } from './useStageRewards';

const KEY_PREFIX = 'hunting.';
/** 계정 공통 칸 이름 앞부분 (account/accountKeys.ts 의 ACCOUNT_KEYS 가 모두 이 글로 시작) */
const ACCOUNT_KEY_PREFIX = 'account.';
const DEFAULTS = CONSTS.huntingDefaults;
const { MAX_TABLE_ROWS, EXPONENT_FORM_FROM, SMALL_VALUE_BELOW, SMALL_VALUE_DECIMALS, TABLE_MIN_WIDTH } = CONSTS.display;
const { RESULT_COLUMNS } = CONSTS.hunting;

/** 층 목록을 앞 반 · 뒤 반으로 나눈다 (홀수면 앞쪽이 한 줄 더) */
function splitInHalf<T>(items: T[]): T[][] {
  const middle = Math.ceil(items.length / 2);
  return [items.slice(0, middle), items.slice(middle)].filter((half) => half.length > 0);
}

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

/** 층 훑기 결과에 쓰지 않는 칸 (결과 표 강조·요약 글에만 쓰여 따로 구독한다) */
const MY_KILLS_KEY = `${KEY_PREFIX}myKills`;

/** 층 훑기에 쓰는 칸만 고른다: 사냥 칸 (내 처치 수 빼고) + 계정 칸. 다른 페이지 칸이 바뀌어도 이 페이지는 다시 그리지 않게 */
function pickScanValues(values: Record<string, string>): Record<string, string> {
  const picked: Record<string, string> = {};
  for (const key in values) {
    if (key === MY_KILLS_KEY) continue;
    if (key.startsWith(KEY_PREFIX) || key.startsWith(ACCOUNT_KEY_PREFIX)) picked[key] = values[key];
  }
  return picked;
}

export default function HuntingPage() {
  const { t: translate } = useTranslation();
  // 같은 칸 값이면 같은 결과로 보도록 얕은 비교 (칸 하나 바뀔 때마다 새 객체가 나와도 값이 같으면 다시 그리지 않음)
  const values = useCalcStore(useShallow((state) => pickScanValues(state.values)));
  const myKills = useCalcStore((state) => readNumber(state.values, MY_KILLS_KEY, DEFAULTS.myKills ?? 0));
  const stage = useStageRewards();

  const numberField = (key: string, label: string, min = 0) => (
    <NumberField storeKey={KEY_PREFIX + key} label={label} min={min} fallback={DEFAULTS[key] ?? 0} />
  );
  const flagField = (key: string, label: string) => <FlagField storeKey={KEY_PREFIX + key} label={label} />;

  const inputs: HuntingInputs = useMemo(() => {
    const account = readAccountInputs(values);
    const perResource = <T,>(build: (resource: Resource) => T) =>
      Object.fromEntries(RESOURCES.map((resource) => [resource, build(resource)])) as Record<Resource, T>;
    return {
      vipLevel: account.vipLevel,
      fairyLevel: account.fairyOn ? account.fairyLevel : CONSTS.emptyInput.LEVEL,
      otherAlwaysPercent: readNumber(values, `${KEY_PREFIX}otherAlways`, DEFAULTS.otherAlways),
      guildLevel: account.guildLevel,
      guildSkillLevels: account.guildSkillLevels,
      foodPercent: perResource((resource) => readNumber(values, `${KEY_PREFIX}food.${resource}`)),
      eventOn: perResource((resource) => readFlag(values, `${KEY_PREFIX}event.${resource}`)),
      packageOn: perResource((resource) => readFlag(values, `${KEY_PREFIX}package.${resource}`)),
      adOn: readFlag(values, `${KEY_PREFIX}adOn`),
      offlinePackageOn: readFlag(values, `${KEY_PREFIX}offlinePackageOn`),
      offlineFloor: readNumber(values, `${KEY_PREFIX}offlineFloor`, DEFAULTS.offlineFloor),
    };
  }, [values]);

  const rows = useMemo(() => {
    if (stage.status !== 'ready') return [];
    const read = (key: string) => readNumber(values, KEY_PREFIX + key, DEFAULTS[key] ?? 0);
    // 오프라인 받는 층에서 아래(낮은 층)로 내려가며 훑는다. 현재 층 위로는 올라갈 수 없다
    const lowestFloor = Math.max(inputs.offlineFloor - CONSTS.hunting.SCAN_DEPTH, CONSTS.hunting.MIN_FLOOR);
    return scanFloors(inputs, stage.rewards, inputs.offlineFloor, lowestFloor, read('scanStep'));
  }, [stage, inputs, values]);

  return (
    <Stack mt="lg" gap="md">
      <Text c="dimmed">{translate('hunting.intro')}</Text>
      <Text size="sm" c="dimmed">
        {translate('hunting.accountHint')}
      </Text>

      <Paper withBorder p="md">
        <Title order={3} mb="sm">{translate('hunting.offlineTitle')}</Title>
        {numberField('offlineFloor', translate('hunting.offlineFloor'), 1)}
        <Group mt="sm">
          {flagField('adOn', translate('hunting.adOn'))}
          {flagField('offlinePackageOn', translate('hunting.offlinePackageOn'))}
        </Group>
        <Text mt="sm" size="sm">
          {translate('hunting.offlineSummary', {
            kills: formatKills(offlineEfficiency(inputs) * CONSTS.common.SECONDS_PER_MINUTE),
          })}
        </Text>
      </Paper>

      <Paper withBorder p="md">
        <Title order={3} mb="sm">{translate('hunting.onlineTitle')}</Title>
        <Stack gap="sm">
          {numberField('otherAlways', translate('hunting.otherAlways'))}
          <SimpleGrid cols={{ base: 1, md: 3 }}>
            {RESOURCES.map((resource) => (
              <Stack key={resource} gap="xs">
                <Text fw={600}>{translate(`hunting.resource.${resource}`)}</Text>
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
        </Stack>
      </Paper>

      <Paper withBorder p="md">
        <Title order={3} mb="sm">{translate('hunting.scanTitle')}</Title>
        <SimpleGrid cols={{ base: 2, sm: 3 }}>
          {numberField('scanStep', translate('hunting.scanStep'), 1)}
          {numberField('myKills', translate('hunting.myKills'))}
        </SimpleGrid>
        {myKills > 0 && stage.status === 'ready' && (
          <Stack gap={2} mt="xs">
            {RESOURCES.map((resource) => {
              const lowestWorthFloor = lowestProfitableFloor(rows, resource, myKills);
              return (
                <Text key={resource} size="sm">
                  {lowestWorthFloor === null
                    ? translate('hunting.noProfitableFloor', { resource: translate(`hunting.resource.${resource}`), kills: myKills })
                    : translate('hunting.lowestProfitableFloor', {
                        resource: translate(`hunting.resource.${resource}`),
                        kills: myKills,
                        floor: lowestWorthFloor.toLocaleString('ko-KR'),
                      })}
                </Text>
              );
            })}
          </Stack>
        )}
      </Paper>

      <Title order={3}>{translate('hunting.resultTitle')}</Title>
      {stage.status === 'loading' && <Text>{translate('hunting.loading')}</Text>}
      {stage.status === 'failed' && <Alert color="red">{translate('hunting.loadFailed')}</Alert>}
      {stage.status === 'ready' && (
        <>
          {rows.length > MAX_TABLE_ROWS && (
            <Alert color="yellow">{translate('hunting.tooManyRows', { limit: MAX_TABLE_ROWS })}</Alert>
          )}
          {/* 넓은 화면 = 층 목록을 반씩 나눠 2열, 좁은 화면 = 1열 (반쪽 표가 위아래로) */}
          <SimpleGrid cols={RESULT_COLUMNS}>
            {splitInHalf(rows.slice(0, MAX_TABLE_ROWS)).map((halfRows, halfIndex) => (
              <Table.ScrollContainer key={halfIndex} minWidth={TABLE_MIN_WIDTH}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{translate('hunting.floor')}</Table.Th>
                      {RESOURCES.map((resource) => (
                        <Table.Th key={resource}>{translate(`hunting.resource.${resource}`)}</Table.Th>
                      ))}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {halfRows.map((row) => (
                      <Table.Tr key={row.floor}>
                        <Table.Td>{row.floor.toLocaleString('ko-KR')}</Table.Td>
                        {RESOURCES.map((resource) => {
                          const enough = myKills > 0 && myKills >= row.required[resource];
                          return (
                            <Table.Td key={resource} c={enough ? 'green' : undefined} fw={enough ? 700 : undefined}>
                              {formatKills(row.required[resource])}
                            </Table.Td>
                          );
                        })}
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            ))}
          </SimpleGrid>
        </>
      )}
    </Stack>
  );
}
