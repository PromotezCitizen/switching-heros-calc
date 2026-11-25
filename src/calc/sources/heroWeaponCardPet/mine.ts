/**
 * 광산 주인의 축복 → 효과 줄 (공격력·체력 같은 값).
 * 배율 M = (모든 광부 각성 레벨 총합 + 1) × (1 + (광산 투자 레벨 − 1) × 1.5) (앱 코드 식, 계수 1.5 = 서버 표 Option MINE_BLESS_STAT_1·2).
 * 화면 값 = (M − 1) × 100 %, 합산에 들어가는 값 = M × 100 %.
 * 이 계정 두 점 확인: 레벨 14 · 총합 17 → 36.8A%, 레벨 14 · 총합 18 → 38.85A% (2026-10-06, 10-07)
 * 각성 총합 = 보유 히어로 전체의 캐릭터 각성 레벨 합 (히어로 탭 칸에서 계산, 입력 칸 없음).
 * 근거: 앱 각성 합 함수 m17376 → m15934 가 히어로 목록 전부를 더하고 배치 여부 조건이 없음 (work_weapon/mine/README.md 11줄).
 * 화면 확인: 투자 레벨 29, 각성 레벨 10 9 6 1 2 15 (각성 1 인 히어로는 배치 안 함) → "모든 광부 각성 레벨 총합" 43, 축복 189.1A%
 * = (43 + 1) × (1 + 28 × 1.5) − 1 = 1891 → 189,100% (claude-docs/react-port/mine-blessing-screen-2026-11-25.md)
 */
import { CONSTS } from '@/CONSTS';
import type { Line } from '@/calc/combine';
import type { CalcValues } from '@/calc/types';
import { numberValue, type SourceLabel } from '@/calc/sources/heroWeaponCardPet/shared';
import { rosterAwakenField, rosterGradeField } from '@/calc/sources/hero/rosterFields';

const { PERCENT_LOG, STATS, GROWTH_PER_LEVEL, FIRST_LEVEL } = CONSTS.heroWeaponCardPet.mine;

export const MINE_LEVEL_FIELD = 'mineLevel';
/** 각성 칸 이름 앞부분 (뒤에 캐릭터 번호) */
const AWAKEN_FIELD_PREFIX = rosterAwakenField('');

/** 모든 광부 각성 레벨 총합 = 보유 히어로 (히어로 탭 등급이 있는 히어로) 의 캐릭터 각성 레벨 합 */
export function mineAwakenTotal(values: CalcValues): number {
  let total = 0;
  for (const field of Object.keys(values)) {
    if (!field.startsWith(AWAKEN_FIELD_PREFIX)) continue;
    const charId = field.slice(AWAKEN_FIELD_PREFIX.length);
    if (values[rosterGradeField(charId)]) total += numberValue(values, field);
  }
  return total;
}

/** 광산 축복 배율 M. 투자 레벨이 비었거나 1 이면 (축복 없음) null */
export function mineMultiplier(values: CalcValues): number | null {
  const level = numberValue(values, MINE_LEVEL_FIELD);
  // 게임 m17380: 투자 레벨 − 1 = 0 이면 0 (축복 없음, work_weapon/mine/README.md). 레벨 1 은 화면 '-' 와 같게 줄 없음
  if (level <= FIRST_LEVEL) return null;
  const awakenTotal = mineAwakenTotal(values);
  return (awakenTotal + 1) * (1 + (level - FIRST_LEVEL) * GROWTH_PER_LEVEL);
}

export function mineLines(values: CalcValues, label: SourceLabel): Line[] {
  const multiplier = mineMultiplier(values);
  if (multiplier === null) return [];
  const log = Math.log10(multiplier) + PERCENT_LOG;
  return STATS.map((stat) => ({ source: label('calc.mine.source'), stat, log }));
}
