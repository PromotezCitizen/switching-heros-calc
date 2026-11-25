import { describe, expect, it } from 'vitest';
import { skillEquipField, skillLevelField, skillOptionField, skillPerkField, skillRows, skillRuneChoices, skillRuneValue } from '@/calc/sources/skill/skill';
import type { CalcValues } from '@/calc/types';
import { tableRows } from '@/data/statTables';
import { fighterSkillHits, repeatedTicks } from '@/dpm/fighterSkillHits';
import { loadTestTables } from '@/test/loadTestTables';

const tables = loadTestTables();
const TARGETS = 3;
/** 옵션, 문양 칸이 모두 열리는 스킬 레벨 */
const HIGH_LEVEL = '200';

function skillRow(skillId: string) {
  const row = skillRows(tables).find((candidate) => candidate.skillId === skillId);
  if (!row) throw new Error(`스킬 ${skillId} 가 표에 없어요`);
  return { value1: Number(row.value1), value2: Number(row.value2), value3: Number(row.value3), buffDuration: Number(row.buffDuration) };
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

const hitsOf = (skillId: string, setup: Setup = {}, targets = TARGETS, statusCount = 0) => fighterSkillHits(setupValues(skillId, setup), tables, skillId, targets, statusCount);
const chance = (percent: number) => (percent >= 100 ? 1 : 0);
const ticks = (duration: number, first: number, interval: number) => Math.floor((duration - first) / interval) + 1;

describe('반복 판정 수', () => {
  it('floor((지속 − 첫 판정) / 간격) + 1, 간격이 0 이하면 1번', () => {
    expect(repeatedTicks(4, 0.1, 0.4)).toBe(10);
    expect(repeatedTicks(4, 0.1, 0)).toBe(1);
  });
});

describe('격투가 스킬 적중 수 (맞는 적 3마리, catalog-skill-hits.md 4절)', () => {
  it('지면 강타 101: 판정 1번 × 적 수, 옵션 1101 은 확률로 1번 더, 문양 GroundSmash1 은 상태이상인 적에게만', () => {
    expect(hitsOf('101').hits).toBe(TARGETS);
    expect(hitsOf('101', { options: ['1101'] }).hits).toBe(TARGETS * (1 + chance(runeValue('101', '1101'))));
    const factor = 1 + perkValue('101', 'GroundSmash1', 'val1') / 100;
    expect(hitsOf('101', { perks: ['GroundSmash1'] }, TARGETS, 1).coefficientFactor).toBeCloseTo(factor, 10);
    expect(hitsOf('101', { perks: ['GroundSmash1'] }, TARGETS, 0).coefficientFactor).toBe(1);
  });

  it('분노 102: 판정 1번 × 적 수', () => {
    expect(hitsOf('102').hits).toBe(TARGETS);
  });

  it('할퀴기 103: 판정 4번 × 적 수, 옵션 1300 은 확률로 7번, 문양 Claw1 은 계수 val3 %', () => {
    expect(hitsOf('103').hits).toBe(4 * TARGETS);
    expect(hitsOf('103', { options: ['1300'] }).hits).toBe((4 + 3 * chance(runeValue('103', '1300'))) * TARGETS);
    expect(hitsOf('103', { perks: ['Claw1'] }).coefficientFactor).toBeCloseTo(1 + perkValue('103', 'Claw1', 'val3') / 100, 10);
  });

  it('용의 가호 104: 지속 buffDuration 동안 간격 value1 → floor((지속 − 0.02) / 간격) + 1 번 × 적 수, 켜짐 간격은 timing 이 셈', () => {
    const { value1, buffDuration } = skillRow('104');
    const result = hitsOf('104');
    expect(result.hits).toBe(ticks(buffDuration, 0.02, value1) * TARGETS);
    expect(result.estimates ?? []).not.toContain('estimate:activationTimingNotModeled');
    // 옵션 1401: 간격 v % 감소, 옵션 12: 지속 + v 초
    expect(hitsOf('104', { options: ['1401'] }).hits).toBe(ticks(buffDuration, 0.02, value1 / (1 + runeValue('104', '1401') / 100)) * TARGETS);
    expect(hitsOf('104', { options: ['12'] }).hits).toBe(ticks(buffDuration + runeValue('104', '12'), 0.02, value1) * TARGETS);
    // 문양 DragonWheel1: 간격 val1 % 감소 + 계수 val2 %
    const perk = hitsOf('104', { perks: ['DragonWheel1'] });
    expect(perk.hits).toBe(ticks(buffDuration, 0.02, value1 / (1 + perkValue('104', 'DragonWheel1', 'val1') / 100)) * TARGETS);
    expect(perk.coefficientFactor).toBeCloseTo(1 + perkValue('104', 'DragonWheel1', 'val2') / 100, 10);
  });

  it('돌진 펀치 105: 판정 1번 × 적 수, 문양 DashPunch1 은 넣지 못함 표시', () => {
    expect(hitsOf('105').hits).toBe(TARGETS);
    expect(hitsOf('105', { perks: ['DashPunch1'] }).estimates).toContain('estimate:stackPerkNotCounted');
  });

  it('연속 펀치 151: 판정 int(value1) + int(옵션 1600) 번 × 적 수', () => {
    const { value1 } = skillRow('151');
    expect(hitsOf('151').hits).toBe(Math.floor(value1) * TARGETS);
    expect(hitsOf('151', { options: ['1600'] }).hits).toBe((Math.floor(value1) + Math.floor(runeValue('151', '1600'))) * TARGETS);
  });

  it('기공장 152: 첫 판정 0.5초, 간격 value1, 지속 2.5 (+ 옵션 1700)', () => {
    const { value1 } = skillRow('152');
    expect(hitsOf('152').hits).toBe(ticks(2.5, 0.5, value1) * TARGETS);
    expect(hitsOf('152', { options: ['1700'] }).hits).toBe(ticks(2.5 + runeValue('152', '1700'), 0.5, value1) * TARGETS);
    const halfValue = runeValue('152', '1701');
    expect(hitsOf('152', { options: ['1701'] }).hits).toBe(ticks(2.5 * 0.5, 0.5, value1 / (1 + halfValue / 100)) * TARGETS);
    const perk = hitsOf('152', { perks: ['WindSphere1'] });
    expect(perk.hits).toBe(ticks(2.5 * (1 - perkValue('152', 'WindSphere1', 'val1') / 100), 0.5, value1) * TARGETS);
    expect(perk.coefficientFactor).toBeCloseTo(1 + perkValue('152', 'WindSphere1', 'val2') / 100, 10);
    expect(hitsOf('152', { options: ['1703'] }).estimates).toContain('estimate:explodeOptionNotCounted');
  });

  it('어퍼컷 153: 판정 int(value1) 번 × 적 수, 옵션 1800 이면 2번 더', () => {
    const { value1 } = skillRow('153');
    expect(hitsOf('153').hits).toBe(Math.floor(value1) * TARGETS);
    expect(hitsOf('153', { options: ['1800'] }).hits).toBe((Math.floor(value1) + 2) * TARGETS);
  });

  it('원투 펀치 154: 판정 2번, 두 번째는 value1 배 → (1 + value1) × 적 수', () => {
    const { value1 } = skillRow('154');
    expect(hitsOf('154').hits).toBe((1 + value1) * TARGETS);
  });

  it('몸통 박치기 155: 첫 판정 0.1초, 간격 value3, 지속 value1, 옵션 2004 는 지속 절반 + 데미지', () => {
    const { value1, value3 } = skillRow('155');
    expect(hitsOf('155').hits).toBe(ticks(value1, 0.1, value3) * TARGETS);
    expect(hitsOf('155', { options: ['2000'] }).hits).toBe(ticks(value1 * (1 + runeValue('155', '2000') / 100), 0.1, value3) * TARGETS);
    const half = hitsOf('155', { options: ['2004'] });
    expect(half.hits).toBe(ticks(value1 * 0.5, 0.1, value3) * TARGETS);
    expect(half.coefficientFactor).toBeCloseTo(1 + runeValue('155', '2004') / 100, 10);
  });

  it('격투가가 아닌 스킬은 지원하지 않는다 (마법사 301)', () => {
    expect(hitsOf('301').supported).toBe(false);
  });
});
