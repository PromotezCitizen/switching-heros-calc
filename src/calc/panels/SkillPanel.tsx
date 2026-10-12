import { useTranslation } from 'react-i18next';
import { NumberInput, Stack, Table, Text } from '@mantine/core';
import { CONSTS } from '../../CONSTS';
import HorizontalScrollRow from '../../components/HorizontalScrollRow';
import LazySelect from '../../components/LazySelect';
import SectionTitle from '../../components/SectionTitle';
import { SelectField } from '../../components/StoreFields';
import { CALC_KEY_PREFIX } from '../storeKeys';
import {
  SKILL_EQUIP_SLOT_NUMBERS,
  equipChoices,
  equippedSkillLevelSum,
  skillDamagePercent,
  skillEquipField,
  skillLevel,
  skillLevelField,
  skillRows,
} from '../sources/skill/skill';
import type { TabPanelProps } from '../types';

const { MAX_LEVEL, LEVEL_INPUT_WIDTH, EQUIP_SELECT_WIDTH, TABLE_MIN_WIDTH, ARROW_BARRAGE_OPTION } = CONSTS.skill;
const NOT_EQUIPPED = '';
const NO_OPTION = '';

/** 스킬: 1슬롯 히어로 장착 5칸 (보유 스킬 중 그 직업) + 보유 스킬마다 레벨 (비우면 미보유) */
export default function SkillPanel({ values, setValue, tables }: TabPanelProps) {
  const { t: translate } = useTranslation();
  const choices = equipChoices(values, tables);
  const equipData = [
    { value: NOT_EQUIPPED, label: translate('calc.skill.notEquipped') },
    ...choices.map((row) => ({ value: row.skillId, label: row.name })),
  ];
  return (
    <Stack gap="xs">
      <SectionTitle>{translate('calc.skill.equipTitle')}</SectionTitle>
      <HorizontalScrollRow itemWidth={EQUIP_SELECT_WIDTH}>
        {SKILL_EQUIP_SLOT_NUMBERS.map((slot) => (
          <LazySelect
            key={slot}
            size="xs"
            label={translate('calc.skill.equipSlot', { slot })}
            data={equipData}
            value={values[skillEquipField(slot)] ?? NOT_EQUIPPED}
            allowDeselect={false}
            onChange={(next) => setValue(skillEquipField(slot), next ?? NOT_EQUIPPED)}
          />
        ))}
      </HorizontalScrollRow>
      <Text size="sm">{translate('calc.skill.equippedLevelSum', { sum: equippedSkillLevelSum(values) })}</Text>

      <SectionTitle>{translate('calc.skill.optionTitle')}</SectionTitle>
      {/* 스킬 옵션 창에서 다발 화살 (252) 에 붙은 "적중마다 5초간 공격력 N% 증가 (최대 5중첩)" 옵션의 값. 비워 두면 옵션 없음 */}
      <SelectField
        storeKey={CALC_KEY_PREFIX + ARROW_BARRAGE_OPTION.FIELD}
        label={translate('calc.skill.optionArrowBarrage')}
        hint={translate('calc.skill.optionArrowBarrageHint', { stacks: ARROW_BARRAGE_OPTION.MAX_STACKS })}
        options={[
          { value: NO_OPTION, label: translate('calc.skill.optionNone') },
          ...ARROW_BARRAGE_OPTION.PERCENTS.map((percent) => ({ value: String(percent), label: `${percent}%` })),
        ]}
      />

      <SectionTitle>{translate('calc.skill.ownedTitle')}</SectionTitle>
      <Table.ScrollContainer minWidth={TABLE_MIN_WIDTH}>
        <Table verticalSpacing={4} horizontalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{translate('calc.skill.job')}</Table.Th>
              <Table.Th>{translate('calc.skill.grade')}</Table.Th>
              <Table.Th>{translate('calc.skill.name')}</Table.Th>
              <Table.Th>{translate('calc.skill.level')}</Table.Th>
              <Table.Th ta="right">{translate('calc.skill.damage')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {skillRows(tables).map((row) => {
              const damage = skillDamagePercent(row, skillLevel(values, row.skillId));
              return (
                <Table.Tr key={row.skillId}>
                  <Table.Td>{translate(`calc.hero.jobs.${row.job}`)}</Table.Td>
                  <Table.Td>{row.skillGrade}</Table.Td>
                  <Table.Td style={{ whiteSpace: 'nowrap' }}>{row.name}</Table.Td>
                  <Table.Td>
                    <NumberInput
                      size="xs"
                      w={LEVEL_INPUT_WIDTH}
                      hideControls
                      min={0}
                      max={MAX_LEVEL}
                      allowNegative={false}
                      allowDecimal={false}
                      aria-label={translate('calc.skill.levelLabel', { name: row.name })}
                      value={values[skillLevelField(row.skillId)] ?? ''}
                      onChange={(next) => setValue(skillLevelField(row.skillId), String(next))}
                    />
                  </Table.Td>
                  <Table.Td ta="right">{damage === null ? '-' : `${damage.toLocaleString('ko-KR')}%`}</Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Stack>
  );
}
