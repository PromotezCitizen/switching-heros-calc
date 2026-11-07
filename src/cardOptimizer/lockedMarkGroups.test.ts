import { describe, expect, it } from 'vitest';
import { scanLockedGroups } from '@/cardOptimizer/lockedMarkGroups';
import { cardSetMarkCounts, CARD_EXTRA_MARKS_FIELD } from '@/calc/sources/heroWeaponCardPet/card';
import { loadTestTables } from '@/test/loadTestTables';

describe('안 열린 마크 묶음의 0 · 2 · 4 · 6장 선택', () => {
  // 가짜 효율: 세트 A 는 2개 단계마다 +1, 세트 B 는 4개 단계에서만 +3, 세트 C 는 6개면 +5
  const evaluate = (extra: Record<string, number>) => {
    let value = 0;
    value += Math.floor((extra.A ?? 0) / 2);
    if ((extra.B ?? 0) >= 4) value += 3;
    if ((extra.C ?? 0) >= 6) value += 5;
    return value;
  };

  it('0장 = 기준, 2장 = A 2, 4장 = B 4, 6장 = C 6 (조합 중 가장 높은 것)', () => {
    const [group] = scanLockedGroups([4], () => ['A', 'B', 'C'], evaluate);
    expect(group.mark).toBe(4);
    expect(group.options.map((option) => [option.count, option.efficiency])).toEqual([
      [0, 0],
      [2, 1],
      [4, 3],
      [6, 5],
    ]);
    expect(group.options[2].sets).toEqual([{ setId: 'B', count: 4 }]);
  });

  it('멈추면 그때까지만', () => {
    expect(scanLockedGroups([4, 5], () => ['A'], evaluate, () => true)).toEqual([]);
  });
});

describe('계산 전용 추가 마크 칸', () => {
  it('세트 개수에 그대로 더해진다 (카드 칸 수 제한과 상관없이), 잘못된 글은 무시', () => {
    const tables = loadTestTables();
    expect(cardSetMarkCounts({ [CARD_EXTRA_MARKS_FIELD]: JSON.stringify({ '41': 4 }) }, tables)['41']).toBe(4);
    expect(cardSetMarkCounts({ [CARD_EXTRA_MARKS_FIELD]: 'oops' }, tables)).toEqual({});
  });
});
