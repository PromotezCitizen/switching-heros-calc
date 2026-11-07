/**
 * 프로필 아이콘 · 호감도 (화면 값), 캐릭터 각성 (1슬롯 히어로), 별자리 요정의 축복 → 효과 줄.
 * 게임에서 서로 다른 화면이라 탭도 각각 (프로필 아이콘·요정의 축복·호감도 칸, 캐릭터 각성은 히어로 탭)
 */
import { CONSTS } from '@/CONSTS';
import { tableRows, type StatTables, type TableRow } from '@/data/statTables';
import type { Line } from '@/calc/combine';
import type { CalcValues } from '@/calc/types';
import { slotHeroName } from '@/calc/sources/hero/character';
import { rosterHeroes } from '@/calc/sources/hero/roster';
import { rosterAffinityField, rosterAwakenField } from '@/calc/sources/hero/rosterFields';
import { isChecked, screenFieldLines, wholeLevel, type ScreenField, type SourceLabel } from '@/calc/sources/textLines/screenFields';

const {
  TABLE_NAMES,
  FAIRY_BLESSING_STATS,
  HERO_AWAKEN_STAT_COLUMNS,
  HERO_NAME_FIELD,
} = CONSTS.textLines;

/** 프로필 아이콘 "능력치 확인" 누적 값 */
export const PROFILE_ICON_FIELDS: ScreenField[] = [
  { id: 'profileIconAtk', stat: '_per_attackDamage', sourceKey: 'calc.other.sources.profileIcon' },
];
/** 호감도: 히어로 표의 호감도 레벨 + 서버 표 CharacterAffinity (히어로 이름은 Character) */
export const AFFINITY_TABLE_NAMES = [TABLE_NAMES.CHARACTER, CONSTS.hero.AFFINITY_TABLE] as const;
/** CharacterAffinity 행의 능력치 열 묶음 (statType1·statVal1 = 공격력, statType2·statVal2 = 체력) */
const AFFINITY_STAT_COLUMNS = [
  ['statType1', 'statVal1'],
  ['statType2', 'statVal2'],
] as const;
export const FAIRY_TABLE_NAMES = [TABLE_NAMES.FAIRY_BLESSING] as const;

export const FAIRY_BLESSING_ON_FIELD = 'fairyBlessingOn';
export const FAIRY_BOND_LEVEL_FIELD = 'fairyBondLevel';
export const HERO_AWAKEN_LEVEL_FIELD = 'heroAwakenLevel';


function rowsOf(tables: StatTables, name: string): TableRow[] {
  const table = tables[name];
  return table ? tableRows(table) : [];
}

/** 1슬롯 히어로(계산 탭 charName)의 히어로 각성 행. 히어로·레벨이 없거나 표에 없으면 null */
export function heroAwakenRow(values: CalcValues, tables: StatTables): TableRow | null {
  const heroName = slotHeroName(values, tables, HERO_NAME_FIELD);
  if (!heroName) return null;
  const hero = rowsOf(tables, TABLE_NAMES.CHARACTER).find((row) => row.name === heroName);
  if (!hero) return null;
  // 히어로 표 (그 히어로 줄) 의 각성 값을 먼저, 없으면 예전 칸
  const level = wholeLevel(values[rosterAwakenField(hero.charId)] || values[HERO_AWAKEN_LEVEL_FIELD]);
  if (!level) return null;
  return (
    rowsOf(tables, TABLE_NAMES.HERO_AWAKEN).find(
      (row) => row.charId === hero.charId && Number(row.lv) === level,
    ) ?? null
  );
}

/** 요정의 유대 레벨 행 (서버 표 AdsBuff). 레벨 0 이거나 표에 없으면 null */
export function fairyBlessingRow(level: number, tables: StatTables): TableRow | null {
  if (!level) return null;
  return rowsOf(tables, TABLE_NAMES.FAIRY_BLESSING).find((row) => Number(row.lv) === level) ?? null;
}

export function profileIconLines(values: CalcValues, sourceLabel: SourceLabel): Line[] {
  return screenFieldLines(values, PROFILE_ICON_FIELDS, sourceLabel);
}

/** 호감도: 히어로마다 (호감도 레벨이 있으면) 그 레벨의 누적 공격력·체력 % 한 줄씩 (게임 누적 창 = 히어로끼리 곱) */
export function affinityLines(values: CalcValues, tables: StatTables, sourceLabel: SourceLabel): Line[] {
  const affinityRows = rowsOf(tables, CONSTS.hero.AFFINITY_TABLE);
  const lines: Line[] = [];
  for (const hero of rosterHeroes(tables)) {
    const level = wholeLevel(values[rosterAffinityField(hero.charId)]);
    if (!level) continue;
    const row = affinityRows.find((candidate) => candidate.charId === hero.charId && Number(candidate.lv) === level);
    if (!row) continue;
    for (const [typeColumn, valueColumn] of AFFINITY_STAT_COLUMNS) {
      const value = Number(row[valueColumn]);
      if (value > 0) {
        lines.push({ source: sourceLabel('calc.other.sources.affinity', { hero: hero.name, level }), stat: row[typeColumn], value });
      }
    }
  }
  return lines;
}

/** 1슬롯 히어로의 캐릭터 각성 줄 (입력 칸은 캐릭터 각성 칸, 계산은 히어로 탭) */
export function heroAwakenLines(values: CalcValues, tables: StatTables, sourceLabel: SourceLabel): Line[] {
  const heroAwaken = heroAwakenRow(values, tables);
  if (!heroAwaken) return [];
  const source = sourceLabel('calc.other.sources.heroAwaken', { level: heroAwaken.lv, hero: slotHeroName(values, tables, HERO_NAME_FIELD) });
  return HERO_AWAKEN_STAT_COLUMNS.flatMap(([typeColumn, valueColumn]) => {
    const stat = heroAwaken[typeColumn];
    const value = Number(heroAwaken[valueColumn]);
    return stat && !CONSTS.providers.EMPTY_STATS.includes(stat) && value > 0 ? [{ source, stat, value }] : [];
  });
}

/** 별자리 요정의 축복 (레벨·켜짐은 공통 입력) */
export function fairyBlessingLines(values: CalcValues, tables: StatTables, sourceLabel: SourceLabel): Line[] {
  const fairyLevel = wholeLevel(values[FAIRY_BOND_LEVEL_FIELD]);
  const fairyRow = fairyBlessingRow(fairyLevel, tables);
  if (!fairyRow || !isChecked(values[FAIRY_BLESSING_ON_FIELD])) return [];
  return FAIRY_BLESSING_STATS.map((blessing) => ({
    source: sourceLabel('calc.other.sources.fairyBlessing', { level: fairyLevel }),
    stat: blessing.stat,
    value: Number(fairyRow[blessing.column]),
  }));
}
