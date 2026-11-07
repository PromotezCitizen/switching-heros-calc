/**
 * 한 적중의 배수 (확률 판정은 chanceOf: 100 이상이면 성공, 미만이면 0). 판정은 서로 독립이라 곱한다 (damage-pipeline.md 7절).
 * 치명타 · 슈퍼 치명타: damage-formula.md 2-4, super-critical-fields.md 4절 (m2710). 관통 m2711, 무자비 m2712: damage-formula.md 2-5
 */
import { CONSTS } from '@/CONSTS';

const { CRITICAL_DAMAGE_DIVISOR, PROBABILITY_MAX, PERCENT_DIVISOR, SUPER_CRITICAL, SPEAR, SMITE } = CONSTS.dpm;

/**
 * 확률 % → 성공 여부 (1 또는 0). 100 이상이면 늘 성공, 100 미만이면 효과 0 (사용자 결정 2026-11-01:
 * "확률 100 밑으로 내려가면 무조건 0 으로 간주", "비율 기반 대미지 필요 없다, 99든 98이든 안 뜨면 그만큼 딜로스").
 * 확률로 켜지는 효과의 기대값 (확률 × 성공 배수) 을 쓰지 않는다
 */
export function chanceOf(percent: number): number {
  return percent >= PROBABILITY_MAX ? 1 : 0;
}

/** 확률 P 가 step 마다 거듭제곱하는 배수: (1 + 증가 % / 100)^floor(정수화(P) / step). 증가가 0 이면 1 */
function stepPower(addPercent: number, chancePercent: number, step: number): number {
  if (addPercent === 0) return 1;
  return Math.pow(1 + addPercent / PERCENT_DIVISOR, Math.floor(Math.trunc(chancePercent) / step));
}

export interface SuperCriticalStats {
  /** [0x10] superCritical. 0 이면 슈퍼 치명타 없음 */
  base: number;
  /** [0x20] superCriticalAddPer */
  add: number;
  /** [0x30] superCriticalOverPer: 치명타 확률 100 초과분 10 마다 */
  over: number;
  /** [0x60] _per_superCriticalAddDmg */
  damage: number;
  /** [0x70] supremeCritical (2단계 확률) */
  supremeChance: number;
  /** [0x80] _per_supremeCriticalDmgUp (2단계 배수 T 의 기본, 0 이면 1) */
  supremeDamage: number;
  /** [0x90] supremeCriticalOverToDmg (2단계 확률 100 초과분 × 이 값 / 100 을 T 에 더함) */
  supremeOverToDamage: number;
}

/** 슈퍼 치명타 확률 P1 (치명타 확률 V 가 100 을 넘은 만큼 10 마다 over 를 더함) */
export function superCriticalChance(stats: SuperCriticalStats, criticalRate: number): number {
  const overSteps =
    criticalRate > SUPER_CRITICAL.RATE_THRESHOLD ? Math.floor(Math.trunc(criticalRate - SUPER_CRITICAL.RATE_THRESHOLD) / SUPER_CRITICAL.STEP) : 0;
  return stats.base + stats.add + overSteps * stats.over;
}

/** 치명 성공 뒤 슈퍼 치명타 기대 배수 Es. base 가 0 이면 1 */
export function expectedSuperCritical(stats: SuperCriticalStats, criticalRate: number): number {
  if (stats.base === 0) return 1;
  const chance = superCriticalChance(stats, criticalRate);
  const success = SUPER_CRITICAL.BASE * stepPower(stats.damage, chance, SUPER_CRITICAL.STEP);
  let supreme = 1;
  if (stats.supremeChance !== 0) {
    const over =
      stats.supremeChance > PROBABILITY_MAX && stats.supremeOverToDamage !== 0
        ? ((stats.supremeChance - PROBABILITY_MAX) * stats.supremeOverToDamage) / PERCENT_DIVISOR
        : 0;
    const multiplier = (stats.supremeDamage === 0 ? 1 : stats.supremeDamage) + over;
    const supremeChance = chanceOf(stats.supremeChance);
    supreme = 1 - supremeChance + supremeChance * SUPER_CRITICAL.SUPREME.BASE * multiplier;
  }
  const superChance = chanceOf(chance);
  return 1 - superChance + superChance * success * supreme;
}

/** 치명타 기대 배수 Ec = (1 − pc) + pc × (C / 100) × D × Es */
export function expectedCritical(criticalRate: number, damageSum: number, damageMultiplier: number, superCritical: number): number {
  const chance = chanceOf(criticalRate);
  return 1 - chance + chance * (damageSum / CRITICAL_DAMAGE_DIVISOR) * damageMultiplier * superCritical;
}

/** 관통 기대 배수 Ep = (1 − q) + q × 2 × (1 + addDmg/100)^floor(P/10) */
export function expectedSpear(chancePercent: number, addDamage: number): number {
  if (chancePercent <= 0) return 1;
  const chance = chanceOf(chancePercent);
  return 1 - chance + chance * SPEAR.BASE * stepPower(addDamage, chancePercent, SPEAR.STEP);
}

/** 무자비 기대 배수: 대상 상태이상 0 → 1, 아니면 (1 − q) + q × (3 + addDmg/100) × (상태이상 ≥ 2 이고 CC ≠ 0 이면 (1 + CC/100)^상태이상 수) */
export function expectedSmite(chancePercent: number, addDamage: number, ccDamage: number, statusCount: number): number {
  if (statusCount <= 0 || chancePercent <= 0) return 1;
  const chance = chanceOf(chancePercent);
  const cc = statusCount >= SMITE.CC_FROM_COUNT && ccDamage !== 0 ? Math.pow(1 + ccDamage / PERCENT_DIVISOR, statusCount) : 1;
  return 1 - chance + chance * (SMITE.BASE + addDamage / PERCENT_DIVISOR) * cc;
}
