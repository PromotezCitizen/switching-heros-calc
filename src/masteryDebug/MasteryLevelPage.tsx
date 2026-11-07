import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Group, Loader, Stack, Table, Text, Title } from '@mantine/core';
import MasteryPanel from '@/calc/panels/MasteryPanel';
import { masteryLevel, masteryTotals, masteryTraits } from '@/calc/sources/masteryRuneBuff/mastery';
import type { StatDescriptions } from '@/calc/statText';
import type { CalcValues } from '@/calc/types';
import { ACCOUNT_KEYS } from '@/account/accountKeys';
import { useStatTables } from '@/data/statTables';
import { useJsonData } from '@/data/useJsonData';
import { vipMasteryPoints } from '@/masteryOptimizer/budget';
import { validateAllocation, type Allocation } from '@/masteryOptimizer/rules';
import { useCalcStore } from '@/store/useCalcStore';
import { readNumber } from '@/store/storedValues';

/** 특성 탭 패널이 읽는 표 (계산식 확인기 특성 탭과 같음) */
const TABLES = ['Mastery', 'Pet', 'Character', 'Skill', 'WeaponChar', 'Vip'] as const;
const NO_DESCRIPTIONS: StatDescriptions = {};
/** 레벨 1 에서 시작해 레벨업마다 특성 포인트 1 (budget.ts 와 같음) */
const FIRST_USER_LEVEL = 1;
const NO_LIMIT = Number.POSITIVE_INFINITY;

/**
 * 디버그: 특성을 직접 찍으면 그만큼 찍는 데 필요한 유저 레벨을 계산한다.
 * 필요 레벨 = max(포인트로 필요한 레벨 = 사용 포인트 − VIP 포인트 + 1, 찍은 특성 중 가장 높은 해금 레벨).
 * 찍은 값은 이 페이지에만 있고 계산식 확인기 특성 값과 섞이지 않는다
 */
export default function MasteryLevelPage() {
  const { t: translate } = useTranslation();
  const tables = useStatTables(TABLES);
  const descriptions = useJsonData<StatDescriptions>('statDescriptions.json');
  const vipLevel = useCalcStore((state) => readNumber(state.values, ACCOUNT_KEYS.vipLevel));
  const userLevel = useCalcStore((state) => readNumber(state.values, ACCOUNT_KEYS.userLevel));
  const [values, setValues] = useState<CalcValues>({});

  const result = useMemo(() => {
    if (tables.status !== 'ready' || !tables.data.Mastery) return null;
    const traits = masteryTraits(tables.data.Mastery);
    const allocation: Allocation = Object.fromEntries(traits.map((trait) => [trait.rNo, masteryLevel(values, trait)]));
    const picked = traits.filter((trait) => masteryLevel(values, trait) > 0);
    const points = masteryTotals(traits, values).points;
    const vipPoints = vipMasteryPoints(tables.data, vipLevel);
    const byPoints = Math.max(points - vipPoints + FIRST_USER_LEVEL, FIRST_USER_LEVEL);
    const byUnlock = Math.max(FIRST_USER_LEVEL, ...picked.map((trait) => trait.unlockLevel));
    const violations = validateAllocation(traits, allocation, NO_LIMIT, NO_LIMIT);
    const nameOf = (rNo: string | null) => (rNo ? translate(`calc.mastery.names.${rNo}`, { defaultValue: rNo }) : '');
    return {
      picked: picked.length,
      points,
      vipPoints,
      byPoints,
      byUnlock,
      required: Math.max(byPoints, byUnlock),
      previousStep: violations.filter((violation) => violation.kind === 'previousStep').map((violation) => nameOf(violation.rNo)),
      ultimateGate: violations.filter((violation) => violation.kind === 'ultimateGate').map((violation) => nameOf(violation.rNo)),
    };
  }, [tables, values, vipLevel, translate]);

  if (tables.status === 'failed') return <Alert color="red">{translate('masteryDebug.loadFailed')}</Alert>;
  if (tables.status !== 'ready' || !result) return <Loader />;

  const rows: [string, string][] = [
    [translate('masteryDebug.picked'), result.picked.toLocaleString('ko-KR')],
    [translate('masteryDebug.points'), result.points.toLocaleString('ko-KR')],
    [translate('masteryDebug.vipPoints', { vip: vipLevel }), result.vipPoints.toLocaleString('ko-KR')],
    [translate('masteryDebug.byPoints'), result.byPoints.toLocaleString('ko-KR')],
    [translate('masteryDebug.byUnlock'), result.byUnlock.toLocaleString('ko-KR')],
  ];
  return (
    <Stack mt="md" gap="sm">
      <Title order={3}>{translate('masteryDebug.title')}</Title>
      <Text size="sm" c="dimmed">
        {translate('masteryDebug.help')}
      </Text>
      <Group gap="md" align="flex-end">
        <Text fw={700} size="lg">
          {translate('masteryDebug.required', { level: result.required.toLocaleString('ko-KR') })}
        </Text>
        {userLevel > 0 && (
          <Text size="sm" c={userLevel >= result.required ? 'teal' : 'red'}>
            {translate('masteryDebug.current', { level: userLevel.toLocaleString('ko-KR'), gap: (result.required - userLevel).toLocaleString('ko-KR') })}
          </Text>
        )}
        <Button size="compact-sm" variant="default" onClick={() => setValues({})}>
          {translate('masteryDebug.reset')}
        </Button>
      </Group>
      <Table maw={420}>
        <Table.Tbody>
          {rows.map(([label, value]) => (
            <Table.Tr key={label}>
              <Table.Td>{label}</Table.Td>
              <Table.Td ta="right">{value}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      {result.previousStep.length > 0 && (
        <Alert color="yellow">{translate('masteryDebug.previousStep', { names: result.previousStep.join(', ') })}</Alert>
      )}
      {result.ultimateGate.length > 0 && (
        <Alert color="yellow">{translate('masteryDebug.ultimateGate', { names: result.ultimateGate.join(', ') })}</Alert>
      )}
      <MasteryPanel
        values={values}
        setValue={(fieldId, text) => setValues((previous) => ({ ...previous, [fieldId]: text }))}
        tables={tables.data}
        descriptions={descriptions.status === 'ready' ? descriptions.data : NO_DESCRIPTIONS}
      />
    </Stack>
  );
}
