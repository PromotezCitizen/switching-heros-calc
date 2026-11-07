/**
 * 카드 편성 (최적 카드 추천): 보유 카드 목록 읽기, 편성 → 입력 칸 값, 입력 칸 값 → 편성.
 * 입력 칸 이름과 세트 점수 합은 저장 데이터 가져오기 (usb/saveImport/relicCardValues.ts) 와 같게 맞춘다.
 */
import {
  CARD_MARK_NUMBERS,
  CARD_SET_BONUS_FIELD,
  CARD_SLOT_NUMBERS,
  cardGradeField,
  cardRowsOf,
  cardSetPickField,
  cardSlotField,
  selectedCardRow,
} from '@/calc/sources/heroWeaponCardPet/card';
import { gradeStarValue } from '@/calc/sources/heroWeaponCardPet/shared';
import type { CalcValues } from '@/calc/types';
import type { StatTables, TableRow } from '@/data/statTables';

const CARD_SEPARATOR = ';';
const FIELD_SEPARATOR = ':';
const MARK_SEPARATOR = ',';
const SET_SEPARATOR = '/';
const CARD_FIELDS = 3;

export interface OwnedCard {
  cardId: string;
  /** 카드 표의 star (등급을 이어서 센 번호) */
  star: string;
  /** 세트 마크 칸 (0부터) 마다 고를 수 있는 세트 */
  setsByMark: string[][];
}

/** 편성의 한 칸: 카드와 칸마다 고른 세트 (picks[0] = 마크 1) */
export interface SlotLoadout {
  card: OwnedCard;
  picks: string[];
}
export type Loadout = SlotLoadout[];

/** 공통 입력 칸 account.cardOwned (usb/saveImport/ownedCards.ts) → 보유 카드 */
export function parseOwnedCards(text: string | undefined): OwnedCard[] {
  if (!text) return [];
  return text.split(CARD_SEPARATOR).flatMap((entry): OwnedCard[] => {
    const parts = entry.split(FIELD_SEPARATOR);
    if (parts.length < CARD_FIELDS) return [];
    const [cardId, star, marks] = parts;
    return [{ cardId, star, setsByMark: marks ? marks.split(MARK_SEPARATOR).map((sets) => sets.split(SET_SEPARATOR).filter(Boolean)) : [] }];
  });
}

/** 보유 카드 목록 → 저장 글 (parseOwnedCards 의 반대, 저장 형식은 usb/saveImport/ownedCards.ts 와 같음) */
export function formatOwnedCards(cards: OwnedCard[]): string {
  return cards
    .map((card) => [card.cardId, card.star, card.setsByMark.map((sets) => sets.join(SET_SEPARATOR)).join(MARK_SEPARATOR)].join(FIELD_SEPARATOR))
    .join(CARD_SEPARATOR);
}

/** 보유 카드의 표 행 (카드 번호 + 성) */
export function cardRowOf(tables: StatTables, card: OwnedCard): TableRow | undefined {
  return cardRowsOf(tables, card.cardId).find((row) => row.star === card.star);
}

/** 이 카드가 쓸 수 있는 세트 마크 칸 수 (표의 slotCnt, 고를 세트가 있는 칸까지만) */
export function markCountOf(tables: StatTables, card: OwnedCard): number {
  const row = cardRowOf(tables, card);
  return row ? Math.min(Number(row.slotCnt), card.setsByMark.length) : 0;
}

/** 편성을 넣은 입력값: 카드 칸 · 등급 성 · 세트 고르기를 전부 다시 쓰고, 세트 보너스 레벨 = 편성 카드의 세트 점수 합 */
export function valuesWithLoadout(values: CalcValues, tables: StatTables, loadout: Loadout): CalcValues {
  const next = { ...values };
  for (const slot of CARD_SLOT_NUMBERS) {
    delete next[cardSlotField(slot)];
    delete next[cardGradeField(slot)];
    for (const mark of CARD_MARK_NUMBERS) delete next[cardSetPickField(slot, mark)];
  }
  let setPoint = 0;
  loadout.forEach((entry, index) => {
    const row = cardRowOf(tables, entry.card);
    if (!row) return;
    const slot = CARD_SLOT_NUMBERS[index];
    next[cardSlotField(slot)] = entry.card.cardId;
    next[cardGradeField(slot)] = gradeStarValue(row);
    setPoint += Number(row.setPoint);
    entry.picks.slice(0, markCountOf(tables, entry.card)).forEach((setId, markIndex) => {
      next[cardSetPickField(slot, markIndex + 1)] = setId;
    });
  });
  next[CARD_SET_BONUS_FIELD] = String(setPoint);
  return next;
}

/** 입력값에 들어 있는 지금 편성. 보유 카드에 없는 칸은 뺀다. 안 고른 마크는 고를 수 있는 첫 세트 */
export function loadoutFromValues(values: CalcValues, tables: StatTables, owned: OwnedCard[]): Loadout {
  const loadout: Loadout = [];
  for (const slot of CARD_SLOT_NUMBERS) {
    const row = selectedCardRow(values, tables, slot);
    const card = row && owned.find((candidate) => candidate.cardId === row.cardId);
    if (!card) continue;
    const picks = card.setsByMark.map((sets, index) => {
      const pick = values[cardSetPickField(slot, index + 1)];
      return pick && sets.includes(pick) ? pick : (sets[0] ?? '');
    });
    loadout.push({ card: { ...card, star: row.star }, picks });
  }
  return loadout;
}
