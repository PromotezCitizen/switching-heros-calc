import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Group, Image, NumberInput, Stack, Text } from '@mantine/core';
import AutoGrid from '@/components/AutoGrid';
import SectionTitle from '@/components/SectionTitle';
import { CONSTS } from '@/CONSTS';
import type { StatTables, TableRow } from '@/data/statTables';
import {
  PET_LEADER_FIELD,
  PET_OPTION_NUMBERS,
  PET_SLOT_NUMBERS,
  ownedPetField,
  ownedPetRow,
  petFirstRow,
  maxStagePetCounts,
  petGroups,
  petOptionCount,
  petOptionStatField,
  petOptionStats,
  petOptionValueField,
  petRegionLevelField,
  petRegionUnlocked,
  petSlotField,
} from '@/calc/sources/heroWeaponCardPet/pet';
import { unique, type RowGroup } from '@/calc/sources/heroWeaponCardPet/shared';
import { lineText, statDescription, type StatDescriptions } from '@/calc/statText';
import type { TabPanelProps } from '@/calc/types';
import { joinFieldValues, splitFieldValues } from '@/calc/useTrackedCalcValues';
import HorizontalScrollRow from '@/components/HorizontalScrollRow';
import IconPicker, { TypeIcon, iconUrl } from '@/calc/panels/heroWeaponCardPet/IconPicker';
import StatValueRows from '@/calc/panels/heroWeaponCardPet/StatValueRows';

const { GRADE_STAR_SEPARATOR, ATTRIBUTE_ICONS } = CONSTS.heroWeaponCardPet;
const { THUMBNAIL_PREFIX, REGION } = CONSTS.heroWeaponCardPet.pet;
const REGION_ATTRIBUTES = REGION.ATTRIBUTES;
const { CARD_ICON_SIZE, PET_SLOT_WIDTH, UNUSED_OPACITY, REGION_INPUT_WIDTH } = CONSTS.heroWeaponCardPet.ui;
const { CARD_MIN_WIDTH } = CONSTS.display;
/** 상태이상 리더 효과: pet_hero_<attack|skill>_<blind|shock|stun> (값1 = 횟수·확률, 값2 = 초, 추정) */
const AILMENT_LEADER_PATTERN = /^pet_hero_(attack|skill)_(\w+)$/;
/** 펫 옵션 고르기 칸 이름: 값은 옆 칸에 있으니 " N% 증가" 를 뺌 (기존 petOptionLabel) */
const OPTION_LABEL_TAIL = /\s*\{0\}%?\s*(증가)?\s*$/;
/** 장착 칸마다 펫 칸 이름 (다른 칸에 장착 중인지 볼 때 씀) */
const PET_SLOT_FIELDS = PET_SLOT_NUMBERS.map(petSlotField);

function petOptionLabel(descriptions: StatDescriptions, stat: string): string {
  return statDescription(descriptions, stat).replace(OPTION_LABEL_TAIL, '').replace('{0}', 'N');
}

/** 장착 칸 하나가 읽는 옵션 칸 이름 (능력치 · 값) */
function petOptionFields(slot: number): string[] {
  return PET_OPTION_NUMBERS.flatMap((number) => [petOptionStatField(slot, number), petOptionValueField(slot, number)]);
}

/** 펫 이름·속성 아이콘·리더 효과 글 (보유 카드·장착 칸이 같이 쓴다) */
function usePetText(descriptions: StatDescriptions) {
  const { t: translate } = useTranslation();
  const petName = (petId: string) => translate(`calc.pet.petNames.${petId}`);
  const attributeName = (attribute: string) => translate(`calc.pet.attributes.${attribute}`, { defaultValue: attribute });
  const attributeIcon = (attribute: string | undefined) =>
    attribute ? <TypeIcon path={ATTRIBUTE_ICONS[attribute]} name={attributeName(attribute)} /> : null;
  const leaderEffectText = (row: TableRow) => {
    const match = AILMENT_LEADER_PATTERN.exec(row.leaderStatType);
    if (!match) return lineText(descriptions, { source: '', stat: row.leaderStatType, value: Number(row.leaderStatValue1) });
    return translate('calc.pet.leaderAilment', {
      kind: translate(`calc.pet.ailmentKinds.${match[1]}`),
      count: row.leaderStatValue1,
      seconds: row.leaderStatValue2,
      ailment: translate(`calc.pet.ailments.${match[2]}`, { defaultValue: match[2] }),
    });
  };
  return { translate, petName, attributeName, attributeIcon, leaderEffectText };
}

interface OwnedPetCardProps {
  group: RowGroup;
  /** 보유 칸 값 (등급_성) */
  ownedChoice: string;
  tables: StatTables;
  descriptions: StatDescriptions;
  setValue: TabPanelProps['setValue'];
}

/** 보유 펫 카드 하나 (memo: 그 펫 등급·성을 바꿀 때만 다시 그린다) */
const OwnedPetCard = memo(function OwnedPetCard({ group, ownedChoice, tables, descriptions, setValue }: OwnedPetCardProps) {
  const { translate, petName, attributeIcon, leaderEffectText } = usePetText(descriptions);
  const field = ownedPetField(group.key);
  const row = ownedPetRow({ [field]: ownedChoice }, tables, group.key);
  const [currentGrade, currentStar] = ownedChoice.split(GRADE_STAR_SEPARATOR);
  const shownGrade = row ? currentGrade : '';
  const stars = group.rows.filter((candidate) => candidate.grade === currentGrade).map((candidate) => candidate.star);
  // 등급 버튼: 같은 성이 그 등급에 있으면 유지, 없으면 첫 성
  const pickGrade = (grade: string) => {
    if (!grade) return setValue(field, '');
    const gradeStars = group.rows.filter((candidate) => candidate.grade === grade).map((candidate) => candidate.star);
    setValue(field, grade + GRADE_STAR_SEPARATOR + (gradeStars.includes(currentStar) ? currentStar : gradeStars[0]));
  };
  return (
    <Card withBorder padding="sm" style={{ opacity: row ? undefined : UNUSED_OPACITY }}>
      <Stack gap="xs" align="center">
        <Image src={iconUrl(THUMBNAIL_PREFIX + group.key)} w={CARD_ICON_SIZE} h={CARD_ICON_SIZE} fit="contain" alt="" />
        <Group gap={4}>
          <Text fw={600}>{petName(group.key)}</Text>
          {attributeIcon(group.rows[0].attribute)}
        </Group>
        <Group gap={4} justify="center">
          {['', ...unique(group.rows.map((candidate) => candidate.grade))].map((grade) => (
            <Button
              key={grade || 'none'}
              size="compact-xs"
              variant={grade === shownGrade ? 'filled' : 'default'}
              aria-pressed={grade === shownGrade}
              onClick={() => pickGrade(grade)}
            >
              {grade || translate('calc.pet.gradeNone')}
            </Button>
          ))}
        </Group>
        {row && (
          <Group gap={4} justify="center">
            {stars.map((star) => (
              <Button
                key={star}
                size="compact-xs"
                variant={star === currentStar ? 'filled' : 'default'}
                aria-pressed={star === currentStar}
                onClick={() => setValue(field, currentGrade + GRADE_STAR_SEPARATOR + star)}
              >
                {translate('calc.pet.starText', { star })}
              </Button>
            ))}
          </Group>
        )}
        <Text size="sm" c="dimmed">
          {row
            ? lineText(descriptions, { source: '', stat: row.passiveStatType, value: Number(row.passiveStatValue) })
            : translate('calc.pet.notOwned')}
        </Text>
        {row && (
          <Text size="sm" c="dimmed">
            {translate('calc.pet.leaderEffect', { effect: leaderEffectText(row) })}
          </Text>
        )}
      </Stack>
    </Card>
  );
});

interface PetSlotCardProps {
  slot: number;
  /** 장착 칸 6개의 펫 (joinFieldValues, PET_SLOT_FIELDS 순서) */
  slotPetsText: string;
  /** 이 칸에 장착한 펫의 보유 칸 값 (등급_성) */
  ownedChoice: string;
  /** 이 칸의 옵션 칸 값 (joinFieldValues, petOptionFields 순서) */
  optionsText: string;
  isLeader: boolean;
  groups: RowGroup[];
  tables: StatTables;
  descriptions: StatDescriptions;
  setValue: TabPanelProps['setValue'];
}

/** 장착 칸 하나 (memo: 이 칸이 읽는 값이 바뀔 때만 다시 그린다) */
const PetSlotCard = memo(function PetSlotCard(props: PetSlotCardProps) {
  const { slot, slotPetsText, ownedChoice, optionsText, isLeader, groups, tables, descriptions, setValue } = props;
  // 리더 효과 글은 보유 펫 카드에만 보여 준다 (장착 칸에 같은 글을 다시 쓰지 않음)
  const { translate, petName, attributeName, attributeIcon } = usePetText(descriptions);
  // 이 칸이 읽는 칸 값만 모은 값 (계산 함수·옵션 줄은 이 값을 읽는다)
  const slotValues = splitFieldValues(slotPetsText, PET_SLOT_FIELDS);
  const petId = slotValues[petSlotField(slot)];
  const cardValues = {
    ...slotValues,
    ...splitFieldValues(optionsText, petOptionFields(slot)),
    ...(petId ? { [ownedPetField(petId)]: ownedChoice } : {}),
  };
  const row = ownedPetRow(cardValues, tables, petId);
  const pickLabel = translate('calc.pet.slotPickLabel', { slot });
  // 다른 장착 칸에 이미 있는 펫은 고를 수 없음 (중복 장착 막음)
  const usedSlot = (candidate: string) =>
    PET_SLOT_NUMBERS.find((other) => other !== slot && candidate && cardValues[petSlotField(other)] === candidate);
  const options = [
    { value: '', label: translate('calc.pet.none'), icon: '' },
    ...groups.map((group) => {
      const used = usedSlot(group.key);
      return {
        value: group.key,
        label: petName(group.key),
        icon: THUMBNAIL_PREFIX + group.key,
        noteIcon: { path: ATTRIBUTE_ICONS[group.rows[0].attribute], name: attributeName(group.rows[0].attribute) },
        disabledReason: used ? translate('calc.pet.usedInSlot', { slot: used }) : undefined,
      };
    }),
  ];
  const choices = petOptionStats(tables, petId).map((stat) => ({ value: stat, label: petOptionLabel(descriptions, stat) }));
  return (
    <Card withBorder padding="sm" style={{ borderColor: isLeader ? 'var(--mantine-primary-color-filled)' : undefined }}>
      <Stack gap="xs">
        <Group justify="space-between">
          <Text fw={600}>{translate('calc.pet.slotName', { slot })}</Text>
          <Button
            size="compact-xs"
            variant={isLeader ? 'filled' : 'default'}
            aria-pressed={isLeader}
            onClick={() => setValue(PET_LEADER_FIELD, isLeader ? '' : String(slot))}
          >
            {translate('calc.pet.leader')}
          </Button>
        </Group>
        <Group justify="center" gap="xs">
          <IconPicker
            label={pickLabel}
            title={translate('calc.pet.pickTitle', { label: pickLabel })}
            value={petId}
            emptyName={translate('calc.pet.pickEmpty')}
            options={options}
            onPick={(picked) => setValue(petSlotField(slot), picked)}
            closeLabel={translate('calc.pet.close')}
          />
          {attributeIcon(petFirstRow(tables, petId)?.attribute)}
        </Group>
        <Text size="sm" c="dimmed">{translate('calc.pet.optionsTitle')}</Text>
        <StatValueRows
          rowNumbers={PET_OPTION_NUMBERS}
          statField={(number) => petOptionStatField(slot, number)}
          valueField={(number) => petOptionValueField(slot, number)}
          values={cardValues}
          setValue={setValue}
          choices={choices}
          noneLabel={translate('calc.pet.none')}
          statLabel={(number) => translate('calc.pet.optionStatLabel', { slot, number })}
          valueLabel={(number) => translate('calc.pet.optionValueLabel', { slot, number })}
          valuePlaceholder={translate('calc.pet.valuePlaceholder')}
          usableCount={petOptionCount(cardValues, tables, petId)}
        />
        {petId && !row && <Text size="sm" c="dimmed">{translate('calc.pet.optionNote')}</Text>}
      </Stack>
    </Card>
  );
});

/** 펫: 보유 펫 등급·성, 장착 펫 6칸 (리더·장착 옵션) (기존 buildPet / renderPet) */
export default function PetPanel({ values, setValue, tables, descriptions }: TabPanelProps) {
  const { t: translate } = useTranslation();
  const groups = useMemo(() => petGroups(tables), [tables]);
  const leaderSlot = values[PET_LEADER_FIELD] ?? '';
  const slotPetsText = joinFieldValues(values, PET_SLOT_FIELDS);
  const maxStageTotal = Object.values(maxStagePetCounts(values, tables)).reduce((sum, count) => sum + count, 0);
  const regionUnlocked = petRegionUnlocked(values, tables);

  return (
    <Stack gap="md">
      <SectionTitle>{translate('calc.pet.ownedTitle')}</SectionTitle>
      <AutoGrid minItemWidth={CARD_MIN_WIDTH.medium} gap="var(--mantine-spacing-sm)">
        {groups.map((group) => (
          <OwnedPetCard
            key={group.key}
            group={group}
            ownedChoice={values[ownedPetField(group.key)] ?? ''}
            tables={tables}
            descriptions={descriptions}
            setValue={setValue}
          />
        ))}
      </AutoGrid>
      <Text size="sm" c="dimmed">{translate('calc.pet.ownedHelp')}</Text>

      <SectionTitle>{translate('calc.pet.equipTitle')}</SectionTitle>
      <HorizontalScrollRow itemWidth={PET_SLOT_WIDTH}>
        {PET_SLOT_NUMBERS.map((slot) => {
          const petId = values[petSlotField(slot)] ?? '';
          return (
            <PetSlotCard
              key={slot}
              slot={slot}
              slotPetsText={slotPetsText}
              ownedChoice={petId ? (values[ownedPetField(petId)] ?? '') : ''}
              optionsText={joinFieldValues(values, petOptionFields(slot))}
              isLeader={String(slot) === leaderSlot}
              groups={groups}
              tables={tables}
              descriptions={descriptions}
              setValue={setValue}
            />
          );
        })}
      </HorizontalScrollRow>
      <Text size="sm" c="dimmed">{translate('calc.pet.equipHelp')}</Text>

      {/* 펫 지역: 열렸으면 입력, 안 열렸으면 언제 열리는지 (2성 SSS 펫 1마리 이상, 사용자 지시 2026-11-07 "펫 지역 - 열리는 경우 보여준다") */}
      <SectionTitle>{translate('calc.pet.regionTitle')}</SectionTitle>
      {regionUnlocked ? (
        <>
          <Text size="sm" c="dimmed">{translate('calc.pet.regionHelp')}</Text>
          <Text size="sm">{translate('calc.pet.regionUnlocked', { count: maxStageTotal })}</Text>
          {/* 지역 3개 한 줄 (좁으면 가로 스크롤): 속성마다 지역 레벨 */}
          <HorizontalScrollRow itemWidth={REGION_INPUT_WIDTH}>
            {REGION_ATTRIBUTES.map((attribute) => {
              const attributeName = translate(`calc.pet.attributes.${attribute}`);
              return (
                <NumberInput
                  key={attribute}
                  size="xs"
                  hideControls
                  min={0}
                  allowNegative={false}
                  allowDecimal={false}
                  label={translate('calc.pet.regionLevelLabel', { attribute: attributeName })}
                  value={values[petRegionLevelField(attribute)] ?? ''}
                  onChange={(next) => setValue(petRegionLevelField(attribute), String(next))}
                />
              );
            })}
          </HorizontalScrollRow>
        </>
      ) : (
        <Text size="sm" c="dimmed">{translate('calc.pet.regionLocked', { count: maxStageTotal })}</Text>
      )}
    </Stack>
  );
}
