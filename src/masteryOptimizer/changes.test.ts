import { describe, expect, it } from 'vitest';
import type { MasteryTrait } from '@/calc/sources/masteryRuneBuff/mastery';
import { allocationChanges } from '@/masteryOptimizer/changes';

function trait(rNo: string, needPoint: number): MasteryTrait {
  return { rNo, group: 'Stat', ultimate: false, step: 1, unlockLevel: 1, maxLevel: 100, needPoint, statName: `stat${rNo}`, statValue: 1, statUpValue: 1, desc: '' };
}

describe('배분 차이', () => {
  const traits = [trait('1', 1), trait('2', 5), trait('3', 2)];

  it('레벨이 바뀐 특성만, 포인트 변화와 함께 넣는 것부터 낸다', () => {
    const changes = allocationChanges(traits, { '1': 10, '2': 4 }, { '1': 30, '2': 1, '3': 2 });
    expect(changes.map((change) => [change.trait.rNo, change.from, change.to, change.points])).toEqual([
      ['1', 10, 30, 20],
      ['3', 0, 2, 4],
      ['2', 4, 1, -15],
    ]);
  });

  it('같은 배분이면 비어 있다', () => {
    expect(allocationChanges(traits, { '1': 3 }, { '1': 3 })).toEqual([]);
  });
});
