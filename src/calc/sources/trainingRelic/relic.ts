/**
 * 유물 → 효과 줄 (기존 htmls/stat-calc-sources.js renderRelic · relicLinkField · relicMultiplier · relicTargetStat,
 * stat-calc-core.js relicValue · relicBlessing).
 * 유물 하나 = 한 줄. "○○ x N%" 유물은 연동 수치를 곱해 실제로 올리는 스탯으로 넣는다.
 */
import { CONSTS } from '@/CONSTS';
import { tableRows, type StatTables, type TableRow } from '@/data/statTables';
import type { Line } from '@/calc/combine';
import type { CalcValues } from '@/calc/types';
import { integerFieldValue } from '@/calc/sources/trainingRelic/fieldNumbers';
import { trainingGrade } from '@/calc/sources/trainingRelic/training';
import { heroCountAtLeast, star10WeaponCount } from '@/calc/sources/hero/roster';
import { equippedSkillLevelSum } from '@/calc/sources/skill/skill';

const { WEAPON_LEVEL_DIVISOR, RUNE_NUMBER_OFFSET, BLESSING_LEVEL_OFFSET, FILL_LOWER_GRADE_LEVEL, BLESSING_PER_ENHANCE } =
  CONSTS.trainingRelic.relic;
const EMPTY_LEVEL = CONSTS.emptyInput.LEVEL;
const { SS_GRADE, SSS_GRADE } = CONSTS.trainingRelic.relic;

export const RELIC_TABLE = 'Relic';
export const RELIC_MAX_GRADE_FIELD = 'relicMaxGrade';
/** 세트 보너스 합계 칸은 카드 탭에 있다 (relicLink_cardSetBonus) */
export const CARD_SET_BONUS_LINK = 'cardSetBonus';
/** 유물 블레싱 효과가 들어가는 스탯 (효과 추정: 축복 × 1 % 공격력·체력) */
export const RELIC_BLESSING_STATS = ['_per_attackDamage', '_per_hp'];

/** 유물 "○○ x N%" 가 곱해지는 연동 수치 (기존 RELIC_LINK_FIELDS 순서). 칸 이름 = relicLink_<이름> */
export const RELIC_LINK_FIELDS = [
  'dispatchLevel',
  CARD_SET_BONUS_LINK,
  'ssHeroes',
  'sssHeroes',
  'equipSkillLevel',
  'weaponLevelSwordsman',
  'weaponLevelFighter',
  'weaponLevelArcher',
  'weaponLevelMage',
  'dungeonGold',
  'dungeonEquip',
  'dungeonRelic',
  'rCards',
  'ssrCards',
  'star10Weapons',
] as const;
export type RelicLinkField = (typeof RELIC_LINK_FIELDS)[number];
/** 직업 일반 무기 합산 레벨 연동 (칸 없이 자동: 일반 무기 전부 최대 레벨 가정, 사용자 결정) */
const WEAPON_LEVEL_LINK_PREFIX = 'weaponLevel';
export const WEAPON_JOB_TABLE = 'WeaponJob';
/** 히어로 표 · 전용 무기 표에서 자동으로 세는 연동 수치 (칸 없음) */
const ROSTER_COUNT_LINKS: Record<string, (values: CalcValues, tables: StatTables) => number> = {
  ssHeroes: (values, tables) => heroCountAtLeast(values, tables, SS_GRADE),
  sssHeroes: (values, tables) => heroCountAtLeast(values, tables, SSS_GRADE),
  star10Weapons: (values, tables) => star10WeaponCount(values, tables),
  // 장착 스킬 레벨 합 = 스킬 탭 장착 5칸 레벨 합 (사용자 결정 "자동합")
  equipSkillLevel: (values) => equippedSkillLevelSum(values),
};
/** 유물 탭에 칸이 있는 연동 수치 (세트 보너스 합계 = 카드 탭, 일반 무기 합산 레벨·히어로 수·★10 무기 수·장착 스킬 레벨 합 = 자동 이라 제외) */
export const RELIC_TAB_LINK_FIELDS = RELIC_LINK_FIELDS.filter(
  (field) => field !== CARD_SET_BONUS_LINK && !field.startsWith(WEAPON_LEVEL_LINK_PREFIX) && !(field in ROSTER_COUNT_LINKS),
);

/** 직업 일반 무기 합산 레벨 = 그 직업 일반 무기 전부의 최대 레벨 합 (표 WeaponJob, 전부 만렙 가정) */
export function maxNormalWeaponLevelSum(tables: StatTables, job: string): number {
  const table = tables[WEAPON_JOB_TABLE];
  if (!table) return EMPTY_LEVEL;
  return tableRows(table)
    .filter((row) => row.job === job)
    .reduce((sum: number, row) => sum + Number(row.maxLv), EMPTY_LEVEL);
}

/** 일반 무기 한 개의 실제 강화 레벨을 넣는 칸 (무기 탭, 칸 이름 = 접두사 + 무기 번호 weaponId) */
export const NORMAL_WEAPON_LEVEL_FIELD_PREFIX = 'normalWeaponLevel_';
export function normalWeaponLevelFieldId(weaponId: string): string {
  return `${NORMAL_WEAPON_LEVEL_FIELD_PREFIX}${weaponId}`;
}

/**
 * 일반 무기 한 개의 강화 레벨. 칸이 비어 있으면 최대 레벨 (사용자 결정 "전부 최대 레벨" 가정을 칸이 비었을 때 그대로 씀),
 * 값을 넣으면 그 값 (0 ~ 최대 레벨, 소수 버림)
 */
export function normalWeaponLevel(values: CalcValues, row: TableRow): number {
  const maxLevel = Number(row.maxLv);
  const text = values[normalWeaponLevelFieldId(row.weaponId)];
  if (text === undefined || String(text).trim() === '') return maxLevel;
  return Math.min(Math.max(Math.floor(Number(text) || EMPTY_LEVEL), EMPTY_LEVEL), maxLevel);
}

/** 직업 일반 무기 합산 레벨 = 그 직업 일반 무기 강화 레벨 합 (게임 m2690. 칸이 빈 무기는 최대 레벨로 침) */
export function normalWeaponLevelSum(values: CalcValues, tables: StatTables, job: string): number {
  const table = tables[WEAPON_JOB_TABLE];
  if (!table) return EMPTY_LEVEL;
  return tableRows(table)
    .filter((row) => row.job === job)
    .reduce((sum: number, row) => sum + normalWeaponLevel(values, row), EMPTY_LEVEL);
}

export function relicLinkFieldId(field: string): string {
  return `relicLink_${field}`;
}
export function relicLevelFieldId(relicId: string): string {
  return `relic_${relicId}`;
}

/** 다른 탭에서 읽는 칸 이름 */
export const RUNE_CORE_FIELD = 'rune_core';
export function runeFieldId(slot: number): string {
  return `rune_${slot}`;
}
export function libraryFieldId(job: string): string {
  return `library_${job}`;
}

export function relicRows(tables: StatTables): TableRow[] {
  return tableRows(tables[RELIC_TABLE]);
}

const gradeCache = new WeakMap<TableRow[], string[]>();
/** 유물 등급 (표 순서 = 낮은 등급부터) */
export function relicGrades(tables: StatTables): string[] {
  const rows = relicRows(tables);
  let grades = gradeCache.get(rows);
  if (!grades) {
    grades = [...new Set(rows.map((row) => row.grade))];
    gradeCache.set(rows, grades);
  }
  return grades;
}

/**
 * 유물을 끝까지 모았는가 (콘텐츠 해금 RelicMax, claude-docs/react-port/unlock-relicmax.md 2절):
 * 유물 최대 등급이 표의 마지막 등급이고, 표의 유물을 전부 갖고, 모두 그 유물의 최대 레벨 (maxLv). 별자리 유물이 이때 열린다
 */
export function relicAllMaxed(values: CalcValues, tables: StatTables): boolean {
  const rows = relicRows(tables);
  const grades = relicGrades(tables);
  if (!rows.length || values[RELIC_MAX_GRADE_FIELD] !== grades[grades.length - 1]) return false;
  return rows.every((row) => Math.floor(Number(values[relicLevelFieldId(row.relicId)]) || EMPTY_LEVEL) >= Number(row.maxLv));
}

/** 최대 등급 이하인지 (최대 등급을 안 골랐으면 전부) */
export function relicGradeAllowed(grades: string[], grade: string, maxGrade: string | undefined): boolean {
  return !maxGrade || grades.indexOf(grade) <= grades.indexOf(maxGrade);
}

/** 유물 하나의 효과 = 기본 + 강화당 × 레벨 (게임 화면 확인). 0레벨 = 미보유 */
export function relicValue(row: TableRow, level: number): number {
  const clamped = Math.min(Math.max(Math.floor(Number(level) || EMPTY_LEVEL), EMPTY_LEVEL), Number(row.maxLv));
  return clamped ? Number(row.baseVal) + Number(row.enhVal) * clamped : EMPTY_LEVEL;
}

/** 유물의 축복 두 가지: Σ (레벨 − 1) × 등급별 획득량, Σ 레벨 × 등급별 획득량. levels = {relicId: 레벨} */
export function relicBlessing(
  tables: StatTables,
  levels: Record<string, number>,
): { fromEnhance: number; fromLevel: number } {
  const result = { fromEnhance: EMPTY_LEVEL, fromLevel: EMPTY_LEVEL };
  for (const row of relicRows(tables)) {
    const level = Math.min(
      Math.max(Math.floor(Number(levels[row.relicId]) || EMPTY_LEVEL), EMPTY_LEVEL),
      Number(row.maxLv),
    );
    const perEnhance = BLESSING_PER_ENHANCE[row.grade] || EMPTY_LEVEL;
    if (!level) continue;
    result.fromEnhance += (level - BLESSING_LEVEL_OFFSET) * perEnhance;
    result.fromLevel += level * perEnhance;
  }
  return result;
}

/** 유물 스탯 → 유물 탭 "연동 수치" 칸 이름 (다른 탭 입력을 쓰는 유물·그냥 % 유물은 null) */
export function relicLinkField(stat: string): string | null {
  if (/^_relic_dispa_/.test(stat)) return 'dispatchLevel';
  if (/^_relic_card_/.test(stat)) return CARD_SET_BONUS_LINK;
  if (/_SSSHeroCnt$/.test(stat)) return 'sssHeroes';
  if (/_SSHeroCnt$/.test(stat)) return 'ssHeroes';
  if (/_EqSkillLv$/.test(stat)) return 'equipSkillLevel';
  const weaponMatch = /^_per_(\w+)_HaveWeaponsLv100$/.exec(stat);
  if (weaponMatch) return `weaponLevel${weaponMatch[1]}`;
  if (/_DungeonGoldRecord$/.test(stat)) return 'dungeonGold';
  if (/_DungeonEquipRecord$/.test(stat)) return 'dungeonEquip';
  if (/_DungeonRelicRecord$/.test(stat)) return 'dungeonRelic';
  if (/_HaveSSRMonsterCardCnt$/.test(stat)) return 'ssrCards';
  if (/_HaveRMonsterCardCnt$/.test(stat)) return 'rCards';
  if (/_Star10WeaponCharCnt$/.test(stat)) return 'star10Weapons';
  return null;
}

/**
 * 유물 스탯 → 곱하는 수치 (없으면 null = 그냥 % 유물). 훈련 단계·룬·책 레벨은 그 탭 입력을 읽는다.
 * rosterCounts: 같은 입력으로 여러 유물을 볼 때 히어로 수·★10 무기 수를 한 번만 세도록 셈 결과를 담아 두는 곳
 */
export function relicMultiplier(
  stat: string,
  values: CalcValues,
  tables: StatTables,
  rosterCounts: Map<string, number> = new Map(),
): number | null {
  const linkField = relicLinkField(stat);
  if (linkField?.startsWith(WEAPON_LEVEL_LINK_PREFIX)) {
    // 서버 문구는 "합산 레벨 10당" 이지만 게임 코드 m2690 은 합을 100 으로 나눈 몫 (gap-atk-increase-provider.md 4-4)
    const job = linkField.slice(WEAPON_LEVEL_LINK_PREFIX.length);
    return Math.floor(normalWeaponLevelSum(values, tables, job) / WEAPON_LEVEL_DIVISOR);
  }
  if (linkField && linkField in ROSTER_COUNT_LINKS) {
    let count = rosterCounts.get(linkField);
    if (count === undefined) {
      count = ROSTER_COUNT_LINKS[linkField](values, tables);
      rosterCounts.set(linkField, count);
    }
    return count;
  }
  if (linkField) return integerFieldValue(values, relicLinkFieldId(linkField));
  /* 훈련 단계 연동 유물 (불꽃 조각 등): 앱은 저장 grLv 를 그대로 곱함 = 화면 단계 − 1 (앱 코드 확정) */
  if (/^_relic_tr_/.test(stat)) return trainingGrade(values, tables);
  if (/^_relic_rune_core_/.test(stat)) return integerFieldValue(values, RUNE_CORE_FIELD);
  const runeMatch = /^_relic_rune_(?:dmg|hp)_(\d)$/.exec(stat);
  if (runeMatch) return integerFieldValue(values, runeFieldId(Number(runeMatch[1]) - RUNE_NUMBER_OFFSET));
  const libraryMatch = /_Lib(\w+)Level$/.exec(stat);
  if (libraryMatch) return integerFieldValue(values, libraryFieldId(libraryMatch[1]));
  return null;
}

/**
 * 연동 유물이 실제로 올리는 스탯 (예: _relic_rune_dmg_1 → 공격력 %).
 * 직업 일반 무기 합산 레벨 유물 (99·100·101·102) 은 4직업 모두 공격력 % (`_per_attackDamage`) 에 곱한다:
 * 게임 m2690 이 직업마다 `_per_<직업>_HaveWeaponsLv100` 값 v 로 1 + (v − 1) × N 을 0x61 에 곱함 (x10101-1057-gamecode.md 2절, 대상이 직업이 아님)
 */
export function relicTargetStat(stat: string): string {
  if (/^_relic_\w+_dmg(_\d)?$/.test(stat)) return '_per_attackDamage';
  if (/^_relic_\w+_hp(_\d)?$/.test(stat)) return '_per_hp';
  if (/^_per_(\w+)_HaveWeaponsLv100$/.test(stat)) return '_per_attackDamage';
  const plainMatch = /^(_per_(?:attackDamage|hp|hit))_\w+$/.exec(stat);
  if (plainMatch) return plainMatch[1];
  return stat;
}

export interface RelicState {
  row: TableRow;
  /** 입력 레벨 (최대 레벨까지) */
  level: number;
  /** 유물 하나의 효과 (연동 수치를 곱하기 전) */
  value: number;
  /**
   * 곱하는 연동 수치 (없으면 null). 미보유 (레벨 0) 유물은 효과가 없어 계산하지 않고 null.
   * 미보유 유물까지 세면 그 유물이 연동하는 다른 탭 칸 (히어로 표 등급 등) 을 읽게 되어, 그 칸을 바꿀 때마다 유물 탭이 다시 그려진다
   */
  multiplier: number | null;
}

/** 최대 등급 이하 유물의 레벨·값·연동 수치 */
export function relicStates(values: CalcValues, tables: StatTables): RelicState[] {
  const grades = relicGrades(tables);
  const maxGrade = values[RELIC_MAX_GRADE_FIELD];
  const rosterCounts = new Map<string, number>();
  return relicRows(tables)
    .filter((row) => relicGradeAllowed(grades, row.grade, maxGrade))
    .map((row) => {
      const level = Math.min(integerFieldValue(values, relicLevelFieldId(row.relicId)), Number(row.maxLv));
      return {
        row,
        level,
        value: relicValue(row, level),
        multiplier: level ? relicMultiplier(row.statType, values, tables, rosterCounts) : null,
      };
    });
}

/** 보유 유물 (레벨 1 이상, 최대 등급 이하) 이 쓰는 연동 수치 칸 */
export function usedRelicLinkFields(states: RelicState[]): Set<string> {
  const used = new Set<string>();
  for (const state of states) {
    if (!state.level) continue;
    const linkField = relicLinkField(state.row.statType);
    if (linkField) used.add(linkField);
  }
  return used;
}

/** 유물의 축복 (레벨로 자동 계산 = Σ (레벨 − 1) × 등급별 강화 1번당 축복) */
export function relicBlessingFromStates(states: RelicState[], tables: StatTables): number {
  const levels = Object.fromEntries(states.map((state) => [state.row.relicId, state.level]));
  return relicBlessing(tables, levels).fromEnhance;
}

export interface RelicSourceLabels {
  /** 유물 줄 출처 (예: "에메랄드 반지 Lv5", 연동이면 "… Lv5 × 37") */
  relic: (relicId: string, level: number, multiplier: number | null) => string;
  /** 유물의 축복 줄 출처 */
  blessing: string;
}

export function relicLines(values: CalcValues, tables: StatTables, labels: RelicSourceLabels): Line[] {
  const states = relicStates(values, tables);
  const lines: Line[] = [];
  for (const { row, level, value, multiplier } of states) {
    if (!level) continue;
    const source = labels.relic(row.relicId, level, multiplier);
    if (multiplier === null) lines.push({ source, stat: row.statType, value });
    else lines.push({ source, stat: relicTargetStat(row.statType), value: value * multiplier });
  }
  const blessing = relicBlessingFromStates(states, tables);
  if (blessing) {
    for (const stat of RELIC_BLESSING_STATS) lines.push({ source: labels.blessing, stat, value: blessing });
  }
  return lines;
}

/**
 * 최대 등급을 고르면 그보다 낮은 등급 유물 중 레벨 0·빈칸을 1 로 채운다 (사용자 요청, 기존 relicMaxGrade change 처리).
 * 최대 등급 자체는 직접 입력. 돌려주는 값 = 바꿀 칸 → 새 글
 */
export function lowerGradeRelicFill(values: CalcValues, tables: StatTables, maxGrade: string): Record<string, string> {
  const grades = relicGrades(tables);
  const maxIndex = grades.indexOf(maxGrade);
  const changes: Record<string, string> = {};
  if (maxIndex <= EMPTY_LEVEL) return changes;
  for (const row of relicRows(tables)) {
    const fieldId = relicLevelFieldId(row.relicId);
    if (grades.indexOf(row.grade) < maxIndex && !(Number(values[fieldId]) > EMPTY_LEVEL)) {
      changes[fieldId] = String(FILL_LOWER_GRADE_LEVEL);
    }
  }
  return changes;
}
