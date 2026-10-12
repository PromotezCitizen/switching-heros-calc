/**
 * 종합 탭: 모든 탭의 줄을 합친 프로필 창 줄 (계산 값) 과 화면 값 비교, 하위 탭 묶음별 공격력 증가·체력 증가 몫.
 * 모든 칸을 읽으므로 칸 값이 바뀔 때마다 이 칸만 다시 그린다 (계산은 미뤄서 입력이 느려지지 않게)
 */
import { useDeferredValue, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Group, Stack, Table, Text, TextInput } from '@mantine/core';
import ChoiceChips from '../../components/ChoiceChips';
import SectionTitle from '../../components/SectionTitle';
import { CONSTS } from '../../CONSTS';
import type { StatTables } from '../../data/statTables';
import { readFlag } from '../../store/storedValues';
import { useCalcStore } from '../../store/useCalcStore';
import { formatLog } from '../gameNumber';
import { heroFirstRow, slotHeroName } from '../sources/hero/character';
import {
  compareWithScreen,
  groupSubtotals,
  linesByGroup,
  screenFieldId,
  summaryRows,
  summaryTarget,
  type SummaryRow,
} from '../sources/summary/summary';
import { calcValuesOf } from '../storeKeys';
import { CALC_TAB_GROUPS, groupTabs } from '../tabGroups';
import type { TabPanelProps } from '../types';

const {
  TAB_ID: SUMMARY_TAB_ID,
  SCREEN_INPUT_WIDTH,
  TABLE_MIN_WIDTH,
  SUBTOTAL_TABLE_MIN_WIDTH,
  RATIO_PLAIN_MAX_LOG,
  RATIO_SIGNIFICANT_DIGITS,
  TARGET_FIELD,
  TARGET_KINDS,
  DEFAULT_TARGET,
  ENEMY_COUNT_FIELD,
  ENEMY_COUNT_THRESHOLD,
} = CONSTS.summary;

/** 계산 값 표기: 0 이면 0, 계산할 수 없으면 - */
function formatRowValue(row: SummaryRow): string {
  if (row.log === null) return '-';
  const text = row.log === -Infinity ? '0' : formatLog(row.log);
  return row.percent ? `${text}%` : text;
}

/** 계산 값 ÷ 화면 값 (log10) → "×1.234" / "×12.3AB" / "÷12.3AB" */
function formatRatio(differenceLog: number): string {
  if (Math.abs(differenceLog) < RATIO_PLAIN_MAX_LOG) {
    return `×${Math.pow(10, differenceLog).toPrecision(RATIO_SIGNIFICANT_DIGITS)}`;
  }
  return differenceLog > 0 ? `×${formatLog(differenceLog)}` : `÷${formatLog(-differenceLog)}`;
}

/** 모든 탭 줄 → 프로필 줄 계산 값 + 묶음별 몫 */
function useSummary(tables: StatTables) {
  const storeValues = useCalcStore((state) => state.values);
  const deferredStoreValues = useDeferredValue(storeValues);
  return useMemo(() => {
    const values = calcValuesOf(deferredStoreValues);
    const groups = CALC_TAB_GROUPS.map((group) => ({
      id: group.id,
      tabs: groupTabs(group.tabIds).filter((tab) => tab.id !== SUMMARY_TAB_ID),
    }));
    const grouped = linesByGroup(groups, values, tables);
    const hero = heroFirstRow(tables, slotHeroName(values, tables));
    return {
      rows: summaryRows(
        grouped.flatMap((group) => group.lines),
        values,
        tables,
      ),
      subtotals: groupSubtotals(grouped, hero, summaryTarget(values)),
    };
  }, [deferredStoreValues, tables]);
}

export default function SummaryPanel({ values, setValue, tables }: TabPanelProps) {
  const { t: translate } = useTranslation();
  const { rows, subtotals } = useSummary(tables);
  const totalAttack = subtotals.reduce((sum, group) => sum + group.attack, 0);
  const totalHp = subtotals.reduce((sum, group) => sum + group.hp, 0);
  const target = summaryTarget(values);
  const enemyCountReached = readFlag(values, ENEMY_COUNT_FIELD);

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        {translate('calc.summary.help')}
      </Text>
      <Stack gap={4}>
        <ChoiceChips
          label={translate('calc.summary.target.label')}
          value={target}
          options={TARGET_KINDS.map((kind) => ({ value: kind, label: translate(`calc.summary.target.kinds.${kind}`) }))}
          onChange={(selected) => setValue(TARGET_FIELD, selected)}
        />
        <Text size="xs" c="dimmed">
          {translate('calc.summary.target.help')}
        </Text>
        {target !== DEFAULT_TARGET && (
          <Text size="xs" c="orange">
            {translate('calc.summary.target.screenCompareNote')}
          </Text>
        )}
      </Stack>
      <Stack gap={4}>
        <ChoiceChips
          label={translate('calc.summary.enemyCount.label', { threshold: ENEMY_COUNT_THRESHOLD })}
          value={enemyCountReached ? 'on' : 'off'}
          options={[
            { value: 'off', label: translate('calc.summary.enemyCount.off') },
            { value: 'on', label: translate('calc.summary.enemyCount.on') },
          ]}
          onChange={(selected) => setValue(ENEMY_COUNT_FIELD, String(selected === 'on'))}
        />
        <Text size="xs" c="dimmed">
          {translate('calc.summary.enemyCount.help', { threshold: ENEMY_COUNT_THRESHOLD })}
        </Text>
      </Stack>
      <Table.ScrollContainer minWidth={TABLE_MIN_WIDTH}>
        <Table verticalSpacing={4}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{translate('calc.summary.columns.line')}</Table.Th>
              <Table.Th ta="right">{translate('calc.summary.columns.calculated')}</Table.Th>
              <Table.Th>{translate('calc.summary.columns.screen')}</Table.Th>
              <Table.Th>{translate('calc.summary.columns.compare')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row) => {
              const fieldId = screenFieldId(row.id);
              const screenText = values[fieldId] ?? '';
              const comparison = compareWithScreen(row.log, screenText);
              const unreadable = screenText.trim() !== '' && comparison === null && row.log !== null;
              return (
                <Table.Tr key={row.id}>
                  <Table.Td>
                    <Group gap={4} wrap="nowrap">
                      <Text size="sm">{translate(`calc.summary.rows.${row.id}`)}</Text>
                      {row.estimated && (
                        <Badge size="xs" variant="light" color="gray">
                          {translate('calc.summary.estimated')}
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td ta="right">{formatRowValue(row)}</Table.Td>
                  <Table.Td>
                    <TextInput
                      size="xs"
                      w={SCREEN_INPUT_WIDTH}
                      aria-label={translate(`calc.summary.rows.${row.id}`)}
                      value={screenText}
                      error={unreadable}
                      onChange={(event) => setValue(fieldId, event.currentTarget.value)}
                    />
                  </Table.Td>
                  <Table.Td>
                    {unreadable && (
                      <Text size="sm" c="red">
                        {translate('calc.summary.unreadable')}
                      </Text>
                    )}
                    {comparison && (
                      <Text size="sm" c={comparison.same ? 'teal' : 'red'}>
                        {comparison.same
                          ? translate('calc.summary.same')
                          : `${translate('calc.summary.different')} ${formatRatio(comparison.differenceLog)}`}
                      </Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {rows.some((row) => row.estimated) && (
        <Text size="xs" c="dimmed">
          {translate('calc.summary.estimatedHelp')}
        </Text>
      )}

      <SectionTitle>{translate('calc.summary.subtotal.title')}</SectionTitle>
      <Text size="sm" c="dimmed">
        {translate('calc.summary.subtotal.help')}
      </Text>
      <Table.ScrollContainer minWidth={SUBTOTAL_TABLE_MIN_WIDTH}>
        <Table verticalSpacing={4}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{translate('calc.summary.subtotal.group')}</Table.Th>
              <Table.Th ta="right">{translate('calc.summary.rows.atkIncrease')}</Table.Th>
              <Table.Th ta="right">{translate('calc.summary.rows.hpIncrease')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {subtotals.map((group) => (
              <Table.Tr key={group.id}>
                <Table.Td>{translate(`calc.groups.${group.id}`)}</Table.Td>
                <Table.Td ta="right">{`×${formatLog(group.attack)}`}</Table.Td>
                <Table.Td ta="right">{`×${formatLog(group.hp)}`}</Table.Td>
              </Table.Tr>
            ))}
            <Table.Tr fw={700}>
              <Table.Td>{translate('calc.summary.subtotal.total')}</Table.Td>
              <Table.Td ta="right">{`×${formatLog(totalAttack)}`}</Table.Td>
              <Table.Td ta="right">{`×${formatLog(totalHp)}`}</Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Stack>
  );
}
