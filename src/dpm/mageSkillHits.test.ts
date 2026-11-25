import { describe, expect, it } from 'vitest';
import { skillEquipField, skillLevelField, skillOptionField, skillPerkField, skillRows, skillRuneChoices, skillRuneValue } from '@/calc/sources/skill/skill';
import type { CalcValues } from '@/calc/types';
import { tableRows } from '@/data/statTables';
import { mageSkillHits } from '@/dpm/mageSkillHits';
import { loadTestTables } from '@/test/loadTestTables';

const tables = loadTestTables();
const TARGETS = 3;
/** 옵션, 문양 칸이 모두 열리는 스킬 레벨 */
const HIGH_LEVEL = '200';

function skillRow(skillId: string) {
  const row = skillRows(tables).find((candidate) => candidate.skillId === skillId);
  if (!row) throw new Error(`스킬 ${skillId} 가 표에 없어요`);
  return { value1: Number(row.value1), value2: Number(row.value2), value3: Number(row.value3) };
}

function runeValue(skillId: string, type: string): number {
  const row = skillRuneChoices(tables, skillId).find((candidate) => candidate.type === type);
  if (!row) throw new Error(`스킬 ${skillId} 옵션 ${type} 가 표에 없어요`);
  return skillRuneValue(row);
}

function perkValue(skillId: string, perkType: string, column: 'val1' | 'val2' | 'val3'): number {
  const row = tableRows(tables.SkillPerk).find((candidate) => candidate.skillId === skillId && candidate.perkType === perkType);
  if (!row) throw new Error(`스킬 ${skillId} 문양 ${perkType} 가 표에 없어요`);
  return Number(row[column]);
}

interface Setup {
  options?: string[];
  perks?: string[];
}

function setupValues(skillId: string, { options = [], perks = [] }: Setup): CalcValues {
  const values: CalcValues = { [skillEquipField(1)]: skillId, [skillLevelField(skillId)]: HIGH_LEVEL };
  options.forEach((type, index) => {
    const row = skillRuneChoices(tables, skillId).find((candidate) => candidate.type === type);
    if (!row) throw new Error(`스킬 ${skillId} 옵션 ${type} 가 표에 없어요`);
    values[skillOptionField(skillId, index + 1)] = row.rNo;
  });
  for (const perkType of perks) {
    const row = tableRows(tables.SkillPerk).find((candidate) => candidate.skillId === skillId && candidate.perkType === perkType);
    if (!row) throw new Error(`스킬 ${skillId} 문양 ${perkType} 가 표에 없어요`);
    values[skillPerkField(skillId, row.targetLv)] = perkType;
  }
  return values;
}

const hitsOf = (skillId: string, setup: Setup = {}, targets = TARGETS, statusCount = 0) => mageSkillHits(setupValues(skillId, setup), tables, skillId, targets, statusCount);
const chance = (percent: number) => (percent >= 100 ? 1 : 0);
const ticks = (duration: number, first: number, interval: number) => Math.floor((duration - first) / interval) + 1;

describe('마법사 스킬 적중 수 (맞는 적 3마리, catalog-skill-hits.md 6절)', () => {
  it('화염구 301: 폭발 1번 × 적 수, 옵션 3100 은 확률로 2회, 문양 FireBall1 은 계수 val1 %', () => {
    expect(hitsOf('301').hits).toBe(TARGETS);
    expect(hitsOf('301', { options: ['3100'] }).hits).toBe(TARGETS * (1 + chance(runeValue('301', '3100'))));
    expect(hitsOf('301', { perks: ['FireBall1'] }).coefficientFactor).toBeCloseTo(1 + perkValue('301', 'FireBall1', 'val1') / 100, 10);
  });

  it('서릿발 302: 판정 1번 × 적 수, 문양 FrostStrike1 은 상태이상인 적에게만', () => {
    expect(hitsOf('302').hits).toBe(TARGETS);
    expect(hitsOf('302', { perks: ['FrostStrike1'] }, TARGETS, 2).coefficientFactor).toBeCloseTo(1 + perkValue('302', 'FrostStrike1', 'val1') / 100, 10);
    expect(hitsOf('302', { perks: ['FrostStrike1'] }, TARGETS, 0).coefficientFactor).toBe(1);
  });

  it('낙뢰 303: 판정 1번 × 적 수, 문양 LightningStorm1 은 넣지 못함 표시', () => {
    expect(hitsOf('303').hits).toBe(TARGETS);
    expect(hitsOf('303', { perks: ['LightningStorm1'] }).estimates).toContain('estimate:stackPerkNotCounted');
  });

  it('전류 이동 304: 판정 1번 × 적 수, 옵션 3400 의 번개 사슬은 넣지 못함 표시', () => {
    expect(hitsOf('304').hits).toBe(TARGETS);
    expect(hitsOf('304').estimates).toEqual([]);
    expect(hitsOf('304', { options: ['3400'] }).estimates).toContain('estimate:triggeredSkillNotCounted');
  });

  it('번개 사슬 305: min(적 수, value1), 문양 ChainLightning1 이면 대상 수 절반 + 계수 val1 %', () => {
    const { value1 } = skillRow('305');
    expect(hitsOf('305').hits).toBe(Math.min(TARGETS, value1));
    expect(hitsOf('305', {}, 100).hits).toBe(value1);
    const perk = hitsOf('305', { perks: ['ChainLightning1'] }, 100);
    expect(perk.hits).toBe(Math.floor(value1 / 2));
    expect(perk.coefficientFactor).toBeCloseTo(1 + perkValue('305', 'ChainLightning1', 'val1') / 100, 10);
  });

  it('중력장 351: 폭발 1번 × 적 수, 문양 Gravity1 은 한 번 더', () => {
    expect(hitsOf('351').hits).toBe(TARGETS);
    expect(hitsOf('351', { perks: ['Gravity1'] }).hits).toBe(TARGETS * (1 + chance(perkValue('351', 'Gravity1', 'val1'))));
  });

  it('불기둥 352: 판정 int(value2) 번 × 적 수, 옵션 3700 은 확률로 통째 2회', () => {
    const { value2 } = skillRow('352');
    expect(hitsOf('352').hits).toBe(Math.floor(value2) * TARGETS);
    expect(hitsOf('352', { options: ['3700'] }).hits).toBe((1 + chance(runeValue('352', '3700'))) * Math.floor(value2) * TARGETS);
  });

  it('번개창 353: 첫 판정 0.02초, 간격 value2, 지속 value1 (+ 옵션 3801), 문양 LightningBolt1 은 데미지 val1 배', () => {
    const { value1, value2 } = skillRow('353');
    expect(hitsOf('353').hits).toBe(ticks(value1, 0.02, value2) * TARGETS);
    expect(hitsOf('353', { options: ['3801'] }).hits).toBe(ticks(value1 + runeValue('353', '3801'), 0.02, value2) * TARGETS);
    expect(hitsOf('353', { options: ['3802'] }).hits).toBe(ticks(value1 * 0.5, 0.02, value2 / (1 + runeValue('353', '3802') / 100)) * TARGETS);
    expect(hitsOf('353', { perks: ['LightningBolt1'] }).coefficientFactor).toBe(perkValue('353', 'LightningBolt1', 'val1'));
  });

  it('눈보라 354: 첫 판정 0.02초, 간격 value2, 지속 value1 (+ 옵션 3901), 옵션 3902 는 간격 감소', () => {
    const { value1, value2 } = skillRow('354');
    expect(hitsOf('354').hits).toBe(ticks(value1, 0.02, value2) * TARGETS);
    expect(hitsOf('354', { options: ['3901'] }).hits).toBe(ticks(value1 + runeValue('354', '3901'), 0.02, value2) * TARGETS);
    expect(hitsOf('354', { options: ['3902'] }).hits).toBe(ticks(value1, 0.02, value2 / (1 + runeValue('354', '3902') / 100)) * TARGETS);
    expect(hitsOf('354', { perks: ['Blizzard1'] }).coefficientFactor).toBeCloseTo(1 + perkValue('354', 'Blizzard1', 'val2') / 100, 10);
  });

  it('얼음창 355: 큰 창 적 수 + 작은 창 value1 개 × value2 배 × min(적 수, value3), 옵션 4002 면 큰 창 없이 관통 증가', () => {
    const { value1, value2, value3 } = skillRow('355');
    expect(hitsOf('355').hits).toBeCloseTo(TARGETS + value1 * value2 * Math.min(TARGETS, value3), 10);
    const pierce = value3 + runeValue('355', '4002');
    expect(hitsOf('355', { options: ['4002'] }, 100).hits).toBeCloseTo(value1 * value2 * pierce, 10);
    expect(hitsOf('355', { options: ['4000'] }).hits).toBeCloseTo(
      TARGETS + (value1 + 4 * chance(runeValue('355', '4000'))) * value2 * Math.min(TARGETS, value3),
      10,
    );
  });

  it('마법사가 아닌 스킬은 지원하지 않는다 (격투가 101)', () => {
    expect(hitsOf('101').supported).toBe(false);
  });
});
