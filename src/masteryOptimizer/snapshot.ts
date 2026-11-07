/**
 * "최적 특성" 페이지가 보여 주는 지금 상태: 총 포인트 · 사용 · 남은 포인트, 규칙 검사, 지금 배분의 효율과 평가 시간.
 * 최적화 실행은 아직 연결 전 (계획 3~4단계). 계획: claude-docs/plans/2026-10-28-mastery-optimizer.md
 */
import { masteryTraits } from '@/calc/sources/masteryRuneBuff/mastery';
import type { CalcValues } from '@/calc/types';
import type { StatTables } from '@/data/statTables';
import { targetDamageWithSwap } from '@/dpm/swapDamage';
import type { DamageInputs, DamageTarget, TargetDamage } from '@/dpm/targetDamage';
import { totalMasteryPoints } from '@/masteryOptimizer/budget';
import { allocationFromValues, efficiencyLog } from '@/masteryOptimizer/evaluate';
import { usedPoints, validateAllocation, type RuleViolation } from '@/masteryOptimizer/rules';

export interface OptimizerInputs {
  userLevel: number;
  vipLevel: number;
  target: DamageTarget;
  damage: DamageInputs;
}

export interface OptimizerSnapshot {
  /** 유저 레벨 − 1 + VIP 몫 */
  totalPoints: number;
  vipPoints: number;
  usedPoints: number;
  /** 총 − 사용 (프리셋 하나 기준) */
  remainingPoints: number;
  /** 레벨 > 0 인 특성 수 */
  allocationSize: number;
  violations: RuleViolation[];
  result: TargetDamage;
  /** 대상 효율 log10 (스테이지 = 분당, 나머지 = 누적). 계산 불가는 −Infinity */
  efficiency: number;
  /** 대상 대미지 계산 1회에 걸린 시간 (ms) */
  evaluateMs: number;
}

export function optimizerSnapshot(values: CalcValues, tables: StatTables, inputs: OptimizerInputs): OptimizerSnapshot {
  const traits = masteryTraits(tables.Mastery);
  const allocation = allocationFromValues(values, traits);
  const totalPoints = totalMasteryPoints(tables, inputs.userLevel, inputs.vipLevel);
  const used = usedPoints(traits, allocation);
  const start = performance.now();
  const result = targetDamageWithSwap(values, tables, inputs.target, inputs.damage);
  const evaluateMs = performance.now() - start;
  return {
    totalPoints,
    vipPoints: totalMasteryPoints(tables, 1, inputs.vipLevel),
    usedPoints: used,
    remainingPoints: totalPoints - used,
    allocationSize: Object.keys(allocation).length,
    violations: validateAllocation(traits, allocation, inputs.userLevel, totalPoints),
    result,
    efficiency: efficiencyLog(result),
    evaluateMs,
  };
}
