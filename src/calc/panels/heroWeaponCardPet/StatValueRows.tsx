import { Group, Text, TextInput } from '@mantine/core';
import LazySelect from '@/components/LazySelect';
import { CONSTS } from '@/CONSTS';
import type { StatDescriptions } from '@/calc/statText';
import type { CalcValues } from '@/calc/types';
import { tableRows, type StatTables } from '@/data/statTables';

const { STAT_ROW_SELECT_FLEX, STAT_ROW_VALUE_WIDTH } = CONSTS.heroWeaponCardPet.ui;
const VALUE_PLACEHOLDER = '{0}';
const SAMPLE_VALUE = 'N';

export interface StatChoice {
  value: string;
  label: string;
}

/**
 * 능력치 고르기 목록: 게임 DiceOption 표에서 그 옵션 묶음 (diceId) 이 굴릴 수 있는 능력치만 (설명 가나다순).
 * 무기 옵션 = diceId 1, 전승된 능력 = diceId 2 (폰 불러오기와 같은 번호)
 */
export function diceStatChoices(tables: StatTables, diceId: string, descriptions: StatDescriptions): StatChoice[] {
  const stats = [...new Set(tableRows(tables.DiceOption).filter((row) => row.diceId === diceId).map((row) => row.statType))];
  return stats
    .map((stat) => ({ value: stat, label: (descriptions[stat] || stat).replace(VALUE_PLACEHOLDER, SAMPLE_VALUE) }))
    .sort((left, right) => left.label.localeCompare(right.label, 'ko'));
}

interface StatValueRowsProps {
  rowNumbers: number[];
  statField: (index: number) => string;
  valueField: (index: number) => string;
  values: CalcValues;
  setValue: (fieldId: string, text: string) => void;
  choices: StatChoice[];
  noneLabel: string;
  statLabel: (index: number) => string;
  valueLabel: (index: number) => string;
  valuePlaceholder: string;
  /** 이 번호보다 큰 줄은 흐리게 + 입력 막음 (계산에서도 빠짐). 없으면 전부 사용 */
  usableCount?: number;
}

/** 능력치 고르기 + 값을 한 줄에: [번호] [능력치 ▼] [값] (기존 statRows) */
export default function StatValueRows(props: StatValueRowsProps) {
  const { rowNumbers, statField, valueField, values, setValue, choices, noneLabel, usableCount } = props;
  return (
    <>
      {rowNumbers.map((index) => {
        const usable = usableCount === undefined || index <= usableCount;
        return (
          <Group key={index} gap="xs" wrap="nowrap" style={{ opacity: usable ? 1 : CONSTS.heroWeaponCardPet.ui.UNUSED_OPACITY }}>
            <Text w="1.5em" ta="right">{index}</Text>
            <LazySelect
              style={{ flex: STAT_ROW_SELECT_FLEX }}
              aria-label={props.statLabel(index)}
              data={choices}
              searchable
              clearable
              // 펼친 목록은 칸 폭이 아니라 이름 길이만큼 (좁은 칸에서 이름이 여러 줄로 잘리지 않게)
              comboboxProps={{ width: 'max-content', position: 'bottom-start' }}
              placeholder={noneLabel}
              disabled={!usable}
              value={values[statField(index)] || null}
              onChange={(selected) => setValue(statField(index), selected ?? '')}
            />
            <TextInput
              w={STAT_ROW_VALUE_WIDTH}
              aria-label={props.valueLabel(index)}
              placeholder={props.valuePlaceholder}
              disabled={!usable}
              value={values[valueField(index)] ?? ''}
              onChange={(event) => setValue(valueField(index), event.currentTarget.value)}
            />
          </Group>
        );
      })}
    </>
  );
}
