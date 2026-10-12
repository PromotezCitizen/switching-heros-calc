import { Group, Text, TextInput } from '@mantine/core';
import LazySelect from '../../../components/LazySelect';
import { CONSTS } from '../../../CONSTS';
import type { StatDescriptions } from '../../statText';
import type { CalcValues } from '../../types';

const { STAT_ROW_SELECT_FLEX, STAT_ROW_VALUE_WIDTH } = CONSTS.heroWeaponCardPet.ui;
const VALUE_PLACEHOLDER = '{0}';
const SAMPLE_VALUE = 'N';

export interface StatChoice {
  value: string;
  label: string;
}

const choiceCache = new WeakMap<StatDescriptions, StatChoice[]>();

/** 능력치 고르기 목록: 설명이 있는 스탯 전부 (설명 가나다순, 기존 allStatChoices) */
export function allStatChoices(descriptions: StatDescriptions): StatChoice[] {
  let choices = choiceCache.get(descriptions);
  if (!choices) {
    choices = Object.entries(descriptions)
      .filter(([, description]) => description)
      .map(([stat, description]) => ({ value: stat, label: description.replace(VALUE_PLACEHOLDER, SAMPLE_VALUE) }))
      .sort((left, right) => left.label.localeCompare(right.label, 'ko'));
    choiceCache.set(descriptions, choices);
  }
  return choices;
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
