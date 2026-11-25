/**
 * 배분 → 효율. 특성 레벨 칸 `mastery_<rNo>` 를 배분으로 덮어쓰고 공격 한 번씩 대미지 합 (targetDamage, log10, 클수록 좋음, 계산 불가는 −Infinity) 을 낸다.
 */
import { masteryLevel, masteryLevelKey, type MasteryTrait } from '@/calc/sources/masteryRuneBuff/mastery';
import type { CalcValues } from '@/calc/types';
import type { StatTables } from '@/data/statTables';
import { CONSTS } from '@/CONSTS';
import { targetDamageWithSwap } from '@/dpm/swapDamage';
import type { DamageInputs, DamageTarget } from '@/dpm/targetDamage';
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

/**
 * 한 번씩 대미지 합 (log10): 평타 1번 + 장착 직업 스킬 1번씩 + 전용 스킬 1번 + 교체 스킬 1번 (교체가 켜져 있으면 두 히어로 모두).
 * 쿨타임 · 시전 횟수는 보지 않는다. 계산할 수 없으면 −Infinity
 */
export function oneCastEachLog(values: CalcValues, tables: StatTables, target: DamageTarget, inputs: DamageInputs): number {
  return targetDamageWithSwap(values, tables, target, inputs).totalLog;
}

/**
 * 특성 추천의 비교 값 (oneCastEachLog). 초과분 10% 마다 붙는 특성은 확률이 OPTIMIZER_RULES.RUSH_MIN_CHANCE 를 넘어야 센다
 */
export function evaluateOneCastEach(
  values: CalcValues,
  traits: MasteryTrait[],
  tables: StatTables,
  allocation: Allocation,
  target: DamageTarget,
  inputs: DamageInputs,
): number {
  const { RUSH_MIN_CHANCE, RUSH_MIN_CHANCE_FIELD } = CONSTS.dpm.OPTIMIZER_RULES;
  const allocated = { ...valuesWithAllocation(values, traits, allocation), [RUSH_MIN_CHANCE_FIELD]: String(RUSH_MIN_CHANCE) };
  return oneCastEachLog(allocated, tables, target, inputs);
}
