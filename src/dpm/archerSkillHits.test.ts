import { describe, expect, it } from 'vitest';
import { archerSkillHits } from '@/dpm/archerSkillHits';
import { loadTestTables } from '@/test/loadTestTables';

const tables = loadTestTables();
const hitsOf = (values: Record<string, string>, skillId: string, targets: number) => archerSkillHits(values, tables, skillId, targets);

describe('멀티샷 201: 화살 6 × 관통 대상 min(적 수, 3)', () => {
  const LEVEL = { skillLevel_201: '43' };
  it('옵션 없음, 적 3 → 18, 적 10 → 18 (관통 3), 적 1 → 6', () => {
    expect(hitsOf(LEVEL, '201', 3)).toEqual({ supported: true, hits: 18, coefficientFactor: 1 });
    expect(hitsOf(LEVEL, '201', 10).hits).toBe(18);
    expect(hitsOf(LEVEL, '201', 1).hits).toBe(6);
  });
  it('2회 발사 100% (rNo 245) → ×2, 화살 2개 추가 100% (rNo 246) → 화살 8', () => {
    expect(hitsOf({ ...LEVEL, skillOption_201_1: '245' }, '201', 3).hits).toBe(36);
    expect(hitsOf({ ...LEVEL, skillOption_201_1: '246' }, '201', 3).hits).toBe(24);
  });
  it('화살 50% 감소 대신 데미지 100% (rNo 249) → 화살 3, 계수 ×2. 관통 안 함 대신 300% (rNo 250) → 대상 1, 계수 ×4', () => {
    expect(hitsOf({ ...LEVEL, skillOption_201_1: '249' }, '201', 3)).toEqual({ supported: true, hits: 9, coefficientFactor: 2 });
    expect(hitsOf({ ...LEVEL, skillOption_201_1: '250' }, '201', 3)).toEqual({ supported: true, hits: 6, coefficientFactor: 4 });
  });
  it('문양 MultiShot1 (Lv90, 4500% × 최대 5중첩) → 계수 ×226', () => {
    expect(hitsOf({ skillLevel_201: '90', skillPerk_201_90: 'MultiShot1' }, '201', 3).coefficientFactor).toBeCloseTo(226, 10);
  });
});

describe('유도 샷 202: 화살 5 × 관통 대상 min(적 수, 3)', () => {
  const LEVEL = { skillLevel_202: '43' };
  it('적 5 → 15. 관통 안 함 대신 500% (rNo 257) → 5, 계수 ×6. 100% 확률 2배 (rNo 258) → 계수 ×2', () => {
    expect(hitsOf(LEVEL, '202', 5).hits).toBe(15);
    expect(hitsOf({ ...LEVEL, skillOption_202_1: '257' }, '202', 5)).toEqual({ supported: true, hits: 5, coefficientFactor: 6 });
    expect(hitsOf({ ...LEVEL, skillOption_202_1: '258' }, '202', 5).coefficientFactor).toBe(2);
  });
});

describe('화살비 203: 5번 × 적 수', () => {
  it('적 4 → 20, 문양 ArrowRain1 (Lv90, 횟수 +3, 데미지 12000%) → 32, 계수 ×121', () => {
    expect(hitsOf({ skillLevel_203: '43' }, '203', 4).hits).toBe(20);
    expect(hitsOf({ skillLevel_203: '90', skillPerk_203_90: 'ArrowRain1' }, '203', 4)).toEqual({ supported: true, hits: 32, coefficientFactor: 121 });
  });
});

describe('레이저 샷 204: (작은 레이저 5 + 큰 레이저 2배) × 적 수', () => {
  it('적 2 → 14, 레이저 5개 추가 100% (rNo 281) → 24', () => {
    expect(hitsOf({ skillLevel_204: '50' }, '204', 2).hits).toBe(14);
    expect(hitsOf({ skillLevel_204: '50', skillOption_204_1: '281' }, '204', 2).hits).toBe(24);
  });
});

describe('다발 화살 252: 화살 6 × 관통 대상 min(적 수, 5)', () => {
  it('적 10 → 30, 화살 5개 추가 (rNo 313) → 55, 관통 안 함 대신 250% (rNo 321) → 6, 계수 ×3.5', () => {
    expect(hitsOf({ skillLevel_252: '37' }, '252', 10).hits).toBe(30);
    expect(hitsOf({ skillLevel_252: '37', skillOption_252_1: '313' }, '252', 10).hits).toBe(55);
    expect(hitsOf({ skillLevel_252: '37', skillOption_252_1: '321' }, '252', 10)).toEqual({ supported: true, hits: 6, coefficientFactor: 3.5 });
  });
  it('문양 SummonShot1 (Lv90, 화살 30% 증가, 데미지 18000%) → 화살 7.8 × 5 = 39, 계수 ×181', () => {
    const hits = hitsOf({ skillLevel_252: '90', skillPerk_252_90: 'SummonShot1' }, '252', 10);
    expect(hits.hits).toBeCloseTo(39, 10);
    expect(hits.coefficientFactor).toBeCloseTo(181, 10);
  });
});

describe('화살 폭격 255: 묶음 value1 × 화살 9발 (문양 FocusShooting1 이면 5발) × min(적 수, 10) (arrow-barrage-255.md)', () => {
  it('문양 없음: 9 × 9 × 적 수, 적이 10 을 넘으면 10', () => {
    const result = hitsOf({ skillLevel_255: '37' }, '255', 3);
    expect(result.supported).toBe(true);
    expect(result.hits).toBe(9 * 9 * 3);
    expect(hitsOf({ skillLevel_255: '37' }, '255', 12).hits).toBe(9 * 9 * 10);
    expect(result.coefficientFactor).toBe(1);
  });
});

describe('다른 스킬', () => {
  it('궁수 5개 밖 (스탭 앤 샷 205, 기습 1) → supported false, 적중 0', () => {
    expect(hitsOf({ skillLevel_205: '37' }, '205', 3)).toEqual({ supported: false, hits: 0, coefficientFactor: 1 });
    expect(hitsOf({ skillLevel_1: '37' }, '1', 3).supported).toBe(false);
  });
});
