import { useTranslation } from 'react-i18next';
import { Accordion, Group, NumberInput, Stack, Table, Text } from '@mantine/core';
import { CONSTS } from '@/CONSTS';
import { combineLines } from '@/calc/combine';
import { formatLog } from '@/calc/gameNumber';
import {
  ancientCurrent,
  ancientRelicLines,
  ancientStepNodes,
  constellationIds,
  constellationNameKey,
  constellationRound,
  constellationStepCount,
  stepLevelField,
} from '@/calc/sources/providers/ancientRelic';
import LazySelect from '@/components/LazySelect';
import { statDescription } from '@/calc/statText';
import type { TabPanelProps } from '@/calc/types';
import { relicAllMaxed } from '@/calc/sources/trainingRelic/relic';

const { CURRENT_CONST_FIELD, CURRENT_STEP_FIELD, PROGRESS_FIELD, NODE_COLUMN, MAX_LEVEL_COLUMN, STAT_COLUMN, LEVEL_INPUT_WIDTH } =
  CONSTS.providers.ancientRelic;
const PLACEHOLDER = '{0}';
const PLACEHOLDER_SHOWN = 'N';
/** 화면의 % = 줄을 곱한 배율 − 1 (× 100): log10(배율 − 1) + 2 */
const PERCENT_LOG_SHIFT = 2;

/**
 * 별자리 유물: 달성한 별자리 번호, 진행 중인 별자리 (번호 · 현재 단계 · 그 단계 칸 레벨, USB 가져오기가 채운다).
 * 현재 단계 앞은 다 찬 단계로 계산. 아래 "별자리 효과" 는 게임 화면과 같은 값이고 접어 둔다
 */
export default function AncientRelicPanel({ values, setValue, tables, descriptions }: TabPanelProps) {
  const { t: translate } = useTranslation();
  const combined = Object.entries(combineLines(ancientRelicLines(values, tables, (key) => key)));
  // 안 열렸으면 언제 열리는지만 (유물을 끝까지 모으면 열림)
  if (!relicAllMaxed(values, tables)) {
    return (
      <Text size="sm" c="dimmed">
        {translate('calc.ancientRelic.locked')}
      </Text>
    );
  }
  // 새 칸이 비었으면 예전 진행 글에서 읽은 값을 보여 준다
  const current = ancientCurrent(values, tables);
  const constId = current?.constId ?? '';
  const step = current?.step ?? 0;
  const nodes = constId && step ? ancientStepNodes(tables, constId, step) : [];
  /** 진행 중인 별자리의 단계 수 */
  const stepCount = constId ? constellationStepCount(tables, constId) : 0;
  /** 별자리 번호 → "사자자리" (모르면 "이름 모름") */
  const constName = (id: string) => {
    const key = constellationNameKey(tables, id);
    if (!key) return translate('calc.ancientRelic.constUnknown');
    const name = translate('calc.ancientRelic.constName', { name: translate(`calc.ancientRelic.constNames.${key}`) });
    const round = constellationRound(tables, id);
    return round > 1 ? translate('calc.ancientRelic.constRound', { name, round }) : name;
  };
  /** 칸 하나를 고치면 지금 보이는 값 전부를 새 칸으로 옮기고 (예전 글은 비움) 그 칸을 바꾼다 */
  const change = (field: string, next: string) => {
    if (!values[CURRENT_CONST_FIELD] && current) {
      setValue(CURRENT_CONST_FIELD, current.constId);
      setValue(CURRENT_STEP_FIELD, String(current.step));
      for (const [idx, level] of current.levels) setValue(stepLevelField(idx), String(level));
    }
    if (values[PROGRESS_FIELD]) setValue(PROGRESS_FIELD, '');
    setValue(field, next);
  };
  return (
    <Stack gap="xs">
      <Text size="sm" c="dimmed">
        {translate('calc.ancientRelic.help')}
      </Text>
      <Group gap="sm" align="flex-start">
        {/* 이름으로 고른다 (번호로는 알 수 없음) */}
        {/* 드롭다운은 공통 테마에 작은 크기 기본값이 없어 옆 숫자 칸 (테마 xs) 과 같은 크기를 직접 준다 */}
        <LazySelect
          size="xs"
          w={LEVEL_INPUT_WIDTH * 3}
          searchable
          label={translate('calc.ancientRelic.currentConst')}
          placeholder={translate('calc.ancientRelic.constPlaceholder')}
          data={constellationIds(tables).map((id) => ({ value: id, label: constName(id) }))}
          value={constId || null}
          onChange={(next) => change(CURRENT_CONST_FIELD, next ?? '')}
        />
        <NumberInput
          w={LEVEL_INPUT_WIDTH}
          hideControls
          min={1}
          allowNegative={false}
          allowDecimal={false}
          max={stepCount || undefined}
          label={translate('calc.ancientRelic.currentStep', { max: stepCount })}
          value={step || ''}
          onChange={(next) => change(CURRENT_STEP_FIELD, String(next))}
        />
      </Group>
      {nodes.length > 0 && (
        <Group gap="sm" align="flex-start">
          {nodes.map((row) => (
            <NumberInput
              key={row[NODE_COLUMN]}
              w={LEVEL_INPUT_WIDTH * 2}
              hideControls
              min={0}
              max={Number(row[MAX_LEVEL_COLUMN])}
              allowNegative={false}
              allowDecimal={false}
              label={translate('calc.ancientRelic.levelForStat', { stat: statDescription(descriptions, row[STAT_COLUMN]).replace(PLACEHOLDER, PLACEHOLDER_SHOWN), max: row[MAX_LEVEL_COLUMN] })}
              placeholder={`/ ${row[MAX_LEVEL_COLUMN]}`}
              value={current?.levels.get(row[NODE_COLUMN]) ?? ''}
              onChange={(next) => change(stepLevelField(row[NODE_COLUMN]), String(next))}
            />
          ))}
        </Group>
      )}
      {combined.length > 0 && (
        <Accordion variant="contained">
          <Accordion.Item value="effects">
            <Accordion.Control>{translate('calc.ancientRelic.effectsTitle')}</Accordion.Control>
            <Accordion.Panel>
              <Table striped>
                <Table.Tbody>
                  {combined.map(([stat, entry]) => (
                    <Table.Tr key={stat}>
                      <Table.Td>{statDescription(descriptions, stat).replace(PLACEHOLDER, PLACEHOLDER_SHOWN)}</Table.Td>
                      <Table.Td ta="right">
                        {formatLog(Math.log10(Math.max(Math.pow(10, entry.log) - 1, Number.MIN_VALUE)) + PERCENT_LOG_SHIFT)}%
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      )}
    </Stack>
  );
}
