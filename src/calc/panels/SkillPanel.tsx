import { useTranslation } from 'react-i18next';
import { memo } from 'react';
import { Card, Collapse, Group, Image, NumberInput, Select, Stack, Table, Text, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { CONSTS } from '@/CONSTS';
import AutoGrid from '@/components/AutoGrid';
import HorizontalScrollRow from '@/components/HorizontalScrollRow';
import SectionTitle from '@/components/SectionTitle';
import {
  SKILL_EQUIP_SLOT_NUMBERS,
  equipChoicesForJob,
  equippedSkillLevelSum,
  skillEquipField,
  skillIconPath,
  skillLevel,
  skillLevelField,
  skillOptionField,
  skillOptionSlotCount,
  skillPerkChoices,
  skillPerkField,
  skillPerkLevels,
  skillRows,
  skillRuneChoices,
  skillRuneText,
  secondSkillEquipField,
} from '@/calc/sources/skill/skill';
import { heroFirstRow, slotHeroName } from '@/calc/sources/hero/character';
import type { CalcValues } from '@/calc/types';
import type { TabPanelProps } from '@/calc/types';
import { joinFieldValues, splitFieldValues } from '@/calc/useTrackedCalcValues';
import type { StatTables, TableRow } from '@/data/statTables';
import IconPicker, { iconUrl } from '@/calc/panels/heroWeaponCardPet/IconPicker';

const {
  MAX_LEVEL,
  LEVEL_INPUT_WIDTH,
  EQUIP_SLOT_WIDTH,
  ROW_ICON_SIZE,
  JOB_CARD_MIN_WIDTH,
  OPTION_DROPDOWN_MAX_HEIGHT,
  PERK_LEVEL_LABEL_WIDTH,
} = CONSTS.skill;
const { JOBS, JOB_ICONS } = CONSTS.hero;
const { CARD_ICON_SIZE } = CONSTS.heroWeaponCardPet.ui;
const NOT_EQUIPPED = '';
const NO_OPTION = '';
/** 보유 스킬 표의 열 수 (옵션 줄이 한 줄을 다 쓴다) */
const OWNED_TABLE_COLUMNS = 4;
const SECOND_HERO_FIELD = CONSTS.dpm.SWAP.HERO_FIELDS[1];

/** 장착 5칸 한 줄 (1슬롯 · 2슬롯 히어로가 같이 쓴다). 후보는 보유 스킬 중 그 히어로 직업 것, 같은 스킬은 한 칸에만 */
function EquipRow({
  values,
  setValue,
  tables,
  job,
  field,
  pickTitle,
}: {
  values: CalcValues;
  setValue: TabPanelProps['setValue'];
  tables: StatTables;
  job: string | undefined;
  field: (slot: number) => string;
  pickTitle: (slot: number) => string;
}) {
  const { t: translate } = useTranslation();
  const choices = equipChoicesForJob(values, tables, job);
  const equippedSlotOf = (skillId: string) => SKILL_EQUIP_SLOT_NUMBERS.find((slot) => values[field(slot)] === skillId);
  return (
    <HorizontalScrollRow itemWidth={EQUIP_SLOT_WIDTH}>
      {SKILL_EQUIP_SLOT_NUMBERS.map((slot) => {
        const slotLabel = translate('calc.skill.equipSlot', { slot });
        const options = [
          { value: NOT_EQUIPPED, label: translate('calc.skill.notEquipped'), icon: '' },
          ...choices.map((row) => {
            const otherSlot = equippedSlotOf(row.skillId);
            return {
              value: row.skillId,
              label: row.name,
              icon: skillIconPath(row.skillId),
              // 같은 스킬은 한 칸에만 (게임과 같음)
              disabledReason: otherSlot && otherSlot !== slot ? translate('calc.skill.equippedElsewhere') : undefined,
            };
          }),
        ];
        return (
          <Stack key={slot} gap={2} align="center">
            <Text size="xs" c="dimmed">{slotLabel}</Text>
            <IconPicker
              label={slotLabel}
              title={pickTitle(slot)}
              value={values[field(slot)] ?? NOT_EQUIPPED}
              emptyName={translate('calc.skill.notEquipped')}
              options={options}
              onPick={(picked) => setValue(field(slot), picked)}
              closeLabel={translate('calc.skill.close')}
            />
          </Stack>
        );
      })}
    </HorizontalScrollRow>
  );
}

/**
 * 스킬: 1슬롯 · 2슬롯 히어로 장착 5칸씩 (아이콘으로 고름, 보유 스킬 중 그 히어로 직업. 2슬롯은 자동 교체 계산용) + 직업별 카드에 보유 스킬마다 레벨 (비우면 미보유)
 * 과 옵션 칸 (스킬 레벨로 열린 칸 수만큼, 그 스킬의 옵션 후보 중 하나씩. 값은 최고 등급),
 * 문양 칸 (스킬 레벨이 해금 레벨 60 ~ 120 에 닿은 칸마다 후보 2개 중 하나)
 */
export default function SkillPanel({ values, setValue, tables }: TabPanelProps) {
  const { t: translate } = useTranslation();
  const rows = skillRows(tables);
  const secondHero = values[SECOND_HERO_FIELD];
  return (
    <Stack gap="xs">
      <SectionTitle>{translate('calc.skill.equipTitle')}</SectionTitle>
      <EquipRow
        values={values}
        setValue={setValue}
        tables={tables}
        job={heroFirstRow(tables, slotHeroName(values, tables))?.job}
        field={skillEquipField}
        pickTitle={(slot) => translate('calc.skill.equipPickTitle', { slot })}
      />
      <Text size="sm">{translate('calc.skill.equippedLevelSum', { sum: equippedSkillLevelSum(values) })}</Text>
      <SectionTitle>{translate('calc.skill.equipTitle2', { name: secondHero || translate('calc.skill.noSecondHero') })}</SectionTitle>
      {secondHero ? (
        <EquipRow
          values={values}
          setValue={setValue}
          tables={tables}
          job={heroFirstRow(tables, secondHero)?.job}
          field={secondSkillEquipField}
          pickTitle={(slot) => translate('calc.skill.equipPickTitle2', { slot })}
        />
      ) : (
        <Text size="xs" c="dimmed">{translate('calc.skill.secondHeroHelp')}</Text>
      )}

      <SectionTitle>{translate('calc.skill.ownedTitle')}</SectionTitle>
      <Text size="xs" c="dimmed">{translate('calc.skill.ownedHelp')}</Text>
      <AutoGrid minItemWidth={JOB_CARD_MIN_WIDTH}>
        {JOBS.map((job) => (
          <Card key={job} withBorder padding="xs">
            <Group gap="xs" mb={4}>
              <Image src={iconUrl(JOB_ICONS[job])} w={CARD_ICON_SIZE} h={CARD_ICON_SIZE} fit="contain" alt="" />
              <Text fw={600}>{translate(`calc.hero.jobs.${job}`)}</Text>
            </Group>
            <Table verticalSpacing={2} horizontalSpacing={4}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th />
                  <Table.Th>{translate('calc.skill.grade')}</Table.Th>
                  <Table.Th>{translate('calc.skill.name')}</Table.Th>
                  <Table.Th>{translate('calc.skill.level')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows
                  .filter((row) => row.job === job)
                  .map((row) => (
                    <OwnedSkillRow
                      key={row.skillId}
                      row={row}
                      fieldValues={joinFieldValues(values, ownedSkillFields(row.skillId, tables))}
                      tables={tables}
                      setValue={setValue}
                    />
                  ))}
              </Table.Tbody>
            </Table>
          </Card>
        ))}
      </AutoGrid>
    </Stack>
  );
}

interface OwnedSkillRowProps {
  row: TableRow;
  /** 이 스킬이 읽는 칸 값 (ownedSkillFields 순서로 joinFieldValues 로 묶은 글) */
  fieldValues: string;
  tables: StatTables;
  setValue: TabPanelProps['setValue'];
}

/** 이 스킬이 읽는 칸 (레벨 · 옵션 칸 전부 · 문양 칸 전부) */
function ownedSkillFields(skillId: string, tables: StatTables): string[] {
  const maxSlots = skillOptionSlotCount(tables, MAX_LEVEL);
  return [
    skillLevelField(skillId),
    ...Array.from({ length: maxSlots }, (_, index) => skillOptionField(skillId, index + 1)),
    ...skillPerkLevels(tables, skillId).map((targetLevel) => skillPerkField(skillId, targetLevel)),
  ];
}

/**
 * 보유 스킬 한 줄 (레벨 + 옵션 칸 + 문양 칸). 고르기 칸이 스킬마다 많아서, 이 스킬의 칸 값이 바뀔 때만 다시 그린다
 * (한 스킬 레벨을 바꿀 때 스킬 40개를 전부 다시 그리면 입력이 0.6 ~ 1초 늦었다)
 */
const OwnedSkillRow = memo(function OwnedSkillRow({ row, fieldValues, tables, setValue }: OwnedSkillRowProps) {
  const { t: translate } = useTranslation();
  // 옵션 · 문양 칸은 처음엔 접어 둔다
  const [detailOpened, detail] = useDisclosure(false);
  const values = splitFieldValues(fieldValues, ownedSkillFields(row.skillId, tables));
  const level = skillLevel(values, row.skillId);
  const slotCount = skillOptionSlotCount(tables, level);
  const slots = Array.from({ length: slotCount }, (_, index) => index + 1);
  const perkLevels = skillPerkLevels(tables, row.skillId).filter((targetLevel) => level >= Number(targetLevel));
  // 같은 옵션은 한 스킬에 하나만 (게임과 같음): 다른 칸에 고른 옵션은 고를 수 없게
  const optionChoicesFor = (slot: number) => {
    const usedElsewhere = new Set(slots.filter((other) => other !== slot).map((other) => values[skillOptionField(row.skillId, other)]));
    return [
      { value: NO_OPTION, label: translate('calc.skill.optionNone') },
      ...skillRuneChoices(tables, row.skillId).map((rune) => ({
        value: rune.rNo,
        label: skillRuneText(rune),
        disabled: usedElsewhere.has(rune.rNo),
      })),
    ];
  };
  return (
    <>
      <Table.Tr>
        <Table.Td w={ROW_ICON_SIZE}>
          <Image src={iconUrl(skillIconPath(row.skillId))} w={ROW_ICON_SIZE} h={ROW_ICON_SIZE} fit="contain" alt="" />
        </Table.Td>
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
      </Table.Tr>
      {(slotCount > 0 || perkLevels.length > 0) && (
        <Table.Tr>
          <Table.Td colSpan={OWNED_TABLE_COLUMNS}>
            <UnstyledButton onClick={detail.toggle} aria-expanded={detailOpened}>
              <Text size="xs" c="blue">
                {translate(detailOpened ? 'calc.skill.detailClose' : 'calc.skill.detailOpen', {
                  options: slotCount,
                  perks: perkLevels.length,
                })}
              </Text>
            </UnstyledButton>
            <Collapse expanded={detailOpened}>
              <Stack gap={2}>
                {slots.map((slot) => (
                  <Select
                    key={slot}
                    size="xs"
                    data={optionChoicesFor(slot)}
                    allowDeselect={false}
                    maxDropdownHeight={OPTION_DROPDOWN_MAX_HEIGHT}
                    leftSection={<Text size="xs" c="dimmed">{slot}</Text>}
                    aria-label={translate('calc.skill.optionLabel', { name: row.name, slot })}
                    value={values[skillOptionField(row.skillId, slot)] ?? NO_OPTION}
                    onChange={(picked) => setValue(skillOptionField(row.skillId, slot), picked ?? NO_OPTION)}
                  />
                ))}
                {perkLevels.map((targetLevel) => (
                  <Select
                    key={targetLevel}
                    size="xs"
                    data={[
                      { value: NO_OPTION, label: translate('calc.skill.perkNone') },
                      ...skillPerkChoices(tables, row.skillId, targetLevel).map((perk) => ({ value: perk.perkType, label: perk.desc })),
                    ]}
                    allowDeselect={false}
                    maxDropdownHeight={OPTION_DROPDOWN_MAX_HEIGHT}
                    leftSectionWidth={PERK_LEVEL_LABEL_WIDTH}
                    leftSection={<Text size="xs" c="dimmed">{translate('calc.skill.perkLevel', { level: targetLevel })}</Text>}
                    aria-label={translate('calc.skill.perkLabel', { name: row.name, level: targetLevel })}
                    value={values[skillPerkField(row.skillId, targetLevel)] ?? NO_OPTION}
                    onChange={(picked) => setValue(skillPerkField(row.skillId, targetLevel), picked ?? NO_OPTION)}
                  />
                ))}
              </Stack>
            </Collapse>
          </Table.Td>
        </Table.Tr>
      )}
    </>
  );
});
