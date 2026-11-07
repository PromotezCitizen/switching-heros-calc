/**
 * 저장 데이터 Card 의 보유 카드 → 공통 입력 한 칸 (account.cardOwned). 최적 카드 추천이 후보로 쓴다.
 * 형식: `카드번호:성번호:1번 칸 세트/…,2번 칸 세트/…;다음 카드` (성번호는 카드 표의 star, 칸 세트는 그 칸에서 고를 수 있는 세트)
 */
import { readDictionary, type SaveDictionary } from '@/usb/saveImport/saveDictionary';

export const OWNED_CARDS_KEY = 'account.cardOwned';
const CARD_SEPARATOR = ';';
const FIELD_SEPARATOR = ':';
const MARK_SEPARATOR = ',';
const SET_SEPARATOR = '/';

export interface OwnedCardSave {
  cardDic: SaveDictionary<number, { trsc: number; setIdDic?: SaveDictionary<number, { setIdList: number[] }> }>;
}

export function ownedCardsText(card: OwnedCardSave): string {
  return [...readDictionary(card.cardDic)]
    .map(([cardId, owned]) => {
      const marks = [...readDictionary(owned.setIdDic ?? { k: [], v: [] })].sort(([left], [right]) => left - right);
      return [cardId, owned.trsc, marks.map(([, sets]) => sets.setIdList.join(SET_SEPARATOR)).join(MARK_SEPARATOR)].join(FIELD_SEPARATOR);
    })
    .join(CARD_SEPARATOR);
}
