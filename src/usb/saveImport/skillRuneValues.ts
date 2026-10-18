/**
 * 저장 데이터 Skill · Dispatch (속성 룬) → 스킬 레벨 · 장착 · 스킬 옵션 · 룬 입력 칸 값.
 * 스킬 옵션은 고른 옵션 번호 (rNo) 만 읽는다. 값은 등급과 상관없이 최고 등급으로 계산한다 (사용자 결정 "최대 옵션 수치")
 */
import { CONSTS } from '@/CONSTS';
import { readDictionary, runSection, type SaveDictionary, type SaveImportResult } from '@/usb/saveImport/saveDictionary';

const { RUNE_CORE_MULTIPLIER, FIRST_SKILL_OPTION_SET } = CONSTS.usb;

export interface SkillSave {
  psSkillDic: SaveDictionary<number, { lv: number }>;
  /** 프리셋 → (히어로 → 장착 스킬 번호 목록) */
  eqPresetSkillDic: SaveDictionary<number, SaveDictionary<number, { skillIds: number[] }>>;
  /** 스킬 → (옵션 세트 번호 → 칸 순서대로 고른 옵션) */
  psSkillOptionDic: SaveDictionary<number, SaveDictionary<number, { diceOptions: { rNo: number }[] }>>;
  /** 프리셋 → (스킬 → 쓰는 옵션 세트 번호). 저장에 없으면 첫 세트 */
  eqSkillOptionDic?: SaveDictionary<number, SaveDictionary<number, number>>;
}

export interface RuneSave {
  attributeData: { coreLv: number; runeLv: number[] };
}

export function skillRuneValues(skill: SkillSave, rune: RuneSave, presetKey: number, slot1HeroId: number): SaveImportResult {
  const values: Record<string, string> = {};
  const notes: string[] = [];

  runSection(notes, '스킬 레벨', () => {
    for (const [skillId, owned] of readDictionary(skill.psSkillDic)) values[`skillLevel_${skillId}`] = String(owned.lv);
  });

  // 장착 스킬: 쓰는 프리셋에서 1슬롯 히어로가 낀 스킬
  runSection(notes, '장착 스킬', () => {
    const presetSkills = readDictionary(skill.eqPresetSkillDic).get(presetKey);
    if (!presetSkills) throw new Error(`사용 중인 스킬 프리셋(${presetKey})을 찾지 못했어요`);
    const equipped = readDictionary(presetSkills).get(slot1HeroId)?.skillIds ?? [];
    equipped.forEach((skillId, index) => {
      if (skillId) values[`skillEquip_${index + 1}`] = String(skillId);
    });
  });

  // 스킬 옵션: 스킬마다 쓰는 프리셋의 옵션 세트 (없으면 첫 세트), 칸 순서대로 옵션 번호
  runSection(notes, '스킬 옵션', () => {
    const presetSetNode = skill.eqSkillOptionDic && readDictionary(skill.eqSkillOptionDic).get(presetKey);
    const presetSets = presetSetNode ? readDictionary(presetSetNode) : new Map<number, number>();
    for (const [skillId, sets] of readDictionary(skill.psSkillOptionDic)) {
      const setDictionary = readDictionary(sets);
      const options = setDictionary.get(presetSets.get(skillId) ?? FIRST_SKILL_OPTION_SET) ?? [...setDictionary.values()][0];
      options?.diceOptions.forEach((option, index) => {
        values[`skillOption_${skillId}_${index + 1}`] = String(option.rNo);
      });
    }
  });

  // 속성 룬: 코어 레벨, 룬 칸 = 코어 × 10 + 룬 레벨
  runSection(notes, '속성 룬', () => {
    values.rune_core = String(rune.attributeData.coreLv);
    rune.attributeData.runeLv.forEach((level, slot) => {
      values[`rune_${slot}`] = String(rune.attributeData.coreLv * RUNE_CORE_MULTIPLIER + level);
    });
  });

  return { values, notes };
}
