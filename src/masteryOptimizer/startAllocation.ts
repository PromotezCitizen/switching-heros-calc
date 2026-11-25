/**
 * 특성 추천의 출발 배분 (아무것도 없는 상태에서 만든다. 지금 프리셋은 보지 않는다).
 * 1) 뼈대: 묶음 (Stat · Skill · Battle) 마다 단계를 위에서부터 열어 가며, 한 단계에서 효율이 가장 높은 특성 하나를 최대 레벨까지 올린다
 *    (다음 단계가 열리는 조건: 앞 단계에 최대 레벨 특성이 하나 이상 — rules.ts).
 * 2) 얼티밋: 계정 배분에서 얼티밋마다 한 번 잰 값 (켜면 오르는 / 끄면 떨어지는 대미지) 으로 줄 세워, 높은 순으로 포인트 안에서 켠다.
 *    진행 문구에는 늘 포인트 안에 든 배분의 값만 보인다.
 * 이 배분에서 recommend.ts 의 탐색 (포인트 옮기기) 이 이어서 얼티밋을 더 줄이거나 남은 포인트를 배분한다.
 */
import type { MasteryTrait } from '@/calc/sources/masteryRuneBuff/mastery';
import { isUnlocked, levelOf, usedPoints, type Allocation } from '@/masteryOptimizer/rules';
import type { TraitPolicy } from '@/masteryOptimizer/traitPolicy';

export type StartPhase = 'skeleton' | 'ultimates';

export interface StartOptions {
  /** 배분 → 효율 log (클수록 좋음) */
  evaluate: (allocation: Allocation) => number;
  userLevel: number;
  totalPoints: number;
  shouldStop?: () => boolean;
  onProgress?: (progress: {
    phase: StartPhase;
    efficiency: number;
    evaluations: number;
    allocation: Allocation;
  }) => void;
  /** 얼티밋 순서를 정할 때 쓰는 배분 (지금 계정 배분). 없으면 뼈대 배분 */
  rankFrom?: Allocation;
  /** 고정 (그 단계에서 고르지 않고 최대 레벨) · 무시 (다른 특성이 없을 때만 고름) 규칙 */
  policy?: TraitPolicy;
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
  const { evaluate, userLevel, totalPoints, shouldStop, onProgress, policy } = options;
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
    const steps = [
      ...new Set(traits.filter((trait) => !trait.ultimate && trait.group === group).map((trait) => trait.step)),
    ].sort((left, right) => left - right);
    for (const step of steps) {
      if (shouldStop?.()) {
        stopped = true;
        break;
      }
      const inStep = traits.filter((trait) => !trait.ultimate && trait.group === group && trait.step === step);
      if (inStep.some((trait) => levelOf(allocation, trait) >= trait.maxLevel)) continue;
      const free = totalPoints - usedPoints(traits, allocation);
      const open = inStep.filter(
        (trait) => isUnlocked(traits, trait, allocation, userLevel) && trait.maxLevel * trait.needPoint <= free,
      );
      // 고정 특성 · 확률 특성이 있는 단계는 고르지 않고 그 특성들을 최대 레벨로 (같은 단계에 둘 이상이면 예산 안에서 모두)
      const fixedHere = open.filter((trait) => policy?.fixed.has(trait.rNo) || policy?.chanceFirst?.has(trait.rNo));
      if (fixedHere.length > 0) {
        for (const trait of fixedHere) {
          if (usedPoints(traits, allocation) + trait.maxLevel * trait.needPoint <= totalPoints)
            allocation = withLevel(allocation, trait.rNo, trait.maxLevel);
        }
        efficiency = measure(allocation);
        report('skeleton');
        continue;
      }
      // 무시 특성은 그 단계에 다른 특성이 없을 때만 (다음 단계를 열려고) 고른다
      const preferred = open.filter((trait) => !policy?.ignored.has(trait.rNo));
      const candidates = preferred.length > 0 ? preferred : open;
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

  // 2) 얼티밋: 계정 배분 (rankFrom, 없으면 뼈대) 에서 얼티밋마다 한 번 잰 값으로 줄 세우고, 높은 순으로 포인트 안에서 켠다.
  //    값 = 켜져 있으면 껐을 때 떨어지는 대미지, 꺼져 있으면 켰을 때 오르는 대미지 (포인트는 보지 않고 잼)
  if (!stopped) {
    const base = options.rankFrom ?? allocation;
    const baseValue = measure(base);
    const ranked = traits
      .filter((trait) => trait.ultimate && !policy?.ignored.has(trait.rNo) && userLevel >= trait.unlockLevel)
      .map((trait) => {
        const on = levelOf(base, trait) > 0;
        const gain = on
          ? baseValue - measure(withoutTrait(base, trait.rNo))
          : measure(withLevel(base, trait.rNo, trait.maxLevel)) - baseValue;
        return { trait, gain };
      })
      .filter((entry) => entry.gain > 0)
      .sort((left, right) => right.gain - left.gain);
    for (const { trait } of ranked) {
      if (shouldStop?.()) {
        stopped = true;
        break;
      }
      const free = totalPoints - usedPoints(traits, allocation);
      if (trait.maxLevel * trait.needPoint > free || !isUnlocked(traits, trait, allocation, userLevel)) continue;
      allocation = withLevel(allocation, trait.rNo, trait.maxLevel);
      efficiency = measure(allocation);
      report('ultimates');
    }
  }

  return { allocation, efficiency, evaluations, stopped };
}
