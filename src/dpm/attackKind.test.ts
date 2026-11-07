import { describe, expect, it } from 'vitest';
import '@/i18n';
import savedValues from '@/calc/sources/summary/testValues0154.json';
import type { CalcValues } from '@/calc/types';
import { combineLines, type Line } from '@/calc/combine';
import { summaryRows } from '@/calc/sources/summary/summary';
import { kindModifiers } from '@/dpm/attackKind';
import { attackStats, statReader, type AttackStats } from '@/dpm/attackStats';
import { loadTestTables } from '@/test/loadTestTables';

const VALUES = { ...savedValues.values, skillOption_252_1: '320', skillOption_252_2: '319' } as CalcValues;
const ARCHER_WATER = { job: 'Archer', attribute: 'Water' };

/** 줄 몇 개로 만든 가짜 AttackStats (궁수 · 물 속성 히어로) */
function statsOf(lines: Line[]): AttackStats {
  return { target: 'normal', lines, read: statReader(combineLines(lines)), hero: ARCHER_WATER, targetFinalAttackLog: 0 };
}

describe('공격 종류별 추가 곱 · 치명 C · D', () => {
  it('평타는 추가 곱 없음, 치명 배수 = 종합 탭 치명타 데미지 줄 (C × D / 100) 과 같은 값 (01:54)', () => {
    const tables = loadTestTables();
    const stats = attackStats(VALUES, tables, 'normal');
    const normal = kindModifiers(stats, 'normal');
    const summary = Object.fromEntries(summaryRows(stats.lines, VALUES, tables).map((row) => [row.id, row.log]));
    expect(normal.extraAttackLog).toBe(0);
    expect(normal.criticalMultiplierLog).toBeCloseTo(summary.criticalDamage!, 9);
    expect(normal.criticalRate).toBeCloseTo(Math.pow(10, summary.criticalRate!), 6);
  });

  it('버프 스킬: 모든 스킬 · 버프·액티브 · 버프 스킬 % 와 직업 SkillDamage · 속성 AllSkill/JobSkillDamage 를 곱한다', () => {
    const stats = statsOf([
      { source: 'a', stat: '_per_allSkillDamage', value: 100 },
      { source: 'b', stat: '_per_buffAndActiveDmg', value: 100 },
      { source: 'c', stat: '_per_BuffSkillDamage', value: 100 },
      { source: 'd', stat: '_per_ActiveSkillDamage', value: 100 },
      { source: 'e', stat: '_per_CharSkillDamage', value: 100 },
      { source: 'f', stat: '_per_Archer_SkillDamage', value: 100 },
      { source: 'g', stat: '_per_WaterHero_JobSkillDamage', value: 100 },
      { source: 'h', stat: '_per_FireHero_JobSkillDamage', value: 100 },
    ]);
    // ×2 다섯 번 (all · buffAndActive · BuffSkill · Archer_Skill · WaterHero_JobSkill). 액티브 · 전용 · 다른 속성은 안 곱함
    expect(kindModifiers(stats, 'buff').extraAttackLog).toBeCloseTo(5 * Math.log10(2), 12);
    expect(kindModifiers(stats, 'active').extraAttackLog).toBeCloseTo(5 * Math.log10(2), 12);
    // 전용: all · CharSkill · 직업 Archer_SkillDamage 세 번 (직업 스킬 데미지는 전용 스킬에도, battle-missing-effects-2026-11-01.md)
    expect(kindModifiers(stats, 'char').extraAttackLog).toBeCloseTo(3 * Math.log10(2), 12);
    expect(kindModifiers(stats, 'normal').extraAttackLog).toBe(0);
  });

  it('치명 C 는 종류별 합을 더하고, D 는 종류별 곱을 곱한다', () => {
    const stats = statsOf([
      { source: 'a', stat: 'criticalDmg', value: 200 },
      { source: 'b', stat: 'criticalDmg_BuffAndActiveSkill', value: 100 },
      { source: 'c', stat: 'criticalDmg_CharSkill', value: 300 },
      { source: 'd', stat: '_per_BuffSkillCriDmg', value: 100 },
    ]);
    // 평타 (200 / 100) = 2, 버프 (300 / 100) × 2 = 6, 액티브 3, 전용 5
    expect(Math.pow(10, kindModifiers(stats, 'normal').criticalMultiplierLog)).toBeCloseTo(2, 12);
    expect(Math.pow(10, kindModifiers(stats, 'buff').criticalMultiplierLog)).toBeCloseTo(6, 12);
    expect(Math.pow(10, kindModifiers(stats, 'active').criticalMultiplierLog)).toBeCloseTo(3, 12);
    expect(Math.pow(10, kindModifiers(stats, 'char').criticalMultiplierLog)).toBeCloseTo(5, 12);
  });

  it('치명 데미지 합이 0 이면 배수 log 는 -Infinity', () => {
    expect(kindModifiers(statsOf([]), 'normal').criticalMultiplierLog).toBe(-Infinity);
  });
});
