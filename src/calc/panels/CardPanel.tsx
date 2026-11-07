import { useMemo } from 'react';
import { Collapse, Stack, Text, TextInput, UnstyledButton } from '@mantine/core';
import AutoGrid from '@/components/AutoGrid';
import HorizontalScrollRow from '@/components/HorizontalScrollRow';
import SectionTitle from '@/components/SectionTitle';
import { useDisclosure } from '@mantine/hooks';
import { CONSTS } from '@/CONSTS';
import {
  CARD_SET_BONUS_FIELD,
  CARD_SLOT_NUMBERS,
  cardGradeField,
  cardSetStates,
  stickerCountField,
  stickerLevelField,
  stickerUnlocked,
} from '@/calc/sources/heroWeaponCardPet/card';
import { groupBy, rowsOf } from '@/calc/sources/heroWeaponCardPet/shared';
import type { TabPanelProps } from '@/calc/types';
import { joinFieldValues } from '@/calc/useTrackedCalcValues';
import CardSetCards from '@/calc/panels/heroWeaponCardPet/CardSetCards';
import OwnedCardsTable from '@/calc/panels/heroWeaponCardPet/OwnedCardsTable';
import { CardSlotCard } from '@/calc/panels/heroWeaponCardPet/CardSlotCard';
import { StickerRow } from '@/calc/panels/heroWeaponCardPet/StickerRow';
import { CARD_SLOT_FIELDS, cardMarkFields, useCardNames } from '@/calc/panels/heroWeaponCardPet/cardPanelParts';

const { MIN_NUMBER } = CONSTS.heroWeaponCardPet;
const SSS_STICKER_COUNT_FIELD = CONSTS.masteryRuneBuff.ULTIMATE_COUNT_FIELDS.EqSSS_StickerCnt;
const { CARD_SLOT_WIDTH } = CONSTS.heroWeaponCardPet.ui;
const { CARD_MIN_WIDTH } = CONSTS.display;

/**
 * 몬스터 카드: 편성 카드 6칸 (카드·등급·성·세트 마크), 카드 세트, 스티커 세트 (기존 buildCard / renderCard).
 * 칸 · 세트 칸 · 스티커 줄은 heroWeaponCardPet/ 아래 부품 (CardSlotCard · CardSetCards · StickerRow) 으로 나눠 두었다 (추천 화면도 같은 부품을 쓴다)
 */
export default function CardPanel({ values, setValue, tables, descriptions }: TabPanelProps) {
  const { translate, setName } = useCardNames();
  const [stickersOpened, stickers] = useDisclosure(false);
  const stickerOpen = stickerUnlocked(values, tables);
  const stickerGroups = useMemo(() => groupBy(rowsOf(tables, 'CardStickerSet'), 'stickerId'), [tables]);

  const setStates = cardSetStates(values, tables);

  const markGroups = useMemo(() => {

    const slotOf = new Map(rowsOf(tables, 'CardSet').map((row) => [row.setId, Number(row.slot)]));

    const shown = setStates.filter((set) => set.markCount > 0);

    return [...new Set(shown.map((set) => slotOf.get(set.setId) ?? 0))]

      .sort((left, right) => left - right)

      .map((mark) => ({ mark, sets: shown.filter((set) => (slotOf.get(set.setId) ?? 0) === mark).sort((left, right) => right.markCount - left.markCount) }));

  }, [setStates, tables]);
  const hasMarks = setStates.some((set) => set.markCount > 0);
  const slotCardsText = joinFieldValues(values, CARD_SLOT_FIELDS);

  return (
    <Stack gap="md">
      {/* 보유 카드 (공통 값 account.cardOwned): 접어 두고, 펼치면 카드마다 등급 · 성 */}
      <OwnedCardsTable tables={tables} />
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
      {/* 마크 묶음 (CardSet 표 slot = 카드 칸 번호) 마다 제목 (세트별 마크 수) 과 그 묶음의 세트 칸 (추천 화면과 같은 방식) */}
      {markGroups.map((group) => (
        <Stack key={group.mark} gap="xs">
          <Text fw={700}>
            {translate('optimizer.cards.markGroupTitle', { mark: group.mark, parts: group.sets.map((set) => `${setName(set.setId)} ${set.markCount}`).join(' + ') })}
          </Text>
          <CardSetCards setStates={group.sets} descriptions={descriptions} />
        </Stack>
      ))}
      {!hasMarks && <Text size="sm" c="dimmed">{translate('calc.card.setNone')}</Text>}

      {/* 스티커 (배지): 열렸을 때만 (장착 카드에 배지 칸이 있을 때) */}
      {stickerOpen && (
        <>
          <SectionTitle>{translate('calc.card.stickerTitle')}</SectionTitle>
          <UnstyledButton onClick={stickers.toggle} aria-expanded={stickersOpened}>
            <Text c="blue">{translate('calc.card.stickerExpand')}</Text>
          </UnstyledButton>
          <Collapse expanded={stickersOpened}>
            <Text size="xs" c="dimmed">{translate('calc.card.stickerLevelHelp')}</Text>
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
          {/* 얼티밋 3019 · 3020 의 개수: 저장 데이터에 배지 예시가 없어 직접 입력 */}
          <TextInput
            type="number"
            min={MIN_NUMBER}
            inputMode="numeric"
            label={translate('calc.card.sssStickerCount')}
            value={values[SSS_STICKER_COUNT_FIELD] ?? ''}
            onChange={(event) => setValue(SSS_STICKER_COUNT_FIELD, event.currentTarget.value)}
          />
        </>
      )}
    </Stack>
  );
}
