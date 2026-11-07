import { describe, expect, it } from 'vitest';
import '@/i18n';
import { rosterAwakenField } from '@/calc/sources/hero/rosterFields';
import {
  skillEquipField,
  skillLevelField,
  skillOptionField,
  skillPerkField,
  skillRows,
  skillRuneChoices,
  skillRuneValue,
} from '@/calc/sources/skill/skill';
import type { CalcValues } from '@/calc/types';
import { tableRows } from '@/data/statTables';
import { charSkillHits } from '@/dpm/charSkillDamage';
import { jobSkillHits } from '@/dpm/jobSkillHits';
import { swordsmanSkillHits } from '@/dpm/swordsmanSkillHits';
import { loadTestTables } from '@/test/loadTestTables';

const tables = loadTestTables();
const TARGETS = 3;
/** 옵션 · 문양 칸이 모두 열리는 스킬 레벨 */
const HIGH_LEVEL = '200';

function skillRow(skillId: string) {
  const row = skillRows(tables).find((candidate) => candidate.skillId === skillId);
  if (!row) throw new Error(`스킬 ${skillId} 가 표에 없어요`);
  return { value1: Number(row.value1), value2: Number(row.value2), value3: Number(row.value3) };
}

/** 옵션 종류 (SkillRune type) 의 최고 등급 값 */
function runeValue(skillId: string, type: string): number {
  const row = skillRuneChoices(tables, skillId).find((candidate) => candidate.type === type);
  if (!row) throw new Error(`스킬 ${skillId} 옵션 ${type} 가 표에 없어요`);
  return skillRuneValue(row);
}

interface Setup {
  /** 장착하는 스킬들 (이 순서로 칸 1부터) */
  equip: string[];
  /** 스킬별로 고른 옵션 종류 */
  options?: Record<string, string[]>;
  /** 스킬별로 고른 문양 종류 (perkType) */
  perks?: Record<string, string[]>;
}

function setupValues({ equip, options = {}, perks = {} }: Setup): CalcValues {
  const values: CalcValues = {};
  equip.forEach((skillId, index) => {
    values[skillEquipField(index + 1)] = skillId;
    values[skillLevelField(skillId)] = HIGH_LEVEL;
  });
  for (const [skillId, types] of Object.entries(options)) {
    types.forEach((type, index) => {
      const row = skillRuneChoices(tables, skillId).find((candidate) => candidate.type === type);
      if (!row) throw new Error(`스킬 ${skillId} 옵션 ${type} 가 표에 없어요`);
      values[skillOptionField(skillId, index + 1)] = row.rNo;
    });
  }
  for (const [skillId, perkTypes] of Object.entries(perks)) {
    for (const perkType of perkTypes) {
      const row = tableRows(tables.SkillPerk).find((candidate) => candidate.skillId === skillId && candidate.perkType === perkType);
      if (!row) throw new Error(`스킬 ${skillId} 문양 ${perkType} 가 표에 없어요`);
      values[skillPerkField(skillId, row.targetLv)] = perkType;
    }
  }
  return values;
}

const hitsOf = (skillId: string, setup: Setup, targets = TARGETS) => swordsmanSkillHits(setupValues(setup), tables, skillId, targets);

describe('검사 스킬 적중 수 (옵션 · 문양 없음, 맞는 적 3마리)', () => {
  it('기습 · 십자 베기: 판정 1번 × 적 수', () => {
    expect(hitsOf('1', { equip: ['1'] }).hits).toBe(TARGETS);
    expect(hitsOf('53', { equip: ['53'] }).hits).toBe(TARGETS);
  });

  it('회오리 베기: 회오리 하나가 한 적을 1번만 친다 (한 번만 모드, skill-gaps-2026-11-05.md 4절) → 적 수, 추정 표시 없음', () => {
    const result = hitsOf('2', { equip: ['2'] });
    expect(result.hits).toBe(TARGETS);
    expect(result.estimates ?? []).not.toContain('estimate:tornadoOverlap');
  });

  it('가로 · 세로 베기: 판정 1번 × 적 수, 서로 장착하고 옵션 301 · 401 이 있으면 그 확률만큼 한 번 더', () => {
    expect(hitsOf('3', { equip: ['3'] }).hits).toBe(TARGETS);
    // 확률은 100 이상이면 늘 한 번 더, 100 미만이면 0 (사용자 결정 2026-11-01)
    const chance = runeValue('3', '301') >= 100 ? 1 : 0;
    expect(hitsOf('3', { equip: ['3', '4'], options: { '3': ['301'] } }).hits).toBeCloseTo(TARGETS * (1 + chance), 10);
    // 세로 베기가 장착되어 있지 않으면 옵션이 있어도 늘지 않는다
    expect(hitsOf('3', { equip: ['3'], options: { '3': ['301'] } }).hits).toBe(TARGETS);
    const verticalChance = runeValue('4', '401') >= 100 ? 1 : 0;
    expect(hitsOf('4', { equip: ['3', '4'], options: { '4': ['401'] } }).hits).toBeCloseTo(TARGETS * (1 + verticalChance), 10);
  });

  it('가로 · 세로 베기 문양 TakeDownSlash1: 두 스킬 동시 장착일 때만 계수 배수', () => {
    const together = hitsOf('4', { equip: ['3', '4'], perks: { '4': ['TakeDownSlash1'] } });
    const alone = hitsOf('4', { equip: ['4'], perks: { '4': ['TakeDownSlash1'] } });
    expect(together.coefficientFactor).toBeGreaterThan(1);
    expect(alone.coefficientFactor).toBe(1);
  });

  it('환영검: 개수 value2 × min(적 수, 관통 value3), 옵션 500 이면 관통 1 + 데미지', () => {
    const { value2, value3 } = skillRow('5');
    expect(hitsOf('5', { equip: ['5'] }).hits).toBe(value2 * Math.min(TARGETS, value3));
    expect(hitsOf('5', { equip: ['5'] }, 100).hits).toBe(value2 * value3);
    const noPierce = hitsOf('5', { equip: ['5'], options: { '5': ['500'] } });
    expect(noPierce.hits).toBe(value2 * 1);
    expect(noPierce.coefficientFactor).toBeCloseTo(1 + runeValue('5', '500') / 100, 10);
  });

  it('연속 베기: 판정 value1 번 × 적 수, 옵션 600 은 확률로 4번 더', () => {
    const { value1 } = skillRow('51');
    expect(hitsOf('51', { equip: ['51'] }).hits).toBe(value1 * TARGETS);
    const chance = Math.min(runeValue('51', '600'), 100) / 100;
    expect(hitsOf('51', { equip: ['51'], options: { '51': ['600'] } }).hits).toBeCloseTo((value1 + 4 * chance) * TARGETS, 10);
  });

  it('회전 베기: 지속 value1, 간격 value2 → floor((지속 − 0.02) / 간격) + 1 번 × 적 수', () => {
    const { value1, value2 } = skillRow('52');
    expect(hitsOf('52', { equip: ['52'] }).hits).toBe((Math.floor((value1 - 0.02) / value2) + 1) * TARGETS);
  });

  it('초승달 검기: 개수 value2 × min(적 수, 관통 value3)', () => {
    const { value2, value3 } = skillRow('54');
    expect(hitsOf('54', { equip: ['54'] }).hits).toBe(value2 * Math.min(TARGETS, value3));
  });

  it('필살 난무: 판정 value1 번 × 적 수, 옵션 1000 은 횟수 추가', () => {
    const { value1 } = skillRow('55');
    expect(hitsOf('55', { equip: ['55'] }).hits).toBe(value1 * TARGETS);
    expect(hitsOf('55', { equip: ['55'], options: { '55': ['1000'] } }).hits).toBe((value1 + Math.floor(runeValue('55', '1000'))) * TARGETS);
  });

  it('검사가 아닌 스킬은 지원하지 않는다 (격투가 101)', () => {
    expect(hitsOf('101', { equip: ['101'] }).supported).toBe(false);
  });
});

describe('직업 스킬 분배: 궁수 → 검사', () => {
  it('궁수 스킬 (멀티샷 201) 도 검사 스킬 (기습 1) 도 지원, 격투가 (101) 는 아직', () => {
    const values = setupValues({ equip: ['201', '1', '101'] });
    expect(jobSkillHits(values, tables, '201', TARGETS).supported).toBe(true);
    expect(jobSkillHits(values, tables, '1', TARGETS).supported).toBe(true);
    expect(jobSkillHits(values, tables, '101', TARGETS).supported).toBe(false);
  });
});

describe('린 전용 스킬 12004 (용의 파동)', () => {
  const values: CalcValues = { charName: '린', [rosterAwakenField('0')]: '5' };

  it('파동 value1 개 × 맞는 적 수 (관통 99, hero-skills-swordsman-2026-11-05.md), 추정 표시 없음', () => {
    const result = charSkillHits(values, tables, TARGETS, 0);
    expect(result.supported).toBe(true);
    expect(result.skillId).toBe('12004');
    expect(result.hits).toBe(4 * Math.min(TARGETS, 99));
    expect(result.estimates).toBeUndefined();
  });

  it('계수는 행 damage (5000%) / 100 → log10 = log10(50)', () => {
    expect(charSkillHits(values, tables, TARGETS, 0).coefficientLog).toBeCloseTo(Math.log10(50), 10);
  });
});
