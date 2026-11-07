import { describe, expect, it } from 'vitest';
import { CONSTS } from '@/CONSTS';
import { skillRuneValues, type RuneSave, type SkillSave } from '@/usb/saveImport/skillRuneValues';

const { SKILL_PERK_TYPES, SKILL_PERK_TARGET_LEVELS } = CONSTS.usb;
const RUNE: RuneSave = { attributeData: { coreLv: 1, runeLv: [] } };
const PRESET = 2;
const SLOT1_HERO = 205;
const SLOT2_HERO = 0;
const LASER_SHOT = 204;

/** 저장 사전: { k: 키 목록, v: 값 목록 } */
function dictionary<T>(entries: [number, T][]): { k: number[]; v: T[] } {
  return { k: entries.map(([key]) => key), v: entries.map(([, value]) => value) };
}

/** 문양만 채운 최소 저장 (스킬 번호 → 문양 세트 번호 → typeSlots) */
function skillSave(perkSets: [number, [number, number[]][]][], presetPerks: [number, number][]): SkillSave {
  return {
    psSkillDic: dictionary([]),
    eqPresetSkillDic: dictionary([[PRESET, dictionary([[SLOT1_HERO, { skillIds: [LASER_SHOT] }], [SLOT2_HERO, { skillIds: [5] }]])]]),
    psSkillOptionDic: dictionary([]),
    equipPerkOptionDic: dictionary(perkSets.map(([skillId, sets]) => [skillId, dictionary(sets.map(([setId, typeSlots]) => [setId, { typeSlots }] as [number, { typeSlots: number[] }]))])),
    presetPerkOptionDic: dictionary([[PRESET, dictionary(presetPerks)]]),
  };
}

describe('스킬 문양 번호 표', () => {
  it('번호는 1 ~ 58 이고 같은 이름이 두 번 없다', () => {
    expect(SKILL_PERK_TYPES).toHaveLength(58);
    expect(new Set(SKILL_PERK_TYPES).size).toBe(SKILL_PERK_TYPES.length);
  });

  it('저장 값과 화면으로 확인한 번호: 1 = 발동 확률을 낮추는 문양, 5 = 전용/교체 스킬 데미지 문양', () => {
    expect(SKILL_PERK_TYPES[1 - 1]).toBe('BuffPerDownAndSkillDmg');
    expect(SKILL_PERK_TYPES[5 - 1]).toBe('ChangeCharSkillDmg');
  });
});

describe('스킬 문양 가져오기 (skillRuneValues)', () => {
  it('쓰는 프리셋의 문양 세트에서 해금 레벨 칸마다 문양 이름을 채우고, 안 고른 칸은 비운다', () => {
    const result = skillRuneValues(skillSave([[LASER_SHOT, [[0, [5, 0, 0, 0, 0, 0, 0]]]]], [[LASER_SHOT, 0]]), RUNE, PRESET, SLOT1_HERO, SLOT2_HERO);
    expect(result.values[`skillPerk_${LASER_SHOT}_60`]).toBe('ChangeCharSkillDmg');
    for (const level of SKILL_PERK_TARGET_LEVELS.slice(1)) expect(result.values[`skillPerk_${LASER_SHOT}_${level}`]).toBe('');
    expect(result.notes.filter((note) => note.includes('문양'))).toEqual([]);
  });

  it('번호 1 은 발동 확률을 낮추는 문양으로 읽는다 (사용자가 장착을 바꿨을 때 저장 값)', () => {
    const before = skillRuneValues(skillSave([[LASER_SHOT, [[0, [1, 0, 0, 0, 0, 0, 0]]]]], [[LASER_SHOT, 0]]), RUNE, PRESET, SLOT1_HERO, SLOT2_HERO);
    expect(before.values[`skillPerk_${LASER_SHOT}_60`]).toBe('BuffPerDownAndSkillDmg');
  });

  it('1슬롯 · 2슬롯 히어로의 스킬 문양을 모두 읽는다 (문양은 스킬 번호별 저장)', () => {
    const save = skillSave(
      [
        [LASER_SHOT, [[0, [5, 0, 0, 0, 0, 0, 0]]]],
        [5, [[0, [0, 6, 0, 0, 0, 0, 0]]]],
      ],
      [
        [LASER_SHOT, 0],
        [5, 0],
      ],
    );
    const result = skillRuneValues(save, RUNE, PRESET, SLOT1_HERO, SLOT2_HERO);
    expect(result.values[`skillPerk_${LASER_SHOT}_60`]).toBe('ChangeCharSkillDmg');
    expect(result.values['skillPerk_5_70']).toBe('SetValue');
  });

  it('프리셋이 문양 세트를 고르지 않은 스킬은 7칸 모두 비운다', () => {
    const result = skillRuneValues(skillSave([[LASER_SHOT, [[0, [5, 0, 0, 0, 0, 0, 0]]]]], []), RUNE, PRESET, SLOT1_HERO, SLOT2_HERO);
    for (const level of SKILL_PERK_TARGET_LEVELS) expect(result.values[`skillPerk_${LASER_SHOT}_${level}`]).toBe('');
  });

  it('표에 없는 번호는 칸을 비우고 알려 준다', () => {
    const result = skillRuneValues(skillSave([[LASER_SHOT, [[0, [99, 0, 0, 0, 0, 0, 0]]]]], [[LASER_SHOT, 0]]), RUNE, PRESET, SLOT1_HERO, SLOT2_HERO);
    expect(result.values[`skillPerk_${LASER_SHOT}_60`]).toBe('');
    expect(result.notes.some((note) => note.includes('번호 99'))).toBe(true);
  });

  it('문양을 한 번도 안 쓴 저장 (사전 없음) 은 문양 칸을 만들지 않는다', () => {
    const withoutPerks = skillSave([], []);
    delete withoutPerks.equipPerkOptionDic;
    delete withoutPerks.presetPerkOptionDic;
    const result = skillRuneValues(withoutPerks, RUNE, PRESET, SLOT1_HERO, SLOT2_HERO);
    expect(Object.keys(result.values).filter((key) => key.startsWith('skillPerk_'))).toEqual([]);
  });
});
