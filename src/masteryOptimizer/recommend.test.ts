import { describe, expect, it } from 'vitest';
import type { MasteryTrait } from '@/calc/sources/masteryRuneBuff/mastery';
import { recommendAllocation } from '@/masteryOptimizer/recommend';
import { usedPoints, validateAllocation, type Allocation } from '@/masteryOptimizer/rules';

const USER_LEVEL = 1000;

function trait(rNo: string, step: number, maxLevel: number, needPoint = 1, extra: Partial<MasteryTrait> = {}): MasteryTrait {
  return { rNo, group: 'Stat', ultimate: false, step, unlockLevel: 1, maxLevel, needPoint, statName: `stat${rNo}`, statValue: 1, statUpValue: 1, desc: '', ...extra };
}

/** 효과가 줄어드는 (오목) 가짜 효율: Σ 가중치 × log(1 + 레벨) */
function concave(weights: Record<string, number>) {
  return (allocation: Allocation): number =>
    Object.entries(weights).reduce((sum, [rNo, weight]) => sum + weight * Math.log(1 + (allocation[rNo] ?? 0)), 0);
}

/** 규칙 안의 모든 배분을 훑어 가장 높은 효율 (작은 표 전수 계산) */
function bruteForce(traits: MasteryTrait[], evaluate: (allocation: Allocation) => number, total: number): number {
  let best = -Infinity;
  const walk = (index: number, allocation: Allocation): void => {
    if (index === traits.length) {
      if (validateAllocation(traits, allocation, USER_LEVEL, total).length === 0) best = Math.max(best, evaluate(allocation));
      return;
    }
    for (let level = 0; level <= traits[index].maxLevel; level += 1) walk(index + 1, level > 0 ? { ...allocation, [traits[index].rNo]: level } : allocation);
  };
  walk(0, {});
  return best;
}

describe('추천 배분 탐색', () => {
  const traits = [trait('1', 1, 6), trait('2', 1, 6), trait('3', 1, 6), trait('4', 1, 6)];
  const evaluate = concave({ '1': 5, '2': 3, '3': 2, '4': 0.5 });

  it('작은 표 전수 계산과 같은 답 (필요 포인트 모두 1)', () => {
    const total = 10;
    const result = recommendAllocation(traits, { '4': 6, '3': 4 }, { evaluate, userLevel: USER_LEVEL, totalPoints: total, blockSizes: [4, 2, 1] });
    expect(result.efficiency).toBeCloseTo(bruteForce(traits, evaluate, total), 10);
    expect(result.efficiency).toBeGreaterThan(result.baseEfficiency);
  });

  it('예산과 규칙을 지킨다', () => {
    const result = recommendAllocation(traits, { '4': 6, '3': 4 }, { evaluate, userLevel: USER_LEVEL, totalPoints: 10, blockSizes: [4, 2, 1] });
    expect(usedPoints(traits, result.allocation)).toBeLessThanOrEqual(10);
    expect(validateAllocation(traits, result.allocation, USER_LEVEL, 10)).toEqual([]);
  });

  it('안 쓴 포인트도 쓴다', () => {
    const result = recommendAllocation(traits, { '1': 1 }, { evaluate, userLevel: USER_LEVEL, totalPoints: 6, blockSizes: [2, 1] });
    expect(usedPoints(traits, result.allocation)).toBe(6);
  });

  it('이미 최선이면 그대로 둔다', () => {
    const best = recommendAllocation(traits, {}, { evaluate, userLevel: USER_LEVEL, totalPoints: 10, blockSizes: [4, 2, 1] }).allocation;
    const again = recommendAllocation(traits, best, { evaluate, userLevel: USER_LEVEL, totalPoints: 10, blockSizes: [4, 2, 1] });
    expect(again.allocation).toEqual(best);
    expect(again.efficiency).toBeCloseTo(again.baseEfficiency, 12);
  });

  it('필요 포인트가 다른 특성이 섞여도 지금보다 나빠지지 않고 규칙을 지킨다', () => {
    const mixed = [trait('1', 1, 6, 2), trait('2', 1, 6, 1), trait('3', 1, 6, 3)];
    const mixedEvaluate = concave({ '1': 4, '2': 1, '3': 6 });
    const start = { '2': 6 };
    const result = recommendAllocation(mixed, start, { evaluate: mixedEvaluate, userLevel: USER_LEVEL, totalPoints: 12, blockSizes: [3, 1] });
    expect(result.efficiency).toBeGreaterThanOrEqual(result.baseEfficiency);
    expect(validateAllocation(mixed, result.allocation, USER_LEVEL, 12)).toEqual([]);
  });

  it('앞 단계를 채워야 열리는 특성은 열려 있을 때만 후보가 된다', () => {
    const chain = [trait('1', 1, 2), trait('2', 2, 6)];
    const chainEvaluate = concave({ '1': 0.1, '2': 10 });
    const locked = recommendAllocation(chain, {}, { evaluate: chainEvaluate, userLevel: USER_LEVEL, totalPoints: 8, blockSizes: [2, 1] });
    expect(validateAllocation(chain, locked.allocation, USER_LEVEL, 8)).toEqual([]);
    // 1번이 최대 (2) 면 2번이 열려 있으니 남은 포인트를 2번에 넣는다
    const opened = recommendAllocation(chain, { '1': 2 }, { evaluate: chainEvaluate, userLevel: USER_LEVEL, totalPoints: 8, blockSizes: [2, 1] });
    expect(opened.allocation['2']).toBe(6);
  });

  it('포인트당 손실이 작은 후보가 많아도, 비용을 댈 수 있는 후보 (한 번에 5 확보) 로 교환한다', () => {
    // 작은 특성 6개 (필요 포인트 1, 묶음 4 로는 4 밖에 못 빼서 5 짜리를 살 수 없음) 가 손실이 가장 작아 후보 상위를 채운다
    const cheap = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'].map((rNo) => trait(rNo, 1, 100, 1));
    const swapTraits = [...cheap, trait('c', 1, 1, 5), trait('a', 1, 1, 5)];
    const swapEvaluate = (allocation: Allocation): number =>
      cheap.reduce((sum, item) => sum + 0.001 * Math.log(1 + (allocation[item.rNo] ?? 0)), 0) + 2 * (allocation.c ?? 0) + 3 * (allocation.a ?? 0);
    const start: Allocation = { b1: 4, b2: 4, b3: 4, b4: 4, b5: 4, b6: 4, c: 1 };
    const result = recommendAllocation(swapTraits, start, { evaluate: swapEvaluate, userLevel: USER_LEVEL, totalPoints: 29, blockSizes: [4, 2, 1] });
    expect(result.allocation.a).toBe(1);
    expect(result.allocation.c).toBeUndefined();
    expect(usedPoints(swapTraits, result.allocation)).toBeLessThanOrEqual(29);
    expect(validateAllocation(swapTraits, result.allocation, USER_LEVEL, 29)).toEqual([]);
  });

  it('확률 문턱: 하나씩 올려서는 효율이 안 오르는 같은 묶음의 특성 쌍 (확률을 올리는 특성 + 문턱 효과 특성) 은 동시에 올려 찾는다', () => {
    // a 가 3 레벨 이상이고 b 가 1 레벨 이상일 때만 +5 (확률 100% 미만은 효과 0). 나머지 포인트는 c 가 작게 번다
    const pair = [trait('a', 1, 6, 1, { statName: 'smiteAddPer' }), trait('b', 1, 6, 1, { statName: 'smiteToDmgUp1' }), trait('c', 1, 12, 1)];
    const pairEvaluate = (allocation: Allocation): number =>
      0.01 * Math.log(1 + (allocation.c ?? 0)) + ((allocation.a ?? 0) >= 3 && (allocation.b ?? 0) >= 1 ? 5 : 0);
    const family = (item: MasteryTrait): string | null => (item.statName.startsWith('smite') ? 'smite' : null);
    const options = { evaluate: pairEvaluate, userLevel: USER_LEVEL, totalPoints: 12, blockSizes: [4, 2, 1] };

    // 쌍 이동이 없으면 하나씩 올려서는 안 오르니 못 찾는다
    const without = recommendAllocation(pair, { c: 12 }, options);
    expect(without.efficiency).toBeLessThan(1);

    const result = recommendAllocation(pair, { c: 12 }, { ...options, comboFamily: family });
    expect(result.efficiency).toBeGreaterThan(5);
    // 이어지는 일반 이동이 문턱 위로 남은 포인트를 정리한다 (a 3 레벨 · b 1 레벨 = 4 포인트, 나머지는 c)
    expect(result.allocation.a).toBe(3);
    expect(result.allocation.b).toBe(1);
    expect(usedPoints(pair, result.allocation)).toBeLessThanOrEqual(12);
    expect(validateAllocation(pair, result.allocation, USER_LEVEL, 12)).toEqual([]);
  });

  it('멈추라고 하면 그때까지의 최선을 돌려준다', () => {
    let calls = 0;
    const result = recommendAllocation(traits, { '4': 6 }, { evaluate, userLevel: USER_LEVEL, totalPoints: 10, blockSizes: [4, 2, 1], shouldStop: () => (calls += 1) > 2 });
    expect(result.stopped).toBe(true);
    expect(validateAllocation(traits, result.allocation, USER_LEVEL, 10)).toEqual([]);
  });
});
