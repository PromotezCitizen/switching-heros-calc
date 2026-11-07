/** 두 배분의 차이: 레벨이 바뀐 특성과 포인트 변화 (추천 결과 표용) */
import type { MasteryTrait } from '@/calc/sources/masteryRuneBuff/mastery';
import { levelOf, type Allocation } from '@/masteryOptimizer/rules';

export interface TraitChange {
  trait: MasteryTrait;
  from: number;
  to: number;
  /** 포인트 변화 (넣으면 +, 빼면 −) = (추천 − 지금) × 필요 포인트 */
  points: number;
}

/** 레벨이 다른 특성만. 포인트를 많이 넣는 것부터, 같으면 많이 빼는 것 순 */
export function allocationChanges(traits: MasteryTrait[], from: Allocation, to: Allocation): TraitChange[] {
  return traits
    .map((trait) => {
      const before = levelOf(from, trait);
      const after = levelOf(to, trait);
      return { trait, from: before, to: after, points: (after - before) * trait.needPoint };
    })
    .filter((change) => change.from !== change.to)
    .sort((left, right) => right.points - left.points);
}
