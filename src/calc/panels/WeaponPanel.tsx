import { useTranslation } from 'react-i18next';
import { Accordion, Card, Group, Image, NumberInput, Stack, Table, Text, TextInput } from '@mantine/core';
import AutoGrid from '@/components/AutoGrid';
import SectionTitle from '@/components/SectionTitle';
import { CONSTS } from '@/CONSTS';
import { formatLog } from '@/calc/gameNumber';
import { heroByName, rowsOf } from '@/calc/sources/heroWeaponCardPet/shared';
import { slotHeroName } from '@/calc/sources/hero/character';
import { normalWeaponLevelFieldId, normalWeaponLevelSum } from '@/calc/sources/trainingRelic/relic';
import {
  LINK_STAR_FIELD,
  NORMAL_EQUIP_FIELD,
  exclusiveWeaponEffectFromValues,
  linkLevelField,
  weaponLinkLog,
  normalWeaponPossessEffect,
  usesExclusiveWeapon,
  weaponTotalAtk,
} from '@/calc/sources/heroWeaponCardPet/weapon';
import type { TabPanelProps } from '@/calc/types';
import { iconUrl } from '@/calc/panels/heroWeaponCardPet/IconPicker';

const { JOBS, MIN_NUMBER } = CONSTS.heroWeaponCardPet;
const { LINK_STAR_MAX, LINK_ICONS } = CONSTS.heroWeaponCardPet.weapon;
const { CARD_ICON_SIZE, LINK_CARD_MIN_WIDTH, LINK_LEVEL_INPUT_WIDTH, NORMAL_WEAPON_INPUT_MIN_WIDTH } = CONSTS.heroWeaponCardPet.ui;

/** 무기: 전용 무기·웨폰 링크·누적 능력치·일반 무기·무기 옵션 (소울포지는 탭 따로) */
export default function WeaponPanel({ values, setValue, tables }: TabPanelProps) {
  const { t: translate } = useTranslation();
  const textField = (fieldId: string, labelKey: string, placeholderKey: string) => (
    <TextInput
      label={translate(labelKey)}
      placeholder={translate(placeholderKey)}
      value={values[fieldId] ?? ''}
      onChange={(event) => setValue(fieldId, event.currentTarget.value)}
    />
  );
  // 장착 효과는 1슬롯 히어로가 전용 무기를 꼈을 때만 (캐릭터 각성 칸의 "전용 무기 장착")
  const exclusiveEffect = usesExclusiveWeapon(values, tables) ? exclusiveWeaponEffectFromValues(values, tables) : null;
  const possess = normalWeaponPossessEffect(tables, values);
  const normalWeaponRows = rowsOf(tables, 'WeaponJob');
  const exclusiveHero = usesExclusiveWeapon(values, tables) ? heroByName(tables, slotHeroName(values, tables)) : undefined;
  const totalAtk = weaponTotalAtk(values, tables);

  return (
    <Stack gap="md">
      {/* 전용 무기 초월 ★·강화 레벨은 히어로 탭의 전용 무기 표에서 넣는다 (여기는 1슬롯 히어로 무기의 장착 효과만) */}
      <SectionTitle>{translate('calc.weapon.exclusiveTitle')}</SectionTitle>
      <Text size="xs" c="dimmed">
        {translate('calc.weapon.exclusiveFromTable')}
      </Text>
      {exclusiveEffect && (
        <Table>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td>{translate('calc.weapon.exclusiveEffectRow')}</Table.Td>
              <Table.Td ta="right">{formatLog(Math.log10(exclusiveEffect.percent))}%</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>{translate('calc.weapon.exclusiveLevelRow', { max: exclusiveEffect.maxLv })}</Table.Td>
              <Table.Td ta="right">{exclusiveEffect.level}</Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      )}

      <SectionTitle>{translate('calc.weapon.linkTitle')}</SectionTitle>
      {/* 직업 4개 한 줄 (좁으면 줄바꿈): 아이콘 · 이름 · 레벨 칸 · 계산된 공격력 % */}
      <AutoGrid minItemWidth={LINK_CARD_MIN_WIDTH}>
        {JOBS.map((job) => {
          const jobName = translate(`calc.weapon.jobs.${job}`);
          const linkLog = weaponLinkLog(values, tables, job);
          return (
            <Card key={job} withBorder padding="xs">
              <Stack gap={4} align="center">
                <Image src={iconUrl(LINK_ICONS[job])} w={CARD_ICON_SIZE} h={CARD_ICON_SIZE} fit="contain" alt="" />
                <Text size="sm" fw={600}>{translate('calc.weapon.linkCardName', { job: jobName })}</Text>
                <NumberInput
                  size="xs"
                  w={LINK_LEVEL_INPUT_WIDTH}
                  hideControls
                  min={MIN_NUMBER}
                  allowNegative={false}
                  allowDecimal={false}
                  placeholder={translate('calc.weapon.linkLevelPlaceholder')}
                  aria-label={translate('calc.weapon.linkLevelLabel', { job: jobName })}
                  value={values[linkLevelField(job)] ?? ''}
                  onChange={(next) => setValue(linkLevelField(job), String(next))}
                />
                <Text size="xs" c="dimmed">
                  {linkLog === null ? '-' : translate('calc.weapon.linkValue', { value: formatLog(linkLog) })}
                </Text>
              </Stack>
            </Card>
          );
        })}
      </AutoGrid>
      <Group gap="xs" wrap="nowrap">
        <Text size="sm">{translate('calc.weapon.linkStar')}</Text>
        <NumberInput
          size="xs"
          w={LINK_LEVEL_INPUT_WIDTH}
          hideControls
          min={MIN_NUMBER}
          max={LINK_STAR_MAX}
          allowNegative={false}
          allowDecimal={false}
          aria-label={translate('calc.weapon.linkStar')}
          value={values[LINK_STAR_FIELD] ?? ''}
          onChange={(next) => setValue(LINK_STAR_FIELD, String(next))}
        />
        <Text size="xs" c="dimmed">/ {LINK_STAR_MAX}</Text>
      </Group>

      <SectionTitle>{translate('calc.weapon.totalTitle')}</SectionTitle>
      {/* 입력 칸 없이 히어로 탭 전용 무기 표의 초월 ★ 로 계산 (★ 를 안 넣었으면 0%) */}
      <Group gap="xs">
        <Text size="sm">{translate('calc.weapon.totalAtk')}</Text>
        <Text size="sm" fw={600}>{totalAtk ? `${formatLog(totalAtk.percentLog)}%` : translate('calc.weapon.totalZero')}</Text>
      </Group>
      <Text size="xs" c="dimmed">
        {translate('calc.weapon.totalFromStars')}
      </Text>

      <SectionTitle>{translate('calc.weapon.normalTitle')}</SectionTitle>
      {/* 장착 효과는 1슬롯 히어로가 전용 무기를 끼지 않았을 때만 쓰이므로 그때만 칸을 보인다 */}
      {!exclusiveHero && textField(NORMAL_EQUIP_FIELD, 'calc.weapon.normalAtk', 'calc.weapon.normalExample')}
      <Group gap="xs">
        <Text size="sm">{translate('calc.weapon.possessLabel')}</Text>
        <Text size="sm" fw={600}>
          {possess
            ? translate('calc.weapon.possessValue', { count: possess.weaponCount, multiplier: formatLog(possess.multiplierLog) })
            : '-'}
        </Text>
      </Group>
      {/* 일반 무기 실제 강화 레벨 (보유 효과·직업 일반 무기 합산 레벨 유물 계산에 쓰임). 비우면 최대 레벨로 계산 */}
      {normalWeaponRows.length > 0 && (
        <Accordion variant="contained">
          <Accordion.Item value="normalWeaponLevels">
            <Accordion.Control>{translate('calc.weapon.normalLevelsOpen')}</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                <Text size="xs" c="dimmed">
                  {translate('calc.weapon.normalLevelsHint')}
                </Text>
                {JOBS.map((job) => {
                  const jobRows = normalWeaponRows.filter((row) => row.job === job);
                  return (
                    <Stack key={job} gap={4}>
                      <Text size="sm" fw={600}>
                        {translate('calc.weapon.normalLevelsJob', {
                          job: translate(`calc.weapon.jobs.${job}`),
                          sum: normalWeaponLevelSum(values, tables, job),
                        })}
                      </Text>
                      <AutoGrid minItemWidth={NORMAL_WEAPON_INPUT_MIN_WIDTH}>
                        {jobRows.map((row) => (
                          <NumberInput
                            key={row.weaponId}
                            size="xs"
                            hideControls
                            min={MIN_NUMBER}
                            max={Number(row.maxLv)}
                            allowNegative={false}
                            allowDecimal={false}
                            label={translate('calc.weapon.normalLevelLabel', { grade: row.grade, star: row.star })}
                            placeholder={row.maxLv}
                            value={values[normalWeaponLevelFieldId(row.weaponId)] ?? ''}
                            onChange={(next) => setValue(normalWeaponLevelFieldId(row.weaponId), String(next))}
                          />
                        ))}
                      </AutoGrid>
                    </Stack>
                  );
                })}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      )}

      {/* 무기 옵션은 무기마다 히어로 · 전용 무기 탭에서 넣는다 (사용자 결정 2026-11-07). SSS 옵션 수 칸은 뺌 (값은 불러오기 그대로 계산) */}
      <SectionTitle>{translate('calc.weapon.optionTitle')}</SectionTitle>
      <Text size="sm" c="dimmed">
        {translate('calc.weapon.optionMoved')}
      </Text>
    </Stack>
  );
}
