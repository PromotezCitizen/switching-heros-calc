import { useTranslation } from 'react-i18next';
import { Card, Group, Image, NumberInput, Stack, Table, Text } from '@mantine/core';
import { CONSTS } from '@/CONSTS';
import AutoGrid from '@/components/AutoGrid';
import HorizontalScrollRow from '@/components/HorizontalScrollRow';
import SectionTitle from '@/components/SectionTitle';
import {
  SKILL_EQUIP_SLOT_NUMBERS,
  equipChoices,
  equippedSkillLevelSum,
  skillEquipField,
  skillIconPath,
  skillLevelField,
  skillRows,
} from '@/calc/sources/skill/skill';
import type { TabPanelProps } from '@/calc/types';
import IconPicker, { iconUrl } from '@/calc/panels/heroWeaponCardPet/IconPicker';

const { MAX_LEVEL, LEVEL_INPUT_WIDTH, EQUIP_SLOT_WIDTH, ROW_ICON_SIZE, JOB_CARD_MIN_WIDTH } = CONSTS.skill;
const { JOBS, JOB_ICONS } = CONSTS.hero;
const { CARD_ICON_SIZE } = CONSTS.heroWeaponCardPet.ui;
const NOT_EQUIPPED = '';

/** 스킬: 1슬롯 히어로 장착 5칸 (아이콘으로 고름, 보유 스킬 중 그 직업) + 직업별 카드에 보유 스킬마다 레벨 (비우면 미보유) */
export default function SkillPanel({ values, setValue, tables }: TabPanelProps) {
  const { t: translate } = useTranslation();
  const choices = equipChoices(values, tables);
  const rows = skillRows(tables);
  const equippedSlotOf = (skillId: string) => SKILL_EQUIP_SLOT_NUMBERS.find((slot) => values[skillEquipField(slot)] === skillId);
  return (
    <Stack gap="xs">
      <SectionTitle>{translate('calc.skill.equipTitle')}</SectionTitle>
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
                title={translate('calc.skill.equipPickTitle', { slot })}
                value={values[skillEquipField(slot)] ?? NOT_EQUIPPED}
                emptyName={translate('calc.skill.notEquipped')}
                options={options}
                onPick={(picked) => setValue(skillEquipField(slot), picked)}
                closeLabel={translate('calc.skill.close')}
              />
            </Stack>
          );
        })}
      </HorizontalScrollRow>
      <Text size="sm">{translate('calc.skill.equippedLevelSum', { sum: equippedSkillLevelSum(values) })}</Text>

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
                      <Table.Tr key={row.skillId}>
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
                  ))}
              </Table.Tbody>
            </Table>
          </Card>
        ))}
      </AutoGrid>
    </Stack>
  );
}
