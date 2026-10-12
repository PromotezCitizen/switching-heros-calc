/**
 * 광산 주인의 축복 → 효과 줄 (공격력·체력 같은 값).
 * 배율 M = (모든 광부 각성 레벨 총합 + 1) × (1 + (광산 투자 레벨 − 1) × 1.5) (앱 코드 식, 계수 1.5 = 서버 표 Option MINE_BLESS_STAT_1·2).
 * 화면 값 = (M − 1) × 100 %, 합산에 들어가는 값 = M × 100 %.
 * 이 계정 두 점 확인: 레벨 14 · 총합 17 → 36.8A%, 레벨 14 · 총합 18 → 38.85A% (2026-10-06, 10-07)
 */
import { CONSTS } from '../../../CONSTS';
import type { Line } from '../../combine';
import type { CalcValues } from '../../types';
import { numberValue, type SourceLabel } from './shared';

const { PERCENT_LOG, STATS, GROWTH_PER_LEVEL, FIRST_LEVEL } = CONSTS.heroWeaponCardPet.mine;

export const MINE_LEVEL_FIELD = 'mineLevel';
export const MINE_AWAKEN_LEVEL_FIELD = 'mineAwakenLevel';

/** 광산 축복 배율 M. 투자 레벨이 비었으면 (광산 없음) null */
export function mineMultiplier(values: CalcValues): number | null {
  const level = numberValue(values, MINE_LEVEL_FIELD);
  if (level < FIRST_LEVEL) return null;
  const awakenTotal = numberValue(values, MINE_AWAKEN_LEVEL_FIELD);
  return (awakenTotal + 1) * (1 + (level - FIRST_LEVEL) * GROWTH_PER_LEVEL);
}

export function mineLines(values: CalcValues, label: SourceLabel): Line[] {
  const multiplier = mineMultiplier(values);
  if (multiplier === null) return [];
  const log = Math.log10(multiplier) + PERCENT_LOG;
  return STATS.map((stat) => ({ source: label('calc.mine.source'), stat, log }));
}
