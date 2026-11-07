/** 카드 추천 작업자 (cardRecommend.worker.ts) 와 화면이 주고받는 메시지 */
import type { LockedMarkGroup } from '@/cardOptimizer/lockedMarkGroups';
import type { CardRecommendation, CardRecommendProgress } from '@/cardOptimizer/recommendCards';
import type { CalcValues } from '@/calc/types';
import type { StatTables } from '@/data/statTables';
import type { OptimizerInputs } from '@/masteryOptimizer/snapshot';

export interface CardRecommendRequest {
  /** 계산식 확인기 칸 (접두사 뗀 것) + VIP 레벨 — 화면의 `calcValues` 와 같은 것 */
  values: CalcValues;
  tables: StatTables;
  inputs: OptimizerInputs;
  /** 공통 입력 칸 account.cardOwned 의 글 */
  ownedText: string;
  /** cards: 카드 6장만 고른다 (세트 마크는 안 본다). marks: 정해진 카드의 세트 마크만 고른다 — 둘은 따로 계산한다 */
  mode: 'cards' | 'marks' | 'markGroup' | 'lockedGroup';
  /** marks 모드에서 마크를 정할 카드 번호 (없으면 지금 끼고 있는 카드) */
  cardIds?: string[];
  /**
   * 하위 작업자 (marks 작업자가 묶음마다 띄움, 사용자 지시 2026-11-02 "마크 계산 묶음별 작업자 분리"):
   * markGroup = 묶음 하나 (mark, 0부터) 의 세트 몰기, lockedGroup = 안 열린 묶음 하나 (mark, 1부터) 의 0 · 2 · 4 · 6장.
   * picks = 카드마다 지금 고른 세트 (cardIds 순서)
   */
  picks?: string[][];
  mark?: number;
  /** cards 모드: 바꾸지 않고 먼저 넣어 둘 카드 번호 (보유한 것만 쓰임) */
  fixedCardIds?: string[];
}

export type CardRecommendMessage =
  /** 비교 기준: 지금 편성의 효율 */
  | { type: 'base'; efficiency: number }
  | { type: 'progress'; progress: CardRecommendProgress }
  | { type: 'done'; result: CardRecommendation }
  /** 하위 작업자 결과: 묶음 하나의 카드별 세트 (cardIds 순서) · 효율 */
  | { type: 'groupDone'; picks: string[]; efficiency: number }
  /** 하위 작업자 결과: 안 열린 묶음 하나의 0 · 2 · 4 · 6장 */
  | { type: 'lockedDone'; group: LockedMarkGroup | null }
  | { type: 'failed'; message: string };
