import { describe, expect, it } from 'vitest';
import type { MasteryTrait } from '@/calc/sources/masteryRuneBuff/mastery';
import { buildStartAllocation } from '@/masteryOptimizer/startAllocation';
import { usedPoints, validateAllocation, type Allocation } from '@/masteryOptimizer/rules';

const USER_LEVEL = 1000;

function trait(
  rNo: string,
  group: string,
  step: number,
  maxLevel: number,
  needPoint = 1,
  extra: Partial<MasteryTrait> = {},
): MasteryTrait {
  return {
    rNo,
    group,
    ultimate: false,
    step,
    unlockLevel: 1,
    maxLevel,
    needPoint,
    statName: `stat${rNo}`,
    statValue: 1,
    statUpValue: 1,
    desc: '',
    ...extra,
  };
}
function ultimate(rNo: string, needPoint = 5): MasteryTrait {
  return trait(rNo, 'Stat', 1, 1, needPoint, { ultimate: true });
}

/** 가짜 효율: 특성마다 가중치 × 레벨 */
function weighted(weights: Record<string, number>) {
  return (allocation: Allocation): number =>
    Object.entries(weights).reduce((sum, [rNo, weight]) => sum + weight * (allocation[rNo] ?? 0), 0);
}

describe('특성 추천 출발 배분 (빈 상태에서 뼈대 + 얼티밋)', () => {
  // 묶음 Stat: 단계 1 = a (효율 낮음) · b (효율 높음), 단계 2 = c · d. 묶음 Skill: 단계 1 = e
  const traits = [
    trait('a', 'Stat', 1, 4),
    trait('b', 'Stat', 1, 4),
    trait('c', 'Stat', 2, 4),
    trait('d', 'Stat', 2, 4),
    trait('e', 'Skill', 1, 4),
  ];
  const evaluate = weighted({ a: 1, b: 3, c: 1, d: 2, e: 1 });

  it('단계마다 효율이 가장 높은 특성 하나를 최대로 올려 다음 단계를 연다', () => {
    const result = buildStartAllocation(traits, { evaluate, userLevel: USER_LEVEL, totalPoints: 100 });
    expect(result.allocation).toEqual({ b: 4, d: 4, e: 4 });
    expect(validateAllocation(traits, result.allocation, USER_LEVEL, 100)).toEqual([]);
  });

  it('얼티밋은 모두 켜고, 예산을 넘으면 빼도 효율이 가장 덜 떨어지는 것부터 하나씩 줄인다', () => {
    const withUltimates = [...traits, ultimate('u1', 5), ultimate('u2', 5), ultimate('u3', 5)];
    // 뼈대 = 12 포인트. 예산 25 → 얼티밋은 2개만 남는다 (효율이 가장 낮은 u1 이 빠짐)
    const result = buildStartAllocation(withUltimates, {
      evaluate: weighted({ b: 3, d: 2, e: 1, u1: 1, u2: 5, u3: 9 }),
      userLevel: USER_LEVEL,
      totalPoints: 25,
    });
    expect(result.allocation.u1).toBeUndefined();
    expect(result.allocation.u2).toBe(1);
    expect(result.allocation.u3).toBe(1);
    expect(usedPoints(withUltimates, result.allocation)).toBeLessThanOrEqual(25);
  });

  it('예산이 충분하면 값이 있는 얼티밋은 모두 켜고, 값이 없는 얼티밋은 켜지 않는다', () => {
    const withUltimates = [...traits, ultimate('u1', 5), ultimate('u2', 5)];
    const result = buildStartAllocation(withUltimates, {
      evaluate: weighted({ b: 3, d: 2, e: 1, u1: 2 }),
      userLevel: USER_LEVEL,
      totalPoints: 100,
    });
    expect(result.allocation.u1).toBe(1);
    expect(result.allocation.u2).toBeUndefined();
  });

  it('얼티밋은 계정 배분 (rankFrom) 에서 잰 값 순서로 켠다', () => {
    const withUltimates = [...traits, ultimate('u1', 5), ultimate('u2', 5)];
    // 뼈대 12 + 얼티밋 하나 5 = 17: 하나만 켤 수 있다. 계정 배분에서는 u1 이 더 크다고 잰다
    const evaluateWith = (allocation: Allocation) => weighted({ b: 3, d: 2, e: 1, u1: 4, u2: 3 })(allocation);
    const result = buildStartAllocation(withUltimates, {
      evaluate: evaluateWith,
      userLevel: USER_LEVEL,
      totalPoints: 17,
      rankFrom: { u1: 1, u2: 1 },
    });
    expect(result.allocation.u1).toBe(1);
    expect(result.allocation.u2).toBeUndefined();
  });

  it('유저 레벨이 모자란 단계는 열지 않는다', () => {
    const locked = [trait('a', 'Stat', 1, 4), trait('c', 'Stat', 2, 4, 1, { unlockLevel: 5000 })];
    const result = buildStartAllocation(locked, {
      evaluate: weighted({ a: 1, c: 9 }),
      userLevel: USER_LEVEL,
      totalPoints: 100,
    });
    expect(result.allocation).toEqual({ a: 4 });
  });

  it('멈추라고 하면 그때까지의 배분을 돌려준다', () => {
    const result = buildStartAllocation(traits, {
      evaluate,
      userLevel: USER_LEVEL,
      totalPoints: 100,
      shouldStop: () => true,
    });
    expect(result.stopped).toBe(true);
  });
});

describe('고정 · 무시 규칙 (policy)', () => {
  const traits = [
    trait('a', 'Stat', 1, 4),
    trait('b', 'Stat', 1, 4),
    trait('c', 'Stat', 2, 4),
    trait('d', 'Stat', 2, 4),
  ];

  it('고정 특성이 있는 단계는 효율과 상관없이 그 특성을 최대로, 무시 특성은 다른 특성이 있으면 고르지 않는다', () => {
    const policy = { fixed: new Set(['a']), ignored: new Set(['d']) };
    const result = buildStartAllocation(traits, {
      evaluate: weighted({ a: 1, b: 9, c: 1, d: 9 }),
      userLevel: USER_LEVEL,
      totalPoints: 100,
      policy,
    });
    expect(result.allocation).toEqual({ a: 4, c: 4 });
  });

  it('단계에 무시 특성만 있으면 다음 단계를 열려고 그것을 고른다', () => {
    const only = [trait('a', 'Stat', 1, 4), trait('c', 'Stat', 2, 4)];
    const policy = { fixed: new Set<string>(), ignored: new Set(['a']) };
    const result = buildStartAllocation(only, {
      evaluate: weighted({ a: 0, c: 5 }),
      userLevel: USER_LEVEL,
      totalPoints: 100,
      policy,
    });
    expect(result.allocation).toEqual({ a: 4, c: 4 });
  });
});

describe('확률 특성 먼저 (policy.chanceFirst)', () => {
  it('확률 특성이 있는 단계는 효율과 상관없이 그 특성을 최대로', () => {
    const traits = [trait('a', 'Stat', 1, 4), trait('b', 'Stat', 1, 4)];
    const policy = { fixed: new Set<string>(), ignored: new Set<string>(), chanceFirst: new Set(['a']) };
    const result = buildStartAllocation(traits, {
      evaluate: weighted({ a: 0, b: 9 }),
      userLevel: USER_LEVEL,
      totalPoints: 100,
      policy,
    });
    expect(result.allocation).toEqual({ a: 4 });
  });
});
