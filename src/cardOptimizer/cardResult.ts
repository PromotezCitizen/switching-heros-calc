/** 카드 추천 결과 · 고정 카드의 저장 칸 (카드 추천 화면과 일괄 계산이 같이 쓴다) */
import { CARD_SLOT_NUMBERS } from '@/calc/sources/heroWeaponCardPet/card';
import type { LockedMarkGroup } from '@/cardOptimizer/lockedMarkGroups';
import type { Loadout } from '@/cardOptimizer/loadout';

/** 마지막 추천 결과를 저장하는 칸의 앞부분 (새로고침해도 결과를 다시 계산하지 않고 바로 보여 주려고). 대상마다 따로: `<앞부분>.<대상>.<교체>` */
export const CARD_RESULT_KEY = 'optimizer.cardResult';
/** 고정 카드 칸 (카드 번호를 쉼표로). 칸이 없으면 기본 고정 카드, 빈 글이면 고정 없음 */
export const CARD_FIXED_KEY = 'optimizer.cardFixed';
/** 기본 고정 카드: 씨도그 해피 36 · 화산갑주 거북 33 · 그렘린 캐티 35 (대상 6개 추천에 모두 들어간 카드) */
export const DEFAULT_FIXED_CARDS = ['36', '33', '35'];
/** 고정할 수 있는 최대 장수 (적어도 한 칸은 찾게) */
export const MAX_FIXED_CARDS = CARD_SLOT_NUMBERS.length - 1;

/** 저장하는 결과: 카드마다 번호와 세트 마크, 비교 기준 (지금 편성) 과 추천 효율 */
export interface StoredCardResult {
  cards: { cardId: string; picks: string[] }[];
  before: number;
  after: number;
  /** 안 열린 마크 묶음의 0 · 2 · 4 · 6장 선택 (lockedMarkGroups.ts) */
  lockedGroups?: LockedMarkGroup[];
}

export function cardResultKey(slot: string): string {
  return `${CARD_RESULT_KEY}.${slot}`;
}

/** 저장된 고정 카드 칸 → 카드 번호 목록 */
export function fixedCardIdsOf(text: string | undefined): string[] {
  return text === undefined ? DEFAULT_FIXED_CARDS : text.split(',').filter(Boolean);
}

/** 마크까지 끝난 편성 → 저장 결과 */
export function storedCardResult(loadout: Loadout, before: number, after: number, lockedGroups?: LockedMarkGroup[]): StoredCardResult {
  return { cards: loadout.map((entry) => ({ cardId: entry.card.cardId, picks: entry.picks })), before, after, lockedGroups };
}
