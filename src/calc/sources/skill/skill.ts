/**
 * 직업 스킬 (서버 표 Skill, 레벨이 있는 BuffSkill · ActiveSkill 40개): 보유 스킬마다 레벨, 1슬롯 히어로 장착 5칸.
 * 장착 5칸 레벨 합 = 유물 연동 "장착 스킬 레벨 합"
 */
import { CONSTS } from '@/CONSTS';
import type { StatTables, TableRow } from '@/data/statTables';
import type { Line } from '@/calc/combine';
import type { CalcValues } from '@/calc/types';
import { heroFirstRow, slotHeroName } from '@/calc/sources/hero/character';
import { rowsOf } from '@/calc/sources/heroWeaponCardPet/shared';

const {
  TABLE,
  EQUIP_SLOTS,
  FIRST_LEVEL,
  ACTIVE_SKILL_TYPE,
  OPTION_BUFFS,
  ICON_PREFIX,
  LOWER_CASE_ICON_PREFIX,
  LOWER_CASE_ICON_IDS,
  RUNE_TABLE,
  RUNE_VALUE_COLUMN,
  RUNE_VALUE_PLACEHOLDER,
  SLOT_CONDITION_TABLE,
  SLOT_CONDITION_KEY_PREFIX,
  SLOT_CONDITION_LEVEL_COLUMN,
  SLOT_CONDITION_COUNT_COLUMN,
  COOL_OPTION_TYPE,
  PERK_TABLE,
  PERK_LEVEL_COLUMN,
  PERK_COOL_DOWN_TYPE,
  PERK_COOL_UP_TYPE,
  PERK_COOL_VALUE_COLUMN,
} = CONSTS.skill;

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
  return equipChoicesForJob(values, tables, heroFirstRow(tables, slotHeroName(values, tables))?.job);
}

/** 장착 후보: 보유 (레벨 1 이상) 스킬 중 그 직업 것 (직업을 모르면 전부) */
export function equipChoicesForJob(values: CalcValues, tables: StatTables, job: string | undefined): TableRow[] {
  return skillRows(tables).filter((row) => skillLevel(values, row.skillId) >= FIRST_LEVEL && (!job || row.job === job));
}

/**
 * 2슬롯 히어로 장착 칸 (교체 계산에서 2슬롯 히어로 차례에 쓴다, dpm/swapDamage.ts). 폰 불러오기도 같은 칸을 채운다.
 */
export function secondSkillEquipField(slot: number): string {
  return `${CONSTS.dpm.SWAP.SECOND_SKILL_EQUIP_PREFIX}${slot}`;
}

/** 장착 5칸에 고른 스킬 id (같은 스킬을 두 칸에 골라도 한 번만) */
function equippedSkillIds(values: CalcValues): Set<string> {
  return new Set(SKILL_EQUIP_SLOT_NUMBERS.map((slot) => values[skillEquipField(slot)]).filter(Boolean));
}

/** 장착 5칸의 스킬 레벨 합 (같은 스킬을 두 칸에 골라도 한 번만, 보유가 아니면 0) */
export function equippedSkillLevelSum(values: CalcValues, field: (slot: number) => string = skillEquipField): number {
  let sum = 0;
  const ids = new Set(SKILL_EQUIP_SLOT_NUMBERS.map((slot) => values[field(slot)]).filter(Boolean));
  for (const skillId of ids) sum += skillLevel(values, skillId);
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

/** 스킬 옵션 칸 (스킬마다 1 ~ 열린 칸 수) 에 고른 옵션의 rNo (비었으면 고르지 않음) */
export function skillOptionField(skillId: string, slot: number): string {
  return `skillOption_${skillId}_${slot}`;
}

/** 스킬 옵션 후보 (SkillRune 표, 그 스킬 12행) */
export function skillRuneChoices(tables: StatTables, skillId: string): TableRow[] {
  return rowsOf(tables, RUNE_TABLE).filter((row) => row.skillId === skillId);
}

/** 옵션 값 = 최고 등급 (SS) 값 */
export function skillRuneValue(row: TableRow): number {
  return Number(row[RUNE_VALUE_COLUMN]) || 0;
}

/** 옵션 문구에 최고 등급 값을 넣은 글 (예: "스킬 데미지 100% 증가") */
export function skillRuneText(row: TableRow): string {
  return (row.desc ?? '').replace(RUNE_VALUE_PLACEHOLDER, row[RUNE_VALUE_COLUMN] ?? '');
}

/** 스킬 레벨로 열리는 옵션 칸 수 (Option 표 skill_rune_slot_condition_<n>: 레벨 조건 이상인 행의 칸 수 중 최댓값, 표가 없으면 0) */
export function skillOptionSlotCount(tables: StatTables, level: number): number {
  return rowsOf(tables, SLOT_CONDITION_TABLE)
    .filter((row) => row.key?.startsWith(SLOT_CONDITION_KEY_PREFIX) && level >= Number(row[SLOT_CONDITION_LEVEL_COLUMN]))
    .reduce((count, row) => Math.max(count, Number(row[SLOT_CONDITION_COUNT_COLUMN]) || 0), 0);
}

/** 열린 칸에 고른 옵션 (그 스킬의 후보에 있는 것만, 칸 순서). 같은 옵션은 한 스킬에 하나만 */
export function chosenSkillOptions(values: CalcValues, tables: StatTables, skillId: string): TableRow[] {
  const choices = skillRuneChoices(tables, skillId);
  const slotCount = skillOptionSlotCount(tables, skillLevel(values, skillId));
  const chosen: TableRow[] = [];
  for (let slot = 1; slot <= slotCount; slot++) {
    const row = choices.find((candidate) => candidate.rNo === values[skillOptionField(skillId, slot)]);
    if (row && !chosen.includes(row)) chosen.push(row);
  }
  return chosen;
}

/** 고른 옵션 중 그 종류 (SkillRune type) 값의 합 (최고 등급 값) */
export function skillOptionSum(values: CalcValues, tables: StatTables, skillId: string, type: string): number {
  return chosenSkillOptions(values, tables, skillId)
    .filter((row) => row.type === type)
    .reduce((sum, row) => sum + skillRuneValue(row), 0);
}

/** 고른 옵션 중 "스킬 쿨타임 {0}초 감소" 의 합 (초, 최고 등급 값) */
export function skillCoolOptionSeconds(values: CalcValues, tables: StatTables, skillId: string): number {
  return chosenSkillOptions(values, tables, skillId)
    .filter((row) => row.type === COOL_OPTION_TYPE)
    .reduce((sum, row) => sum + skillRuneValue(row), 0);
}

/** 스킬 문양 칸 (해금 레벨마다 하나) 에 고른 문양의 perkType (비었으면 고르지 않음) */
export function skillPerkField(skillId: string, targetLevel: string): string {
  return `skillPerk_${skillId}_${targetLevel}`;
}

/** 그 스킬의 문양 해금 레벨 목록 (작은 것부터, SkillPerk 표 targetLv) */
export function skillPerkLevels(tables: StatTables, skillId: string): string[] {
  const levels = new Set(rowsOf(tables, PERK_TABLE).filter((row) => row.skillId === skillId).map((row) => row[PERK_LEVEL_COLUMN]));
  return [...levels].sort((left, right) => Number(left) - Number(right));
}

/** 그 스킬 · 해금 레벨의 문양 후보 */
export function skillPerkChoices(tables: StatTables, skillId: string, targetLevel: string): TableRow[] {
  return rowsOf(tables, PERK_TABLE).filter((row) => row.skillId === skillId && row[PERK_LEVEL_COLUMN] === targetLevel);
}

/** 스킬 레벨로 열린 문양 칸에 고른 문양 (해금 레벨 순서) */
export function chosenSkillPerks(values: CalcValues, tables: StatTables, skillId: string): TableRow[] {
  const level = skillLevel(values, skillId);
  return skillPerkLevels(tables, skillId)
    .filter((targetLevel) => level >= Number(targetLevel))
    .flatMap((targetLevel) =>
      skillPerkChoices(tables, skillId, targetLevel).filter((row) => row.perkType === values[skillPerkField(skillId, targetLevel)]),
    );
}

/**
 * 고른 문양의 쿨타임 초 변화 (감소가 양수): "쿨타임 {0}초 감소" − "쿨타임이 {0}초 늘어나는 대신 …".
 * 옵션의 초 감소와 같은 자리에서 빼는 것으로 넣었다 (문구 기준, 게임 코드는 확인 못 함)
 */
export function skillPerkCoolSeconds(values: CalcValues, tables: StatTables, skillId: string): number {
  return chosenSkillPerks(values, tables, skillId).reduce((sum, row) => {
    const seconds = Number(row[PERK_COOL_VALUE_COLUMN]) || 0;
    if (row.perkType === PERK_COOL_DOWN_TYPE) return sum + seconds;
    if (row.perkType === PERK_COOL_UP_TYPE) return sum - seconds;
    return sum;
  }, 0);
}

/**
 * 스킬 옵션 줄: 능력치를 올리는 옵션 (OPTION_BUFFS) 을 골랐으면 최고 값 × 최대 중첩으로 (다발 화살 25% × 5중첩 = 공격력 % 125, ×2.25).
 * 그 스킬을 보유하고 장착 칸에 꼈을 때만 (스킬을 써야 붙는 효과). 고른 옵션마다 줄 하나
 */
export function skillOptionLines(
  values: CalcValues,
  tables: StatTables,
  label: (key: string, params?: Record<string, string | number>) => string,
): Line[] {
  const equipped = equippedSkillIds(values);
  return OPTION_BUFFS.flatMap((buff) => {
    if (!equipped.has(buff.SKILL_ID) || skillLevel(values, buff.SKILL_ID) < FIRST_LEVEL) return [];
    return chosenSkillOptions(values, tables, buff.SKILL_ID)
      .filter((row) => row.type === buff.TYPE)
      .map((row) => {
        const percent = skillRuneValue(row);
        return {
          source: label(buff.MAX_STACKS > 1 ? 'calc.skill.optionSource' : 'calc.skill.optionSourceSingle', {
            skill: label(`calc.skill.optionSkills.${buff.SKILL_ID}`),
            percent,
            stacks: buff.MAX_STACKS,
          }),
          stat: buff.STAT,
          value: percent * buff.MAX_STACKS,
        };
      });
  });
}

/** 장착 5칸에 액티브 스킬이 하나라도 있는가 (장착 스킬이 0개면 없음) */
export function hasEquippedActiveSkill(values: CalcValues, tables: StatTables): boolean {
  return (equippedSkillTypeCounts(values, tables)[ACTIVE_SKILL_TYPE] ?? 0) > 0;
}
