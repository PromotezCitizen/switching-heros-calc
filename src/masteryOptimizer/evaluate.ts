/**
 * 배분 → 효율. 특성 레벨 칸 `mastery_<rNo>` 를 배분으로 덮어쓰고 대상 대미지 (`targetDamage`) 를 계산한다.
 * 효율 = 스테이지는 분당 대미지, 나머지 셋은 누적 시간 동안의 대미지 (둘 다 log10, 클수록 좋음, 계산 불가는 −Infinity).
 */
import { masteryLevel, masteryLevelKey, type MasteryTrait } from '@/calc/sources/masteryRuneBuff/mastery';
import type { CalcValues } from '@/calc/types';
import type { StatTables } from '@/data/statTables';
import { targetDamageWithSwap } from '@/dpm/swapDamage';
import type { DamageInputs, DamageTarget, TargetDamage } from '@/dpm/targetDamage';
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
