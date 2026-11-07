import { describe, expect, it } from 'vitest';
import {
  chanceOf,
  expectedCritical,
  expectedSmite,
  expectedSpear,
  expectedSuperCritical,
  superCriticalChance,
  type SuperCriticalStats,
} from '@/dpm/hitMultipliers';

const NO_SUPER: SuperCriticalStats = { base: 0, add: 0, over: 0, damage: 0, supremeChance: 0, supremeDamage: 0, supremeOverToDamage: 0 };

describe('확률', () => {
  it('100 이상이면 늘 성공 (1), 100 미만이면 0 — 비율로 섞지 않는다', () => {
    expect(chanceOf(-5)).toBe(0);
    expect(chanceOf(50)).toBe(0);
    expect(chanceOf(99.99)).toBe(0);
    expect(chanceOf(100)).toBe(1);
    expect(chanceOf(611)).toBe(1);
  });
});

describe('치명타: 확률 100 이상이면 (C/100) × D × Es, 미만이면 1', () => {
  it('확률 50 (100 미만) → 효과 없음 1', () => {
    expect(expectedCritical(50, 300, 2, 1)).toBe(1);
    expect(expectedCritical(99, 300, 2, 10)).toBe(1);
  });
  it('확률 0 → 1, 100 이상 → (C/100) × D × Es', () => {
    expect(expectedCritical(0, 300, 2, 10)).toBe(1);
    expect(expectedCritical(100, 300, 2, 1)).toBeCloseTo(6, 12);
    expect(expectedCritical(611, 300, 2, 10)).toBeCloseTo(60, 12);
  });
});

describe('슈퍼 치명타 (치명 성공 뒤)', () => {
  it('base 0 → 1', () => {
    expect(expectedSuperCritical(NO_SUPER, 611)).toBe(1);
  });
  it('확률 P1 = base + add + floor((V − 100)/10) × over: base 10, add 5, over 2, V 611 → 15 + 51 × 2 = 117', () => {
    expect(superCriticalChance({ ...NO_SUPER, base: 10, add: 5, over: 2 }, 611)).toBe(117);
    expect(superCriticalChance({ ...NO_SUPER, base: 10, add: 5, over: 2 }, 100)).toBe(15);
  });
  it('확률이 100 미만이면 슈퍼 치명타 없음 1: base 50 → 1', () => {
    expect(expectedSuperCritical({ ...NO_SUPER, base: 50, damage: 10 }, 100)).toBe(1);
  });
  it('base 100, dmg 10 → 성공 10 × 1.1^floor(100/10)', () => {
    expect(expectedSuperCritical({ ...NO_SUPER, base: 100, damage: 10 }, 100)).toBeCloseTo(10 * Math.pow(1.1, 10), 10);
  });
  it('dmg 0 이면 성공 배수 10 그대로: base 100 → 10', () => {
    expect(expectedSuperCritical({ ...NO_SUPER, base: 100 }, 100)).toBe(10);
  });
  it('2단계: supreme 100, dmgUp 0 (→ T 1) → 성공 배수 × 10 = 100, supreme 50 (100 미만) → 2단계 없음 10', () => {
    expect(expectedSuperCritical({ ...NO_SUPER, base: 100, supremeChance: 100 }, 100)).toBeCloseTo(100, 10);
    expect(expectedSuperCritical({ ...NO_SUPER, base: 100, supremeChance: 50 }, 100)).toBe(10);
  });
  it('2단계 확률 100 초과분은 T 에 더함: supreme 120, dmgUp 2, overToDmg 10 → T = 2 + 20 × 10 / 100 = 4 → 10 × 10 × 4', () => {
    expect(expectedSuperCritical({ ...NO_SUPER, base: 100, supremeChance: 120, supremeDamage: 2, supremeOverToDamage: 10 }, 100)).toBeCloseTo(400, 10);
  });
});

describe('관통: 확률 100 이상이면 2 × (1 + dmg/100)^floor(P/10), 미만이면 1', () => {
  it('확률 0 → 1, 103.01 (01:54 화면) · dmg 0 → 2', () => {
    expect(expectedSpear(0, 50)).toBe(1);
    expect(expectedSpear(103.01, 0)).toBe(2);
  });
  it('확률 50 (100 미만) → 효과 없음 1, 확률 100, dmg 10 → 2 × 1.1^10', () => {
    expect(expectedSpear(50, 10)).toBe(1);
    expect(expectedSpear(100, 10)).toBeCloseTo(2 * Math.pow(1.1, 10), 10);
  });
});

describe('무자비: 대상 상태이상이 있을 때만', () => {
  it('상태이상 0 → 1 (확률 100 이어도)', () => {
    expect(expectedSmite(100, 50, 10, 0)).toBe(1);
  });
  it('상태이상 1, 확률 100, dmg 50 → 3.5', () => {
    expect(expectedSmite(100, 50, 10, 1)).toBeCloseTo(3.5, 12);
  });
  it('상태이상 2, CC 10 → × 1.1^2', () => {
    expect(expectedSmite(100, 0, 10, 2)).toBeCloseTo(3 * 1.21, 12);
  });
  it('확률 50 (100 미만), 상태이상 1 → 효과 없음 1', () => {
    expect(expectedSmite(50, 0, 0, 1)).toBe(1);
  });
});
