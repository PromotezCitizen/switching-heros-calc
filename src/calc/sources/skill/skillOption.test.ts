import { describe, expect, it } from 'vitest';
import '@/i18n';
import { combineLines } from '@/calc/combine';
import { masteryRuneBuffTabs } from '@/calc/sources/masteryRuneBuff';
import {
  chosenSkillOptions,
  chosenSkillPerks,
  skillCoolOptionSeconds,
  skillIconPath,
  skillOptionLines,
  skillOptionSlotCount,
  skillPerkChoices,
  skillPerkCoolSeconds,
  skillPerkLevels,
  skillRuneText,
} from '@/calc/sources/skill/skill';
import { tableRows } from '@/data/statTables';
import { loadTestTables } from '@/test/loadTestTables';

const tables = loadTestTables();
const label = (key: string, params?: Record<string, string | number>) => `${key} ${JSON.stringify(params ?? {})}`;

describe('스킬 옵션 칸 수 (Option 표 skill_rune_slot_condition: 레벨 10마다 1칸, 50 이상 6칸)', () => {
  it('레벨 9 → 0칸, 10 → 1칸, 39 → 3칸, 40 → 4칸, 50 → 6칸', () => {
    expect(skillOptionSlotCount(tables, 9)).toBe(0);
    expect(skillOptionSlotCount(tables, 10)).toBe(1);
    expect(skillOptionSlotCount(tables, 39)).toBe(3);
    expect(skillOptionSlotCount(tables, 40)).toBe(4);
    expect(skillOptionSlotCount(tables, 50)).toBe(6);
  });

  it('열린 칸에 고른 것만 센다: 레벨 29 (2칸) 이면 3번 칸은 빠짐, 그 스킬 후보가 아닌 번호도 빠짐', () => {
    const values = { skillLevel_252: '29', skillOption_252_1: '320', skillOption_252_2: '0', skillOption_252_3: '319' };
    expect(chosenSkillOptions(values, tables, '252').map((row) => row.rNo)).toEqual(['320']);
  });

  it('같은 옵션을 두 칸에 넣어도 한 번만 센다: 멀티샷 쿨타임 2초 옵션 두 칸 → 2초', () => {
    const values = { skillLevel_201: '43', skillOption_201_1: '251', skillOption_201_2: '251' };
    expect(chosenSkillOptions(values, tables, '201').map((row) => row.rNo)).toEqual(['251']);
    expect(skillCoolOptionSeconds(values, tables, '201')).toBe(2);
  });

  it('옵션 글은 최고 등급 값으로: 다발 화살 rNo 320 → "… 5초간 공격력 25% 증가 (최대 5중첩)"', () => {
    const row = chosenSkillOptions({ skillLevel_252: '40', skillOption_252_1: '320' }, tables, '252')[0];
    expect(skillRuneText(row)).toContain('공격력 25% 증가');
  });
});

describe('쿨타임 감소 옵션 (종류 9): 고른 것만, 최고 등급 값', () => {
  it('멀티샷 201 rNo 251 → 2초, 안 골랐으면 0초', () => {
    expect(skillCoolOptionSeconds({ skillLevel_201: '43', skillOption_201_2: '251' }, tables, '201')).toBe(2);
    expect(skillCoolOptionSeconds({ skillLevel_201: '43' }, tables, '201')).toBe(0);
  });
});

describe('스킬 문양 (SkillPerk): 해금 레벨 60 ~ 120 칸마다 후보 2개 중 하나', () => {
  it('검사 · 궁수 · 마법사 스킬 4개: 해금 레벨 7개, 칸마다 후보 2개이고 서로 다른 문양', () => {
    for (const skillId of ['1', '201', '252', '355']) {
      expect(skillPerkLevels(tables, skillId)).toEqual(['60', '70', '80', '90', '100', '110', '120']);
      for (const targetLevel of skillPerkLevels(tables, skillId)) {
        const types = skillPerkChoices(tables, skillId, targetLevel).map((row) => row.perkType);
        expect(new Set(types).size, `${skillId} Lv${targetLevel}`).toBe(2);
      }
    }
  });

  it('스킬 레벨이 해금 레벨에 못 미친 칸은 고른 것이 있어도 안 센다', () => {
    const coolDown = tablesPerk('CoolTimeDown');
    const values = { [`skillLevel_${coolDown.skillId}`]: String(Number(coolDown.targetLv) - 1), [`skillPerk_${coolDown.skillId}_${coolDown.targetLv}`]: 'CoolTimeDown' };
    expect(chosenSkillPerks(values, tables, coolDown.skillId)).toEqual([]);
    expect(skillPerkCoolSeconds(values, tables, coolDown.skillId)).toBe(0);
  });

  it('쿨타임 감소 문양은 val1 초를 빼고, 쿨타임이 늘어나는 문양은 val1 초를 더한다', () => {
    const coolDown = tablesPerk('CoolTimeDown');
    const downValues = { [`skillLevel_${coolDown.skillId}`]: '120', [`skillPerk_${coolDown.skillId}_${coolDown.targetLv}`]: 'CoolTimeDown' };
    expect(skillPerkCoolSeconds(downValues, tables, coolDown.skillId)).toBe(Number(coolDown.val1));
    const coolUp = tablesPerk('CoolTimeUpAndSkillDmg');
    const upValues = { [`skillLevel_${coolUp.skillId}`]: '120', [`skillPerk_${coolUp.skillId}_${coolUp.targetLv}`]: 'CoolTimeUpAndSkillDmg' };
    expect(skillPerkCoolSeconds(upValues, tables, coolUp.skillId)).toBe(-Number(coolUp.val1));
  });
});

/** 문양 표에서 그 종류의 첫 행 */
function tablesPerk(perkType: string) {
  return tableRows(tables.SkillPerk).find((row) => row.perkType === perkType)!;
}

/**
 * 다발 화살 252 옵션 (스킬 옵션 SkillRune 320 "적중할 때마다 5초간 공격력 N% 증가 (최대 5중첩)"): 최고 값 25% x 5중첩 → x2.25,
 * 로그 0.35218 (combat0113.py 116~122 · verify-2026-10-12-0113.md). 옵션을 골랐고 다발 화살을 보유하고 장착 칸에 꼈을 때만
 */
describe('스킬 옵션 능력치 줄: 다발 화살 252', () => {
  const EQUIPPED = { skillLevel_252: '40', skillEquip_5: '252', skillOption_252_1: '320' };

  it('옵션을 안 골랐거나, 안 꼈거나, 보유하지 않았으면 줄 없음', () => {
    expect(skillOptionLines({}, tables, label)).toEqual([]);
    expect(skillOptionLines({ skillLevel_252: '40', skillEquip_5: '252' }, tables, label)).toEqual([]);
    expect(skillOptionLines({ skillLevel_252: '40', skillOption_252_1: '320' }, tables, label)).toEqual([]);
    expect(skillOptionLines({ skillEquip_5: '252', skillOption_252_1: '320' }, tables, label)).toEqual([]);
  });

  it('골랐으면 최고 값 25% 를 최대 5중첩 선형으로 공격력 % 125 → x2.25', () => {
    const lines = skillOptionLines(EQUIPPED, tables, label);
    expect(lines).toHaveLength(1);
    expect(lines[0].stat).toBe('_per_attackDamage');
    expect(lines[0].value).toBe(125);
    expect(Math.pow(10, combineLines(lines)._per_attackDamage.log)).toBeCloseTo(2.25, 12);
    expect(combineLines(lines)._per_attackDamage.log).toBeCloseTo(0.35218, 5);
  });

  it('다른 옵션도 골랐을 때 최고 값 × 최대 중첩: 어퍼컷 10 × 6, 몸통 박치기 15 × 5, 화살 폭격 100, 용의 가호 공격속도 50', () => {
    const owned = { skillLevel_153: '30', skillLevel_155: '30', skillLevel_255: '30', skillLevel_104: '30' };
    const fighterOptions = { skillOption_153_1: '209', skillOption_155_1: '238', skillOption_104_1: '166' };
    const fighter = skillOptionLines({ ...owned, ...fighterOptions, skillEquip_1: '153', skillEquip_2: '155', skillEquip_3: '104' }, tables, label);
    expect(fighter.map((line) => [line.stat, line.value])).toEqual([
      ['_per_attackDamage', 60],
      ['_per_attackDamage', 75],
      ['attackSpeed', 50],
    ]);
    const archer = skillOptionLines({ ...owned, skillOption_255_1: '356', skillEquip_1: '255' }, tables, label);
    expect(archer.map((line) => [line.stat, line.value])).toEqual([['_per_attackDamage', 100]]);
  });

  it('버프 탭 줄에 들어간다 (전투 중 몫이라 특성 표가 없어도)', () => {
    const buffTab = masteryRuneBuffTabs(() => []).find((tab) => tab.id === 'buff')!;
    const withoutMastery = Object.fromEntries(Object.entries(tables).filter(([name]) => name !== 'Mastery'));
    const lines = buffTab.lines(EQUIPPED, withoutMastery);
    expect(lines.map((line) => [line.stat, line.value])).toEqual([['_per_attackDamage', 125]]);
    expect(buffTab.lines({}, withoutMastery)).toEqual([]);
  });
});

describe('스킬 아이콘 경로', () => {
  it('게임 그림 이름이 소문자 icon 인 1 · 101 · 301 만 따로', () => {
    expect(skillIconPath('252')).toBe('Atlas_Skill_Lobby/Skill_Icon_252');
    expect(skillIconPath('201')).toBe('Atlas_Skill_Lobby/Skill_Icon_201');
    expect(skillIconPath('101')).toBe('Atlas_Skill_Lobby/Skill_icon_101');
  });
});
