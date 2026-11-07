/** 추천 계산 작업자 (recommend.worker.ts) 와 화면이 주고받는 메시지 */
import type { CalcValues } from '@/calc/types';
import type { StatTables } from '@/data/statTables';
import type { Recommendation, RecommendProgress } from '@/masteryOptimizer/recommend';
import type { OptimizerInputs } from '@/masteryOptimizer/snapshot';

export interface RecommendRequest {
  /** 계산식 확인기 칸 (접두사 뗀 것) + VIP 레벨 — 화면의 `calcValues` 와 같은 것 */
  values: CalcValues;
  tables: StatTables;
  inputs: OptimizerInputs;
}

export type RecommendMessage =
  /** 비교 기준: 지금 프리셋의 효율 (탐색이 끝나기 전에 멈춰도 보여 주려고 먼저 보낸다) */
  | { type: 'base'; efficiency: number }
  | { type: 'progress'; progress: RecommendProgress }
  | { type: 'done'; result: Recommendation }
  | { type: 'failed'; message: string };
