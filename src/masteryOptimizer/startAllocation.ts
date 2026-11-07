/**
 * 특성 추천의 출발 배분 (아무것도 없는 상태에서 만든다. 지금 프리셋은 보지 않는다).
 * 1) 뼈대: 묶음 (Stat · Skill · Battle) 마다 단계를 위에서부터 열어 가며, 한 단계에서 효율이 가장 높은 특성 하나를 최대 레벨까지 올린다
 *    (다음 단계가 열리는 조건: 앞 단계에 최대 레벨 특성이 하나 이상 — rules.ts).
 * 2) 얼티밋을 모두 켠다 (유저 레벨이 되고, 그 묶음의 18단계 특성 하나가 뼈대에서 최대 레벨이 된 것만 — rules.ts).
 * 3) 예산을 넘으면 얼티밋을 하나씩 줄인다: 빼도 효율이 가장 덜 떨어지는 것부터.
 * 이 배분에서 recommend.ts 의 탐색 (포인트 옮기기) 이 이어서 얼티밋을 더 줄이거나 남은 포인트를 배분한다.
 */
import type { MasteryTrait } from '@/calc/sources/masteryRuneBuff/mastery';
import { isUnlocked, levelOf, usedPoints, type Allocation } from '@/masteryOptimizer/rules';

export type StartPhase = 'skeleton' | 'ultimates';

export interface StartOptions {
  /** 배분 → 효율 log (클수록 좋음) */
  evaluate: (allocation: Allocation) => number;
  userLevel: number;
  totalPoints: number;
  shouldStop?: () => boolean;
  onProgress?: (progress: { phase: StartPhase; efficiency: number; evaluations: number; allocation: Allocation }) => void;
}

export interface StartResult {
  allocation: Allocation;
  efficiency: number;
  evaluations: number;
  stopped: boolean;
}

function withLevel(allocation: Allocation, rNo: string, level: number): Allocation {
  return { ...allocation, [rNo]: level };
}

function withoutTrait(allocation: Allocation, rNo: string): Allocation {
  const next = { ...allocation };
  delete next[rNo];
  return next;
}

export function buildStartAllocation(traits: MasteryTrait[], options: StartOptions): StartResult {
  const { evaluate, userLevel, totalPoints, shouldStop, onProgress } = options;
  let evaluations = 0;
  const measure = (allocation: Allocation): number => {
    evaluations += 1;
    return evaluate(allocation);
  };
  let allocation: Allocation = {};
  let efficiency = measure(allocation);
  let stopped = false;
  const report = (phase: StartPhase): void => onProgress?.({ phase, efficiency, evaluations, allocation });

  // 1) 뼈대: 묶음마다 한 단계에서 하나를 최대 레벨로
  const groups = [...new Set(traits.filter((trait) => !trait.ultimate).map((trait) => trait.group))];
  for (const group of groups) {
    const steps = [...new Set(traits.filter((trait) => !trait.ultimate && trait.group === group).map((trait) => trait.step))].sort(
      (left, right) => left - right,
    );
    for (const step of steps) {
      if (shouldStop?.()) {
        stopped = true;
        break;
      }
      const inStep = traits.filter((trait) => !trait.ultimate && trait.group === group && trait.step === step);
      if (inStep.some((trait) => levelOf(allocation, trait) >= trait.maxLevel)) continue;
      const free = totalPoints - usedPoints(traits, allocation);
      const candidates = inStep.filter(
        (trait) => isUnlocked(traits, trait, allocation, userLevel) && trait.maxLevel * trait.needPoint <= free,
      );
      if (candidates.length === 0) break; // 이 묶음은 여기까지 (레벨이 모자라거나 포인트가 모자람)
      let bestTrial: Allocation | null = null;
      let bestValue = -Infinity;
      for (const trait of candidates) {
        const trial = withLevel(allocation, trait.rNo, trait.maxLevel);
        const value = measure(trial);
        if (value > bestValue) {
          bestValue = value;
          bestTrial = trial;
        }
      }
      if (bestTrial) {
        allocation = bestTrial;
        efficiency = bestValue;
      }
      report('skeleton');
    }
    if (stopped) break;
  }

  // 2) 얼티밋을 모두 켠다 (유저 레벨이 되고 그 묶음 18단계 특성 하나가 최대 레벨인 것만)
  if (!stopped) {
    for (const trait of traits) {
      if (trait.ultimate && isUnlocked(traits, trait, allocation, userLevel)) allocation = withLevel(allocation, trait.rNo, trait.maxLevel);
    }
    efficiency = measure(allocation);
    report('ultimates');
  }

  // 3) 예산을 넘으면 얼티밋을 하나씩 줄인다 (빼도 효율이 가장 덜 떨어지는 것부터)
  while (!stopped && usedPoints(traits, allocation) > totalPoints) {
    if (shouldStop?.()) {
      stopped = true;
      break;
    }
    const on = traits.filter((trait) => trait.ultimate && levelOf(allocation, trait) > 0);
    if (on.length === 0) break;
    let bestTrial: Allocation | null = null;
    let bestValue = -Infinity;
    for (const trait of on) {
      const trial = withoutTrait(allocation, trait.rNo);
      const value = measure(trial);
      if (value > bestValue) {
        bestValue = value;
        bestTrial = trial;
      }
    }
    if (!bestTrial) break;
    allocation = bestTrial;
    efficiency = bestValue;
    report('ultimates');
  }

  return { allocation, efficiency, evaluations, stopped };
}
