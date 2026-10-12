/**
 * 히어로 (Character 표): 이름·등급·성 선택지, 기본 공격력·체력, 직업·속성 체력 %.
 * 기존 stat-calc-core.js characterBase (51~56), stat-calc.html refreshCharacterOptions (596~603),
 * currentCharacter·classHpLog (713~723). 화면·React 와 무관한 순수 함수
 */
import { CONSTS } from '../../../CONSTS';
import { tableRows, type StatTables, type TableRow } from '../../../data/statTables';
import { combineLines, type Line } from '../../combine';
import type { CalcValues } from '../../types';
import { rosterGradeField, rosterStarField } from './rosterFields';

const {
  FIELDS,
  TABLES,
  BASE_ATTACK_SPEED_COLUMN,
  ATTACK_SPEED_STAT,
  BASE_CRITICAL_RATE,
  CRITICAL_RATE_STAT,
  BASE_CRITICAL_DAMAGE,
  CRITICAL_DAMAGE_SUM_STAT,
} = CONSTS.hero;

/** 기본 공격력·체력 (log10) */
export interface HeroBase {
  atk: number;
  hp: number;
}

export function characterRows(tables: StatTables): TableRow[] {
  const table = tables[TABLES.CHARACTER];
  return table ? tableRows(table) : [];
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

/** 히어로 이름 목록 (표 순서, 중복 제거. 기존 characterNames html 577) */
export function heroNames(tables: StatTables): string[] {
  return unique(characterRows(tables).map((row) => row.name));
}

/** 이름 → 그 히어로의 표 행 전부 (등급·성별) */
export function heroRows(tables: StatTables, name: string | undefined): TableRow[] {
  const trimmed = (name ?? '').trim();
  return trimmed ? characterRows(tables).filter((row) => row.name === trimmed) : [];
}

/** 이름 → 표 첫 행 (직업·속성·성별·charId 를 읽는 용도. 기존 currentCharacter / heroByName) */
export function heroFirstRow(tables: StatTables, name: string | undefined): TableRow | undefined {
  return heroRows(tables, name)[0];
}

/** 칸 값이 선택지에 있으면 그대로, 없으면 첫 선택지 (기존 options() 의 동작: 이전 값이 목록에 없으면 첫 항목) */
export function resolveChoice(stored: string | undefined, choices: string[]): string {
  return stored !== undefined && choices.includes(stored) ? stored : (choices[0] ?? '');
}

/** 히어로의 등급 선택지 (표 순서) */
export function heroGradeChoices(tables: StatTables, name: string | undefined): string[] {
  return unique(heroRows(tables, name).map((row) => row.grade));
}

/** 히어로·등급의 성 선택지 (표 순서) */
export function heroStarChoices(tables: StatTables, name: string | undefined, grade: string): string[] {
  return unique(
    heroRows(tables, name)
      .filter((row) => row.grade === grade)
      .map((row) => row.star),
  );
}

/**
 * 슬롯 (기본 1슬롯) 에 고른 히어로 이름. 히어로 표에서 보유로 표시한 히어로가 하나라도 있으면,
 * 보유 아닌 이름 (히어로 표를 만들기 전에 저장된 값 등) 은 빈 슬롯으로 본다 (고르기 창 목록과 같은 기준)
 */
export function slotHeroName(values: CalcValues, tables: StatTables, fieldId: string = FIELDS.HERO_1): string {
  const name = (values[fieldId] ?? '').trim();
  if (!name) return '';
  // 고른 히어로가 보유면 바로 그 이름 (다른 히어로 칸은 읽지 않는다: 읽은 칸만 구독하는 탭이 히어로 표 등급 칸 전부를 구독하지 않게)
  const charId = heroFirstRow(tables, name)?.charId;
  if (charId && values[rosterGradeField(charId)]) return name;
  // 보유가 아니면, 보유한 히어로가 하나라도 있을 때만 빈 슬롯 (첫 보유 히어로를 찾으면 멈춤)
  const heroIds = unique(characterRows(tables).map((row) => row.charId));
  const ownsAny = heroIds.some((heroId) => values[rosterGradeField(heroId)]);
  return ownsAny ? '' : name;
}

export interface HeroSelection {
  name: string;
  grade: string;
  star: string;
}

/**
 * 1슬롯 히어로의 이름·등급·성. 등급·성은 히어로 표 (그 히어로 줄) 값을 먼저, 없으면 예전 칸 (charGrade·charStar).
 * 비었거나 그 히어로에 없으면 첫 선택지 (기존 화면과 같음)
 */
export function selectedHero(values: CalcValues, tables: StatTables): HeroSelection {
  const name = slotHeroName(values, tables);
  const charId = heroFirstRow(tables, name)?.charId;
  const storedGrade = (charId && values[rosterGradeField(charId)]) || values[FIELDS.HERO_GRADE];
  const storedStar = (charId && values[rosterStarField(charId)]) || values[FIELDS.HERO_STAR];
  const grade = resolveChoice(storedGrade, heroGradeChoices(tables, name));
  const star = resolveChoice(storedStar, heroStarChoices(tables, name, grade));
  return { name, grade, star };
}

/** 이름·등급·성 → 기본 공격력·체력 (log10). 표에 없으면 null (기존 characterBase) */
export function characterBase(
  tables: StatTables,
  name: string,
  grade: string,
  star: string | number,
): HeroBase | null {
  const row = characterRows(tables).find(
    (record) => record.name === name && record.grade === grade && record.star === String(star),
  );
  return row ? { atk: Math.log10(Number(row.atk)), hp: Math.log10(Number(row.hp)) } : null;
}

/**
 * 1슬롯 히어로의 기본 공격속도 줄 (Character 표 atkSpd). 고른 등급·성 행을 쓰고, 없으면 그 히어로의 첫 행.
 * 히어로를 안 골랐거나 값이 없으면 줄이 없다
 */
export function heroBaseAttackSpeedLines(
  values: CalcValues,
  tables: StatTables,
  sourceLabel: (translationKey: string, params?: Record<string, string | number>) => string,
): Line[] {
  const hero = selectedHero(values, tables);
  const rows = heroRows(tables, hero.name);
  const row = rows.find((record) => record.grade === hero.grade && record.star === hero.star) ?? rows[0];
  const attackSpeed = row ? Number(row[BASE_ATTACK_SPEED_COLUMN]) : 0;
  if (!attackSpeed) return [];
  return [
    { source: sourceLabel('calc.hero.sources.baseAttackSpeed', { hero: hero.name }), stat: ATTACK_SPEED_STAT, value: attackSpeed },
  ];
}

/**
 * 1슬롯 히어로의 기본 치명타 확률·치명타 데미지 (합 계열) 줄. 둘 다 표에 없는 추정 값 (consts 의 근거 참고),
 * 히어로마다 같은지도 확인 못 함. 히어로를 안 골랐으면 줄이 없다
 */
export function heroBaseCriticalLines(
  values: CalcValues,
  tables: StatTables,
  sourceLabel: (translationKey: string, params?: Record<string, string | number>) => string,
): Line[] {
  const hero = selectedHero(values, tables);
  if (heroRows(tables, hero.name).length === 0) return [];
  return [
    { source: sourceLabel('calc.hero.sources.baseCriticalRate', { hero: hero.name }), stat: CRITICAL_RATE_STAT, value: BASE_CRITICAL_RATE },
    {
      source: sourceLabel('calc.hero.sources.baseCriticalDamage', { hero: hero.name }),
      stat: CRITICAL_DAMAGE_SUM_STAT,
      value: BASE_CRITICAL_DAMAGE,
    },
  ];
}

/** 입력 칸 → 1슬롯 히어로의 기본 공격력·체력 (log10). 히어로를 안 골랐으면 null */
export function heroBase(values: CalcValues, tables: StatTables): HeroBase | null {
  const hero = selectedHero(values, tables);
  return characterBase(tables, hero.name, hero.grade, hero.star);
}

/** 직업 체력 %·속성 체력 % 스탯 이름 (기존 classHpLog 720) */
export function classHpStats(hero: TableRow): [string, string] {
  return [`_per_${hero.job}_Hp`, `_per_${hero.attribute}Hero_Hp`];
}

/**
 * 입력한 출처의 직업 체력 % × 속성 체력 % (log10). 체력은 이 두 % 가 증가 % 밖에서 따로 곱해진다.
 * lines = 모든 탭의 줄, heroName = 1슬롯 히어로 이름. 히어로가 없으면 null (기존 classHpLog)
 */
export function classHpLog(tables: StatTables, heroName: string | undefined, lines: Line[]): number | null {
  const hero = heroFirstRow(tables, heroName);
  if (!hero) return null;
  const combined = combineLines(lines);
  return classHpStats(hero).reduce((sum, stat) => sum + (combined[stat] ? combined[stat].log : 0), 0);
}
