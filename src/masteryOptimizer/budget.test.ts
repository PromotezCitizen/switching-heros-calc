import { describe, expect, it } from 'vitest';
import { loadTestTables } from '@/test/loadTestTables';
import { totalMasteryPoints, vipMasteryPoints } from '@/masteryOptimizer/budget';

const tables = loadTestTables();

describe('VIP 특성 포인트: VIP 표 mastery_point_up 을 그 레벨 이하 행까지 더한다', () => {
  it('VIP 0 → 0, VIP 1 → 50, VIP 7 → 150, VIP 13 → 150 (다음 혜택은 14)', () => {
    expect(vipMasteryPoints(tables, 0)).toBe(0);
    expect(vipMasteryPoints(tables, 1)).toBe(50);
    expect(vipMasteryPoints(tables, 7)).toBe(150);
    expect(vipMasteryPoints(tables, 13)).toBe(150);
  });
  it('VIP 14 → 300, VIP 18 → 500, VIP 22 → 500', () => {
    expect(vipMasteryPoints(tables, 14)).toBe(300);
    expect(vipMasteryPoints(tables, 18)).toBe(500);
    expect(vipMasteryPoints(tables, 22)).toBe(500);
  });
});

describe('총 특성 포인트 = 유저 레벨 − 1 + VIP 몫 (저장 데이터 MasteryPoint · 화면 P 와 일치)', () => {
  it('2026-10-28 21:29 저장: 레벨 91352, VIP 13 → 91,501 (화면 P 91,501)', () => {
    expect(totalMasteryPoints(tables, 91352, 13)).toBe(91501);
  });
  it('2026-10-28 21:24 저장: 레벨 91273, VIP 13 → 91,422 (저장 MasteryPoint)', () => {
    expect(totalMasteryPoints(tables, 91273, 13)).toBe(91422);
  });
  it('레벨 1 · VIP 0 → 0, 레벨 0 이하는 음수가 되지 않음', () => {
    expect(totalMasteryPoints(tables, 1, 0)).toBe(0);
    expect(totalMasteryPoints(tables, 0, 0)).toBe(0);
  });
});
