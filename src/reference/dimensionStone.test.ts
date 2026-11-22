import { describe, expect, it } from 'vitest';
import alchemySlotTable from '@public/data/tables/AlchemySlot.json';
import type { StatTables } from '@/data/statTables';
import {
  alchemyStone,
  currentSetLevel,
  fillParts,
  fragmentsNeededLog,
  minAlchemyLevelFor,
  setSteps,
  slotCosts,
  stoneGradeFor,
  stonePartLog,
  tableNumberLog,
} from '@/reference/dimensionStone';

const costs = slotCosts({ AlchemySlot: alchemySlotTable } as StatTables);

describe('tableNumberLog', () => {
  it('보통 수, 긴 정수, 지수 표기', () => {
    expect(tableNumberLog('5')).toBeCloseTo(Math.log10(5), 12);
    expect(tableNumberLog('12.5')).toBeCloseTo(Math.log10(12.5), 12);
    expect(tableNumberLog('1569280000000000000000000000000000000000000000000000000000')).toBeCloseTo(Math.log10(1.56928) + 57, 9);
    expect(tableNumberLog('1.276E+1083')).toBeCloseTo(Math.log10(1.276) + 1083, 9);
    expect(tableNumberLog('')).toBe(-Infinity);
  });
});

describe('슬롯 비용 (AlchemySlot)', () => {
  it('레벨 1800 까지, 세트 360 단계 (5, 10 ... 1800)', () => {
    expect(costs.maxLevel).toBe(1800);
    expect(costs.setLevels.length).toBe(360);
    expect(costs.setLevels[0]).toBe(5);
    expect(costs.setLevels[359]).toBe(1800);
  });

  it('레벨 0 → 3 = 1 + 4 + 16, 보유 5 를 빼면 16', () => {
    expect(fragmentsNeededLog(costs, 0, 3, -Infinity)).toBeCloseTo(Math.log10(21), 12);
    expect(fragmentsNeededLog(costs, 0, 3, Math.log10(5))).toBeCloseTo(Math.log10(16), 12);
    expect(fragmentsNeededLog(costs, 0, 3, Math.log10(21))).toBe(-Infinity);
    expect(fragmentsNeededLog(costs, 1799, 1801, -Infinity)).toBeNull();
  });
});

describe('필요한 돌 등급', () => {
  it('한 부위 평균 = 8^(N − 1) / 10 이 필요량 이상인 가장 낮은 등급', () => {
    // 등급 2 = 8 / 10 = 0.8, 등급 3 = 6.4, 등급 4 = 51.2
    expect(stoneGradeFor(Math.log10(0.8))).toBe(2);
    expect(stoneGradeFor(Math.log10(6))).toBe(3);
    expect(stoneGradeFor(Math.log10(7))).toBe(4);
    expect(stoneGradeFor(-Infinity)).toBe(0);
    expect(stoneGradeFor(null)).toBeNull();
    expect(stonePartLog(118)).toBeCloseTo(117 * Math.log10(8) - 1, 12);
  });
});

describe('세트', () => {
  it('가장 낮은 슬롯 레벨이 세트를 정한다', () => {
    expect(currentSetLevel(costs, 4)).toBe(0);
    expect(currentSetLevel(costs, 5)).toBe(1);
    expect(currentSetLevel(costs, 172)).toBe(34);
  });

  it('10부위 레벨 170 (세트 34) → 다음 세트 35 는 모든 부위 175', () => {
    const parts = Array.from({ length: 10 }, () => ({ level: 170, heldLog: -Infinity }));
    const result = setSteps(costs, parts);
    expect(result.setLevel).toBe(34);
    expect(result.steps[0].target).toBe(35);
    expect(result.steps[0].slotLevel).toBe(175);
    expect(result.steps[0].neededLog).toBeCloseTo(fragmentsNeededLog(costs, 170, 175, -Infinity)!, 12);
    expect(result.steps[0].totalNeededLog).toBeCloseTo(result.steps[0].neededLog! + 1, 9);
    // 세트 35 (홀수) = 공격력 +900%, 36 = 체력 +900%
    expect(result.steps[0]).toMatchObject({ stat: '_per_attackDamage', percent: 900 });
    expect(result.steps[1]).toMatchObject({ stat: '_per_hp', percent: 900 });
  });

  it('비운 칸은 넣은 칸 중 가장 낮은 레벨, 보유 0', () => {
    expect(fillParts([null, null])).toBeNull();
    expect(fillParts([{ level: 172, heldLog: 3 }, null, { level: 170, heldLog: -Infinity }])).toEqual([
      { level: 172, heldLog: 3 },
      { level: 170, heldLog: -Infinity },
      { level: 170, heldLog: -Infinity },
    ]);
  });
});

describe('연성에서 나오는 돌', () => {
  it('200 부터 3레벨마다 등급 +1, 확률 0.001 0.002 0.004 반복, 2819 는 0.001', () => {
    expect(alchemyStone(199, false)).toBeNull();
    expect(alchemyStone(200, false)).toEqual({ grade: 1, chancePercent: 0.001, alchemiesPerStone: 100000 });
    expect(alchemyStone(202, false)!.chancePercent).toBe(0.004);
    expect(alchemyStone(203, false)!.grade).toBe(2);
    expect(alchemyStone(2819, false)).toEqual({ grade: 874, chancePercent: 0.001, alchemiesPerStone: 100000 });
    expect(alchemyStone(201, true)!.chancePercent).toBe(0.004);
    expect(minAlchemyLevelFor(1)).toBe(200);
    expect(minAlchemyLevelFor(119)).toBe(554);
    expect(alchemyStone(minAlchemyLevelFor(874), false)!.grade).toBe(874);
  });
});
