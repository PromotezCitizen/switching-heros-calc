import { memo } from 'react';
import { Box, Card, Group, Stack, Text } from '@mantine/core';
import ChoiceChips from '@/components/ChoiceChips';
import LazySelect from '@/components/LazySelect';
import { CONSTS } from '@/CONSTS';
import type { StatTables } from '@/data/statTables';
import {
  CARD_MARK_NUMBERS,
  setIdsForMark,
  cardDisplayStar,
  cardGradeField,
  cardGrades,
  slotUsingCard,
  cardIds,
  cardPairs,
  cardRowsOf,
  cardSetPickField,
  cardSlotField,
  selectedCardRow,
  usableMarkCount,
} from '@/calc/sources/heroWeaponCardPet/card';
import { gradeStarValue } from '@/calc/sources/heroWeaponCardPet/shared';
import { lineText, type StatDescriptions } from '@/calc/statText';
import type { TabPanelProps } from '@/calc/types';
import { splitFieldValues } from '@/calc/useTrackedCalcValues';
import IconPicker, { type PickerOption } from '@/calc/panels/heroWeaponCardPet/IconPicker';
import { CARD_SLOT_FIELDS, cardMarkFields, useCardNames } from '@/calc/panels/heroWeaponCardPet/cardPanelParts';
import { cardRowOf, parseOwnedCards } from '@/cardOptimizer/loadout';
import { useCalcStore } from '@/store/useCalcStore';
import { OWNED_CARDS_KEY } from '@/usb/saveImport/ownedCards';

const { CARD_ICON_PREFIX, EMPTY_CARD_ICON } = CONSTS.heroWeaponCardPet.card;
const { UNUSED_OPACITY } = CONSTS.heroWeaponCardPet.ui;

export interface CardSlotCardProps {
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
  /** false 면 세트 마크 칸을 그리지 않는다 (추천 화면: 마크는 묶음별 제목 아래에 따로 보여 준다). 기본 true */
  showMarks?: boolean;
}

/**
 * 카드 그림 고르기 창의 카드 목록: 최초 등급 (Card 표의 첫 행) 별로 묶고, 마우스를 올리면 그 첫 행 (가장 낮은 등급 · 성) 고유 효과를 보여 준다
 * (사용자 지시 2026-11-02). 편성 칸과 추천의 고정 카드가 같이 쓴다. onlyCardIds 를 주면 그 카드만
 */
export function cardPickerOptions(
  tables: StatTables,
  descriptions: StatDescriptions,
  translate: (key: string, params?: Record<string, unknown>) => string,
  cardName: (cardId: string) => string,
  onlyCardIds?: readonly string[],
): PickerOption[] {
  return cardIds(tables)
    .filter((cardId) => !onlyCardIds || onlyCardIds.includes(cardId))
    .map((cardId) => {
      const first = cardRowsOf(tables, cardId)[0];
      return {
        value: cardId,
        label: cardName(cardId),
        icon: CARD_ICON_PREFIX + cardId,
        group: first ? translate('calc.card.firstGradeGroup', { grade: first.grade }) : undefined,
        hint: first ? (
          <Stack gap={2}>
            <Text size="xs" fw={600}>
              {translate('calc.card.firstRowHint', { grade: first.grade, star: cardDisplayStar(tables, first) })}
            </Text>
            {cardPairs(first).map(([stat, value]) => (
              <Text key={stat} size="xs">
                {lineText(descriptions, { source: '', stat, value })}
              </Text>
            ))}
          </Stack>
        ) : undefined,
      };
    });
}

/** 편성 카드 칸 하나 (memo: 이 칸이 읽는 값이 바뀔 때만 다시 그린다) */
export const CardSlotCard = memo(function CardSlotCard(props: CardSlotCardProps) {
  const { slot, slotCardsText, gradeChoice, marksText, tables, descriptions, setValue, showMarks = true } = props;
  const { translate, cardName, setName } = useCardNames();
  // 공통 입력의 보유 카드 (저장 데이터에서 불러옴): 카드를 고를 때 등급 · 성 기본값
  const ownedText = useCalcStore((state) => state.values[OWNED_CARDS_KEY] ?? '');
  // 이 칸이 읽는 칸 값만 모은 값 (계산 함수는 이 값을 읽는다)
  const values = {
    ...splitFieldValues(slotCardsText, CARD_SLOT_FIELDS),
    ...splitFieldValues(marksText, cardMarkFields(slot)),
    [cardGradeField(slot)]: gradeChoice,
  };
  const cardOptions = [{ value: '', label: translate('calc.card.none'), icon: EMPTY_CARD_ICON }, ...cardPickerOptions(tables, descriptions, translate, cardName)];
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
            // 기본값 (사용자 결정 2026-11-02): 보유 카드 목록에 있으면 그 등급 · 성 (여러 장이면 표에서 가장 높은 것), 없으면 그 카드의 첫 행 (최초 등급 1성).
            // 비워 두면 칸이 흐려지고 계산에서 빠진다
            const rows = cardRowsOf(tables, picked);
            const ownedRows = parseOwnedCards(ownedText)
              .filter((card) => card.cardId === picked)
              .map((card) => cardRowOf(tables, card))
              .filter((ownedRow) => ownedRow !== undefined);
            const best = ownedRows.sort((a, b) => rows.indexOf(b) - rows.indexOf(a))[0] ?? rows[0];
            setValue(cardGradeField(slot), best ? gradeStarValue(best) : '');
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
          {showMarks && usable > 0 && <Text size="sm" c="dimmed">{translate('calc.card.setMarks')}</Text>}
          {/* 마크 칸은 등급·성에 따라 열린 수만큼만 */}
          {showMarks && CARD_MARK_NUMBERS.filter((mark) => mark <= usable).map((mark) => (
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
          {/* 아직 안 열린 마크 칸: 이 카드의 행 (등급·성 순) 중 slotCnt 가 그 번호 이상이 되는 첫 등급 */}
          {showMarks &&
            CARD_MARK_NUMBERS.filter((mark) => mark > usable).map((mark) => {
              const opensAt = candidates.find((candidate) => Number(candidate.slotCnt) >= mark)?.grade;
              return (
                <Text key={`locked-${mark}`} size="sm" c="dimmed">
                  {opensAt ? translate('calc.card.markOpensAt', { mark, grade: opensAt }) : translate('calc.card.markNeverOpens', { mark })}
                </Text>
              );
            })}
        </Stack>
        )}
      </Stack>
    </Card>
  );
});
