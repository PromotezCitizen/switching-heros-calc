/**
 * 특성 추천의 고정 · 무시 규칙 (consts OPTIMIZER_RULES).
 * - fixed: 출발 배분에서 최대 레벨로 찍고, 탐색 중에 빼지 않는다
 * - ignored: 찍지 않는다 (무시 목록 + 대상 종류에 맞지 않는 방어 특성)
 */
import { CONSTS } from '@/CONSTS';
import type { DamageTarget } from '@/dpm/targetDamage';

const { OPTIMIZER_RULES, TARGETS } = CONSTS.dpm;

export interface TraitPolicy {
  fixed: ReadonlySet<string>;
  ignored: ReadonlySet<string>;
}

export function traitPolicyFor(target: DamageTarget): TraitPolicy {
  const unit = TARGETS[target].UNIT;
  const otherDefense = Object.entries(OPTIMIZER_RULES.DEFENSE)
    .filter(([kind]) => kind !== unit)
    .flatMap(([, rNos]) => rNos);
  return {
    fixed: new Set(OPTIMIZER_RULES.FIXED),
    ignored: new Set([...OPTIMIZER_RULES.IGNORED, ...otherDefense]),
  };
}
