/**
 * 배분 → 효율. 특성 레벨 칸 `mastery_<rNo>` 를 배분으로 덮어쓰고 대상 대미지 (`targetDamage`) 를 계산한다.
 * 효율 = 스테이지는 분당 대미지, 나머지 셋은 누적 시간 동안의 대미지 (둘 다 log10, 클수록 좋음, 계산 불가는 −Infinity).
 */
import { masteryLevel, masteryLevelKey, type MasteryTrait } from '@/calc/sources/masteryRuneBuff/mastery';
import type { CalcValues } from '@/calc/types';
import type { StatTables } from '@/data/statTables';
import { CONSTS } from '@/CONSTS';
import { swappedHeroValues, targetDamageWithSwap } from '@/dpm/swapDamage';
import { logSum, maxNormalHitLog, type DamageInputs, type DamageTarget, type TargetDamage } from '@/dpm/targetDamage';
import type { Allocation } from '@/masteryOptimizer/rules';

/** 입력값의 특성 레벨 칸 → 배분 (레벨 0 은 뺀다) */
export function allocationFromValues(values: CalcValues, traits: MasteryTrait[]): Allocation {
  const allocation: Allocation = {};
  for (const trait of traits) {
    const level = masteryLevel(values, trait);
    if (level > 0) allocation[trait.rNo] = level;
  }
  return allocation;
}

/** 모든 특성 레벨 칸을 배분으로 바꾼 입력값 (배분에 없는 특성은 칸을 비운다) */
export function valuesWithAllocation(values: CalcValues, traits: MasteryTrait[], allocation: Allocation): CalcValues {
  const next = { ...values };
  for (const trait of traits) {
    const key = masteryLevelKey(trait.rNo);
    const level = allocation[trait.rNo] ?? 0;
    if (level > 0) next[key] = String(level);
    else delete next[key];
  }
  return next;
}

/** 대상 대미지 결과 → 효율 log */
export function efficiencyLog(result: TargetDamage): number {
  return result.target === 'stage' ? result.perMinuteLog : (result.windowTotalLog ?? -Infinity);
}

export function evaluateAllocation(
  values: CalcValues,
  traits: MasteryTrait[],
  tables: StatTables,
  allocation: Allocation,
  target: DamageTarget,
  inputs: DamageInputs,
): number {
  return efficiencyLog(targetDamageWithSwap(valuesWithAllocation(values, traits, allocation), tables, target, inputs));
}

/**
 * 특성 추천의 비교 값: 최대 상태의 평타 한 번 대미지 (log10, maxNormalHitLog). 초과분 10% 마다 붙는 특성은
 * 확률이 OPTIMIZER_RULES.RUSH_MIN_CHANCE 를 넘어야 센다. 교체가 켜져 있으면 두 히어로 값의 평균
 */
export function evaluateMaxHit(
  values: CalcValues,
  traits: MasteryTrait[],
  tables: StatTables,
  allocation: Allocation,
  target: DamageTarget,
  inputs: DamageInputs,
): number {
  const { RUSH_MIN_CHANCE, RUSH_MIN_CHANCE_FIELD } = CONSTS.dpm.OPTIMIZER_RULES;
  const allocated = { ...valuesWithAllocation(values, traits, allocation), [RUSH_MIN_CHANCE_FIELD]: String(RUSH_MIN_CHANCE) };
  const first = maxNormalHitLog(allocated, tables, target, inputs);
  const swapped = inputs.swap ? swappedHeroValues(allocated) : null;
  if (!swapped) return first;
  const second = maxNormalHitLog(swapped, tables, target, inputs);
  if (second === -Infinity) return first;
  return logSum([first, second]) - Math.log10(2);
}
