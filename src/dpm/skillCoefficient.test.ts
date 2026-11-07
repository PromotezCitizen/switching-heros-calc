import { describe, expect, it } from 'vitest';
import { skillCoefficient, ssSetMultiplier, type SkillCoefficientInput } from '@/dpm/skillCoefficient';
import { loadTestTables } from '@/test/loadTestTables';

const tables = loadTestTables();
const NORMAL: Omit<SkillCoefficientInput, 'skillId'> = { target: 'normal', targets: 3, heroAttribute: 'Water' };
const coefficient = (values: Record<string, string>, skillId: string, input = NORMAL) =>
  Math.pow(10, skillCoefficient(values, tables, { skillId, ...input }).coefficientLog);

describe('직업 스킬 레벨 식 (damage + damageUp × (레벨 − 1)) / 100', () => {
  it('damage-formula.md 2-1 의 계정 값: 화살비 Lv38 623.9%, 유도 샷 Lv36 817.0%, 멀티샷 Lv36 2006.0%, 레이저 샷 Lv46 555.0%, 다발 화살 Lv29 1290.8%', () => {
    expect(coefficient({ skillLevel_203: '38' }, '203')).toBeCloseTo(6.239, 6);
    expect(coefficient({ skillLevel_202: '36' }, '202')).toBeCloseTo(8.17, 6);
    expect(coefficient({ skillLevel_201: '36' }, '201')).toBeCloseTo(20.06, 6);
    expect(coefficient({ skillLevel_204: '46' }, '204')).toBeCloseTo(5.55, 6);
    expect(coefficient({ skillLevel_252: '29' }, '252')).toBeCloseTo(12.908, 6);
  });
  it('레벨 0 (미보유) 이면 -Infinity', () => {
    expect(skillCoefficient({}, tables, { skillId: '201', ...NORMAL }).coefficientLog).toBe(-Infinity);
  });
});

describe('고른 옵션 (최고 등급 값)', () => {
  const BASE = { skillLevel_201: '43' };
  const base = coefficient(BASE, '201');
  it('스킬 데미지 100% (rNo 240) → ×2', () => {
    expect(coefficient({ ...BASE, skillOption_201_1: '240' }, '201') / base).toBeCloseTo(2, 10);
  });
  it('물 속성 히어로 데미지 (rNo 243) 는 물 히어로일 때만 ×2, 불 속성 (rNo 242) 은 ×1', () => {
    expect(coefficient({ ...BASE, skillOption_201_1: '243' }, '201') / base).toBeCloseTo(2, 10);
    expect(coefficient({ ...BASE, skillOption_201_1: '242' }, '201') / base).toBeCloseTo(1, 10);
  });
  it('일반 몬스터 (rNo 247) 는 스테이지에서만, 보스 (rNo 248) 는 보스에서만 ×2', () => {
    const options = { ...BASE, skillOption_201_1: '247', skillOption_201_2: '248' };
    const baseOf = (target: 'normal' | 'boss' | 'hero') => coefficient(BASE, '201', { ...NORMAL, target, targets: 1 });
    // 옵션 2개 → SS 세트 ×3 도 같이 곱해짐
    expect(coefficient(options, '201', { ...NORMAL, target: 'normal' }) / base).toBeCloseTo(2 * 3, 10);
    expect(coefficient(options, '201', { ...NORMAL, target: 'boss', targets: 1 }) / baseOf('boss')).toBeCloseTo(2 * 3, 10);
    expect(coefficient(options, '201', { ...NORMAL, target: 'hero', targets: 1 }) / baseOf('hero')).toBeCloseTo(3, 10);
  });
});

describe('SS 세트 배수 (3_10_30_100)', () => {
  it('옵션 1개 ×1, 2개 ×3, 3개 ×10, 4개 ×30, 5개 ×100, 6개는 칸이 없어 마지막 값 ×100 (추정)', () => {
    expect([1, 2, 3, 4, 5, 6].map((count) => ssSetMultiplier('3_10_30_100', count, 0))).toEqual([1, 3, 10, 30, 100, 100]);
  });
  it('문양 세트 효과 5000% → ×51', () => {
    expect(ssSetMultiplier('3_10_30_100', 3, 5000)).toBeCloseTo(510, 10);
  });
});

describe('고른 문양', () => {
  it('기습 (스킬 1) Lv80 "레벨 +100" → 레벨 180 으로 계산, "데미지 15000%" → ×151', () => {
    const levelPerk = skillCoefficient({ skillLevel_1: '80', skillPerk_1_80: 'SkillLv' }, tables, { skillId: '1', ...NORMAL });
    expect(levelPerk.level).toBe(180);
    const plain = coefficient({ skillLevel_1: '80' }, '1');
    expect(coefficient({ skillLevel_1: '80', skillPerk_1_80: 'SkillDmg' }, '1') / plain).toBeCloseTo(151, 8);
  });
});
