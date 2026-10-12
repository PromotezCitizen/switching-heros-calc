import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Card, Collapse, Group, Image, Stack, Text, TextInput, UnstyledButton } from '@mantine/core';
import AutoGrid from '../../components/AutoGrid';
import ChoiceChips from '../../components/ChoiceChips';
import HorizontalScrollRow from '../../components/HorizontalScrollRow';
import LazySelect from '../../components/LazySelect';
import SectionTitle from '../../components/SectionTitle';
import { useDisclosure } from '@mantine/hooks';
import { CONSTS } from '../../CONSTS';
import type { StatTables } from '../../data/statTables';
import {
  CARD_MARK_NUMBERS,
  CARD_SET_BONUS_FIELD,
  CARD_SLOT_NUMBERS,
  setIdsForMark,
  cardDisplayStar,
  cardGradeField,
  cardGrades,
  slotUsingCard,
  cardIds,
  cardPairs,
  cardRowsOf,
  cardSetPickField,
  cardSetStates,
  cardSlotField,
  selectedCardRow,
  stickerCountField,
  stickerLevelField,
  usableMarkCount,
} from '../sources/heroWeaponCardPet/card';
import { gradeStarValue, groupBy, rowsOf, unique, type RowGroup } from '../sources/heroWeaponCardPet/shared';
import { lineText, type StatDescriptions } from '../statText';
import type { TabPanelProps } from '../types';
import { joinFieldValues, splitFieldValues } from '../useTrackedCalcValues';
import IconPicker, { iconUrl } from './heroWeaponCardPet/IconPicker';

const { MIN_NUMBER } = CONSTS.heroWeaponCardPet;
const {
  SET_ICON_UPPER_CASE_MAX,
  SET_ICON_UPPER_PREFIX,
  SET_ICON_LOWER_PREFIX,
  CARD_ICON_PREFIX,
  EMPTY_CARD_ICON,
} = CONSTS.heroWeaponCardPet.card;
const { CARD_ICON_SIZE, CARD_SLOT_WIDTH, UNUSED_OPACITY } = CONSTS.heroWeaponCardPet.ui;
const { CARD_MIN_WIDTH } = CONSTS.display;
/** 세트 단계 문구 끝의 " 증가" 는 뺀다 (기존 화면) */
const TRAILING_INCREASE = / 증가$/;
/** 편성 칸마다 카드 칸 이름 (다른 칸에 편성 중인지 볼 때 씀) */
const CARD_SLOT_FIELDS = CARD_SLOT_NUMBERS.map(cardSlotField);

/** 세트 아이콘 파일 이름: 1~15 = Set<n>, 16~ = set<n> (게임 그림 묶음 그대로) */
function cardSetIcon(setId: string): string {
  return (Number(setId) <= SET_ICON_UPPER_CASE_MAX ? SET_ICON_UPPER_PREFIX : SET_ICON_LOWER_PREFIX) + setId;
}

/** 편성 칸 하나가 읽는 세트 마크 칸 이름 */
function cardMarkFields(slot: number): string[] {
  return CARD_MARK_NUMBERS.map((mark) => cardSetPickField(slot, mark));
}

/** 카드 이름·세트 이름 (번역이 없으면 번호로) */
function useCardNames() {
  const { t: translate } = useTranslation();
  const cardName = (cardId: string) =>
    translate(`calc.card.cardNames.${cardId}`, { defaultValue: translate('calc.card.cardFallback', { id: cardId }) });
  const setName = (setId: string) =>
    translate(`calc.card.setNames.${setId}`, { defaultValue: translate('calc.card.setFallback', { id: setId }) });
  return { translate, cardName, setName };
}

interface CardSlotCardProps {
  slot: number;
  /** 편성 칸 6개의 카드 (joinFieldValues, CARD_SLOT_FIELDS 순서) */
  slotCardsText: string;
  /** 이 칸의 등급·성 칸 값 */
  gradeChoice: string;
  /** 이 칸의 세트 마크 칸 값 (joinFieldValues, cardMarkFields 순서) */
  marksText: string;
  tables: StatTables;
  descriptions: StatDescriptions;
  setValue: TabPanelProps['setValue'];
}

/** 편성 카드 칸 하나 (memo: 이 칸이 읽는 값이 바뀔 때만 다시 그린다) */
const CardSlotCard = memo(function CardSlotCard(props: CardSlotCardProps) {
  const { slot, slotCardsText, gradeChoice, marksText, tables, descriptions, setValue } = props;
  const { translate, cardName, setName } = useCardNames();
  // 이 칸이 읽는 칸 값만 모은 값 (계산 함수는 이 값을 읽는다)
  const values = {
    ...splitFieldValues(slotCardsText, CARD_SLOT_FIELDS),
    ...splitFieldValues(marksText, cardMarkFields(slot)),
    [cardGradeField(slot)]: gradeChoice,
  };
  const cardOptions = [
    { value: '', label: translate('calc.card.none'), icon: EMPTY_CARD_ICON },
    ...cardIds(tables).map((cardId) => ({ value: cardId, label: cardName(cardId), icon: CARD_ICON_PREFIX + cardId })),
  ];
  const cardId = values[cardSlotField(slot)];
  const row = selectedCardRow(values, tables, slot);
  const candidates = cardRowsOf(tables, cardId);
  const grades = cardGrades(tables, cardId);
  // 등급이 하나뿐인 카드는 등급을 고르지 않는다 (그 등급으로 정해짐)
  const grade = row ? row.grade : grades.length === 1 ? grades[0] : '';
  const usable = usableMarkCount(values, tables, slot);
  const pickLabel = translate('calc.card.cardPickLabel', { slot });
  // 다른 칸에 이미 편성한 카드는 고를 수 없음 (같은 카드를 두 칸에 넣지 않게)
  const slotOptions = cardOptions.map((option) => {
    const usedSlot = slotUsingCard(values, slot, option.value);
    return usedSlot ? { ...option, disabledReason: translate('calc.card.usedInSlot', { slot: usedSlot }) } : option;
  });
  return (
    <Card withBorder padding="sm" style={{ opacity: row ? undefined : UNUSED_OPACITY }}>
      <Stack gap="xs" align="center">
        <IconPicker
          label={pickLabel}
          title={translate('calc.card.pickTitle', { label: pickLabel })}
          value={cardId}
          emptyName={translate('calc.card.cardPickEmpty', { slot })}
          options={slotOptions}
          onPick={(picked) => {
            setValue(cardSlotField(slot), picked);
            setValue(cardGradeField(slot), '');
          }}
          closeLabel={translate('calc.card.close')}
        />
        {cardId && (
        <Stack gap="xs" w="100%">
          <Group grow gap="xs">
            {grades.length > 1 ? (
              <LazySelect
                aria-label={translate('calc.card.gradeLabel', { slot })}
                placeholder={translate('calc.card.gradePlaceholder')}
                data={grades}
                value={grade || null}
                onChange={(selected) => {
                  // 등급 → 그 등급 첫 성
                  const first = candidates.find((candidate) => candidate.grade === selected);
                  if (first) setValue(cardGradeField(slot), gradeStarValue(first));
                }}
              />
            ) : (
              <Text size="sm" ta="center" aria-label={translate('calc.card.gradeLabel', { slot })}>
                {grade}
              </Text>
            )}
            <LazySelect
              aria-label={translate('calc.card.starLabel', { slot })}
              placeholder={translate('calc.card.starPlaceholder')}
              disabled={!grade}
              data={candidates
                .filter((candidate) => candidate.grade === grade)
                .map((candidate) => ({
                  value: candidate.star,
                  label: translate('calc.card.starText', { star: cardDisplayStar(tables, candidate) }),
                }))}
              value={row ? row.star : null}
              onChange={(selected) => selected && setValue(cardGradeField(slot), gradeStarValue({ grade, star: selected }))}
            />
          </Group>
          {/* 고유 효과는 한 줄에 하나씩 */}
          {row &&
            cardPairs(row).map(([stat, value]) => (
              <Text key={stat} size="sm">
                {lineText(descriptions, { source: '', stat, value })}
              </Text>
            ))}
          {usable > 0 && <Text size="sm" c="dimmed">{translate('calc.card.setMarks')}</Text>}
          {/* 마크 칸은 등급·성에 따라 열린 수만큼만 */}
          {CARD_MARK_NUMBERS.filter((mark) => mark <= usable).map((mark) => (
            <Box key={mark} aria-label={translate('calc.card.markLabel', { slot, mark })}>
              <ChoiceChips
                value={values[cardSetPickField(slot, mark)]}
                options={[
                  { value: '', label: translate('calc.card.none') },
                  ...setIdsForMark(tables, mark).map((setId) => ({ value: setId, label: setName(setId) })),
                ]}
                onChange={(selected) => setValue(cardSetPickField(slot, mark), selected)}
              />
            </Box>
          ))}
        </Stack>
        )}
      </Stack>
    </Card>
  );
});

interface StickerRowProps {
  group: RowGroup;
  /** 칸 값 (세트 수 · 레벨) */
  count: string | undefined;
  level: string | undefined;
  setValue: TabPanelProps['setValue'];
}

/** 스티커 세트 하나 (memo: 그 스티커 칸을 바꿀 때만 다시 그린다) */
const StickerRow = memo(function StickerRow({ group, count, level, setValue }: StickerRowProps) {
  const { t: translate } = useTranslation();
  const name = translate('calc.card.stickerName', { id: group.key });
  return (
    <Group grow gap="xs" align="flex-end">
      <LazySelect
        label={translate('calc.card.stickerCount', { name })}
        placeholder={translate('calc.card.none')}
        clearable
        data={unique(group.rows.map((row) => row.setCnt)).map((setCount) => ({
          value: setCount,
          label: translate('calc.card.countOption', { count: setCount }),
        }))}
        value={count || null}
        onChange={(selected) => setValue(stickerCountField(group.key), selected ?? '')}
      />
      <TextInput
        type="number"
        min={MIN_NUMBER}
        inputMode="numeric"
        label={translate('calc.card.stickerLevel', { name })}
        value={level ?? ''}
        onChange={(event) => setValue(stickerLevelField(group.key), event.currentTarget.value)}
      />
    </Group>
  );
});

/** 몬스터 카드: 편성 카드 6칸 (카드·등급·성·세트 마크), 카드 세트, 스티커 세트 (기존 buildCard / renderCard) */
export default function CardPanel({ values, setValue, tables, descriptions }: TabPanelProps) {
  const { translate, setName } = useCardNames();
  const [stickersOpened, stickers] = useDisclosure(false);
  const stickerGroups = useMemo(() => groupBy(rowsOf(tables, 'CardStickerSet'), 'stickerId'), [tables]);

  const setStates = cardSetStates(values, tables);
  const hasMarks = setStates.some((set) => set.markCount > 0);
  const slotCardsText = joinFieldValues(values, CARD_SLOT_FIELDS);

  return (
    <Stack gap="md">
      <SectionTitle>{translate('calc.card.slotsTitle')}</SectionTitle>
      <HorizontalScrollRow itemWidth={CARD_SLOT_WIDTH}>
        {CARD_SLOT_NUMBERS.map((slot) => (
          <CardSlotCard
            key={slot}
            slot={slot}
            slotCardsText={slotCardsText}
            gradeChoice={values[cardGradeField(slot)] ?? ''}
            marksText={joinFieldValues(values, cardMarkFields(slot))}
            tables={tables}
            descriptions={descriptions}
            setValue={setValue}
          />
        ))}
      </HorizontalScrollRow>

      <SectionTitle>{translate('calc.card.setTitle')}</SectionTitle>
      <TextInput
        type="number"
        min={MIN_NUMBER}
        inputMode="numeric"
        label={translate('calc.card.setBonus')}
        value={values[CARD_SET_BONUS_FIELD] ?? ''}
        onChange={(event) => setValue(CARD_SET_BONUS_FIELD, event.currentTarget.value)}
      />
      <AutoGrid minItemWidth={CARD_MIN_WIDTH.medium} gap="var(--mantine-spacing-sm)">
        {setStates
          .filter((set) => set.markCount > 0)
          .map((set) => (
            <Card key={set.setId} withBorder padding="sm">
              <Stack gap={4} align="center">
                <Image src={iconUrl(cardSetIcon(set.setId))} w={CARD_ICON_SIZE} h={CARD_ICON_SIZE} fit="contain" alt="" />
                <Text fw={600}>{setName(set.setId)}</Text>
                <Text size="sm">{translate('calc.card.markCount', { count: set.markCount })}</Text>
                {set.tiers.map((tier) => (
                  <Text key={tier.setCount} size="sm" style={{ opacity: tier.reached ? undefined : UNUSED_OPACITY }}>
                    {translate('calc.card.setTier', {
                      count: tier.setCount,
                      effect: lineText(descriptions, { source: '', stat: tier.stat, value: tier.value }).replace(TRAILING_INCREASE, ''),
                    })}
                  </Text>
                ))}
              </Stack>
            </Card>
          ))}
      </AutoGrid>
      {!hasMarks && <Text size="sm" c="dimmed">{translate('calc.card.setNone')}</Text>}

      <SectionTitle>{translate('calc.card.stickerTitle')}</SectionTitle>
      <UnstyledButton onClick={stickers.toggle} aria-expanded={stickersOpened}>
        <Text c="blue">{translate('calc.card.stickerExpand')}</Text>
      </UnstyledButton>
      <Collapse expanded={stickersOpened}>
        <AutoGrid minItemWidth={CARD_MIN_WIDTH.large} gap="var(--mantine-spacing-sm)">
          {stickerGroups.map((group) => (
            <StickerRow
              key={group.key}
              group={group}
              count={values[stickerCountField(group.key)]}
              level={values[stickerLevelField(group.key)]}
              setValue={setValue}
            />
          ))}
        </AutoGrid>
      </Collapse>
    </Stack>
  );
}
