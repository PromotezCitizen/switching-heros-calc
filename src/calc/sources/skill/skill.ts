/**
 * 직업 스킬 (서버 표 Skill, 레벨이 있는 BuffSkill · ActiveSkill 40개): 보유 스킬마다 레벨, 1슬롯 히어로 장착 5칸.
 * 장착 5칸 레벨 합 = 유물 연동 "장착 스킬 레벨 합" (사용자 결정 "자동합")
 */
import { CONSTS } from '@/CONSTS';
import type { StatTables, TableRow } from '@/data/statTables';
import type { Line } from '@/calc/combine';
import type { CalcValues } from '@/calc/types';
import { heroFirstRow, slotHeroName } from '@/calc/sources/hero/character';
import { rowsOf } from '@/calc/sources/heroWeaponCardPet/shared';

const { TABLE, EQUIP_SLOTS, FIRST_LEVEL, ACTIVE_SKILL_TYPE, OPTION_BUFFS, ICON_PREFIX, LOWER_CASE_ICON_PREFIX, LOWER_CASE_ICON_IDS } =
  CONSTS.skill;

/** 보유 스킬 레벨 칸 (비었거나 0 = 미보유) */
export function skillLevelField(skillId: string): string {
  return `skillLevel_${skillId}`;
}
/** 장착 칸 (1 ~ EQUIP_SLOTS) 에 고른 스킬 id */
export function skillEquipField(slot: number): string {
  return `skillEquip_${slot}`;
}

export function skillRows(tables: StatTables): TableRow[] {
  return rowsOf(tables, TABLE);
}

/** 입력한 스킬 레벨 (정수, 비었으면 0) */
export function skillLevel(values: CalcValues, skillId: string): number {
  return Math.max(Math.floor(Number(values[skillLevelField(skillId)]) || 0), 0);
}

/** 장착 칸 번호 목록 (1 ~ EQUIP_SLOTS) */
export const SKILL_EQUIP_SLOT_NUMBERS = Array.from({ length: EQUIP_SLOTS }, (_, index) => index + 1);

/** 장착 칸에서 고를 수 있는 스킬: 보유 (레벨 1 이상) 이고 1슬롯 히어로 직업 스킬 (히어로가 없으면 보유 전부) */
export function equipChoices(values: CalcValues, tables: StatTables): TableRow[] {
  const job = heroFirstRow(tables, slotHeroName(values, tables))?.job;
  return skillRows(tables).filter((row) => skillLevel(values, row.skillId) >= FIRST_LEVEL && (!job || row.job === job));
}

/** 장착 5칸에 고른 스킬 id (같은 스킬을 두 칸에 골라도 한 번만) */
function equippedSkillIds(values: CalcValues): Set<string> {
  return new Set(SKILL_EQUIP_SLOT_NUMBERS.map((slot) => values[skillEquipField(slot)]).filter(Boolean));
}

/** 장착 5칸의 스킬 레벨 합 (같은 스킬을 두 칸에 골라도 한 번만, 보유가 아니면 0) */
export function equippedSkillLevelSum(values: CalcValues): number {
  let sum = 0;
  for (const skillId of equippedSkillIds(values)) sum += skillLevel(values, skillId);
  return sum;
}

/** 장착 5칸의 스킬 종류 (Skill 표 skillType: ActiveSkill / BuffSkill) 별 수. 보유 (레벨 1 이상) 스킬만, 같은 스킬은 한 번 */
export function equippedSkillTypeCounts(values: CalcValues, tables: StatTables): Record<string, number> {
  const rows = skillRows(tables);
  const counts: Record<string, number> = {};
  for (const skillId of equippedSkillIds(values)) {
    if (skillLevel(values, skillId) < FIRST_LEVEL) continue;
    const skillType = rows.find((row) => row.skillId === skillId)?.skillType;
    if (skillType) counts[skillType] = (counts[skillType] ?? 0) + 1;
  }
  return counts;
}

/** 스킬 아이콘 경로 (icons/ 아래, 확장자 없음) */
export function skillIconPath(skillId: string): string {
  return ((LOWER_CASE_ICON_IDS as readonly string[]).includes(skillId) ? LOWER_CASE_ICON_PREFIX : ICON_PREFIX) + skillId;
}

/**
 * 스킬 옵션 줄: 능력치를 올리는 옵션 (OPTION_BUFFS) 을 최고 값 × 최대 중첩으로 (다발 화살 25% × 5중첩 = 공격력 % 125, ×2.25).
 * 그 스킬을 보유하고 장착 칸에 꼈을 때만 (스킬을 써야 붙는 효과). 옵션마다 줄 하나
 */
export function skillOptionLines(values: CalcValues, label: (key: string, params?: Record<string, string | number>) => string): Line[] {
  const equipped = equippedSkillIds(values);
  return OPTION_BUFFS.filter((buff) => equipped.has(buff.SKILL_ID) && skillLevel(values, buff.SKILL_ID) >= FIRST_LEVEL).map((buff) => ({
    source: label(buff.MAX_STACKS > 1 ? 'calc.skill.optionSource' : 'calc.skill.optionSourceSingle', {
      skill: label(`calc.skill.optionSkills.${buff.SKILL_ID}`),
      percent: buff.MAX_PERCENT,
      stacks: buff.MAX_STACKS,
    }),
    stat: buff.STAT,
    value: buff.MAX_PERCENT * buff.MAX_STACKS,
  }));
}

/** 장착 5칸에 액티브 스킬이 하나라도 있는가 (장착 스킬이 0개면 없음) */
export function hasEquippedActiveSkill(values: CalcValues, tables: StatTables): boolean {
  return (equippedSkillTypeCounts(values, tables)[ACTIVE_SKILL_TYPE] ?? 0) > 0;
}
