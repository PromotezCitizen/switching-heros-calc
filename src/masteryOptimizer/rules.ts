/**
 * 특성 최적 배분 규칙: 예산 (찍은 포인트 합), 해금 판정, 배분 검사 (claude-docs/mastery-optimizer-design.md 1절).
 * - 일반 특성: 유저 레벨 ≥ unlockLevel 그리고 같은 묶음의 앞 단계에 최대 레벨을 채운 특성이 하나 이상
 * - 얼티밋 (`*_odd`): 유저 레벨 그리고 같은 묶음의 마지막 단계 (18단계) 특성 중 하나가 최대 레벨 (5000).
 *   사용자 결정 2026-11-01 ("18단계 하나라도 5000이 아니면 얼티밋 못찍게 해라"). 저장된 프리셋 7개가 모두 그렇다 (얼티밋이 있는 묶음은 18단계 하나가 5000).
 *   옛 규칙 "유저 레벨만, 앞 단계 조건 없음" 은 사용자 말 ("1행에 있는거 안찍어도 찍을 수 있다") 을 넓혀 적은 것이라 버렸다
 * - 예산: 묶음 구분 없이 하나로 합친 풀 (사용자 확인, 2026-10-28)
 */
import type { MasteryTrait } from '@/calc/sources/masteryRuneBuff/mastery';

/** 특성 번호 (rNo) → 찍은 레벨. 목록에 없으면 0 */
export type Allocation = Record<string, number>;

/** 앞 단계 조건이 없는 첫 단계 */
const FIRST_STEP = 1;

export type RuleViolationKind = 'unknownTrait' | 'overMaxLevel' | 'userLevel' | 'previousStep' | 'ultimateGate' | 'overBudget';

export interface RuleViolation {
  kind: RuleViolationKind;
  /** 걸린 특성 번호. 예산 초과는 특성 하나의 문제가 아니라 null */
  rNo: string | null;
}

export function levelOf(allocation: Allocation, trait: MasteryTrait): number {
  return allocation[trait.rNo] ?? 0;
}

/** 사용 포인트 = 필요 포인트 × 레벨 합 */
export function usedPoints(traits: MasteryTrait[], allocation: Allocation): number {
  return traits.reduce((sum, trait) => sum + trait.needPoint * levelOf(allocation, trait), 0);
}

/** 앞 단계 (같은 묶음의 일반 특성, 단계 − 1) 에 최대 레벨을 채운 특성이 하나라도 있는가. 첫 단계는 늘 참 */
export function previousStepCleared(traits: MasteryTrait[], trait: MasteryTrait, allocation: Allocation): boolean {
  if (trait.step <= FIRST_STEP) return true;
  return traits.some(
    (other) =>
      !other.ultimate &&
      other.group === trait.group &&
      other.step === trait.step - 1 &&
      levelOf(allocation, other) >= other.maxLevel,
  );
}

const lastStepCache = new WeakMap<MasteryTrait[], Record<string, number>>();

/** 묶음마다 마지막 단계 (일반 특성의 가장 큰 단계, 지금 표는 18) */
function lastStepOf(traits: MasteryTrait[], group: string): number {
  let steps = lastStepCache.get(traits);
  if (!steps) {
    steps = {};
    for (const trait of traits) {
      if (!trait.ultimate) steps[trait.group] = Math.max(steps[trait.group] ?? FIRST_STEP, trait.step);
    }
    lastStepCache.set(traits, steps);
  }
  return steps[group] ?? FIRST_STEP;
}

/** 얼티밋을 찍을 수 있는 조건: 같은 묶음의 마지막 단계 (18단계) 특성 중 하나가 최대 레벨 (5000) 이어야 한다 */
export function ultimateGateCleared(traits: MasteryTrait[], trait: MasteryTrait, allocation: Allocation): boolean {
  const lastStep = lastStepOf(traits, trait.group);
  return traits.some(
    (other) => !other.ultimate && other.group === trait.group && other.step === lastStep && levelOf(allocation, other) >= other.maxLevel,
  );
}

export function isUnlocked(traits: MasteryTrait[], trait: MasteryTrait, allocation: Allocation, userLevel: number): boolean {
  if (userLevel < trait.unlockLevel) return false;
  return trait.ultimate ? ultimateGateCleared(traits, trait, allocation) : previousStepCleared(traits, trait, allocation);
}

/** 배분이 규칙을 어기는 곳 전부. 비어 있으면 올바른 배분. 레벨 0 인 특성은 해금 여부와 상관없다 */
export function validateAllocation(
  traits: MasteryTrait[],
  allocation: Allocation,
  userLevel: number,
  budget: number,
): RuleViolation[] {
  const violations: RuleViolation[] = [];
  const known = new Set(traits.map((trait) => trait.rNo));
  for (const [rNo, level] of Object.entries(allocation)) {
    if (level > 0 && !known.has(rNo)) violations.push({ kind: 'unknownTrait', rNo });
  }
  for (const trait of traits) {
    const level = levelOf(allocation, trait);
    if (level <= 0) continue;
    if (level > trait.maxLevel) violations.push({ kind: 'overMaxLevel', rNo: trait.rNo });
    if (userLevel < trait.unlockLevel) violations.push({ kind: 'userLevel', rNo: trait.rNo });
    if (!trait.ultimate && !previousStepCleared(traits, trait, allocation)) violations.push({ kind: 'previousStep', rNo: trait.rNo });
    if (trait.ultimate && !ultimateGateCleared(traits, trait, allocation)) violations.push({ kind: 'ultimateGate', rNo: trait.rNo });
  }
  if (usedPoints(traits, allocation) > budget) violations.push({ kind: 'overBudget', rNo: null });
  return violations;
}
