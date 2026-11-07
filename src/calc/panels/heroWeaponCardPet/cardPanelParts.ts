import { useTranslation } from 'react-i18next';
import { CONSTS } from '@/CONSTS';
import { CARD_MARK_NUMBERS, CARD_SLOT_NUMBERS, cardSetPickField, cardSlotField } from '@/calc/sources/heroWeaponCardPet/card';

const { SET_ICON_UPPER_CASE_MAX, SET_ICON_UPPER_PREFIX, SET_ICON_LOWER_PREFIX } = CONSTS.heroWeaponCardPet.card;

/** 편성 칸마다 카드 칸 이름 (다른 칸에 편성 중인지 볼 때 씀) */
export const CARD_SLOT_FIELDS = CARD_SLOT_NUMBERS.map(cardSlotField);

/** 세트 아이콘 파일 이름: 1~15 = Set<n>, 16~ = set<n> (게임 그림 묶음 그대로) */
export function cardSetIcon(setId: string): string {
  return (Number(setId) <= SET_ICON_UPPER_CASE_MAX ? SET_ICON_UPPER_PREFIX : SET_ICON_LOWER_PREFIX) + setId;
}

/** 편성 칸 하나가 읽는 세트 마크 칸 이름 */
export function cardMarkFields(slot: number): string[] {
  return CARD_MARK_NUMBERS.map((mark) => cardSetPickField(slot, mark));
}

/** 카드 이름·세트 이름 (번역이 없으면 번호로) */
export function useCardNames() {
  const { t: translate } = useTranslation();
  const cardName = (cardId: string) =>
    translate(`calc.card.cardNames.${cardId}`, { defaultValue: translate('calc.card.cardFallback', { id: cardId }) });
  const setName = (setId: string) =>
    translate(`calc.card.setNames.${setId}`, { defaultValue: translate('calc.card.setFallback', { id: setId }) });
  return { translate, cardName, setName };
}
