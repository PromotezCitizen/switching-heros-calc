/**
 * 피규어 → 효과 줄 (제공자 T1276 m6838 @306bd38, claude-docs/react-port/stat-provider-formulas.md 10-5절, 합산기 m2730 · 수집기 m2684).
 * 피규어마다 레벨 (칸 figureLevel_<피규어 번호>, 비었거나 0 이면 미보유) 을 넣으면 표 FigureStat 의 (번호, 레벨) 행 슬롯 3개를 넣는다.
 * 이 계정 값이 비어 있어 화면 대조는 못 했다 (구조 확정, 이름 연결 유력)
 */
import { CONSTS } from '@/CONSTS';
import { tableRows, type RawTable, type StatTables, type TableRow } from '@/data/statTables';
import type { FigureCountKind } from '@/consts/providers';
import { exclusiveWeapons, rosterHeroes } from '@/calc/sources/hero/roster';
import { exclusiveOwnedStarField, rosterAwakenField } from '@/calc/sources/hero/rosterFields';
import { stickerLevelField } from '@/calc/sources/heroWeaponCardPet/card';
import type { Line } from '@/calc/combine';
import type { CalcValues } from '@/calc/types';
import { heroFirstRow, slotHeroName } from '@/calc/sources/hero/character';
import { numberValue, type SourceLabel } from '@/calc/sources/heroWeaponCardPet/shared';

const { EMPTY_STATS } = CONSTS.providers;
const {
  TABLE,
  LEVEL_FIELD_PREFIX,
  ID_COLUMN,
  GRADE_COLUMN,
  LEVEL_COLUMN,
  SLOT_COUNT,
  STAT_COLUMN_PREFIX,
  VALUE_COLUMN_PREFIX,
  TARGET_HERO_PATTERN,
  TARGET_HERO_STATS,
  CARD_SET_POINT_STAT,
  CARD_SET_POINT_TARGET_STAT,
  CARD_SET_POINT_FIELD,
  COUNT_STATS,
  LEVEL_SUM_GRADES,
  MYTHIC_GRADE,
} = CONSTS.providers.figure;
const EMPTY_TABLE: RawTable = { columns: [], rows: [] };

export function figureLevelField(figureId: string): string {
  return `${LEVEL_FIELD_PREFIX}${figureId}`;
}

export interface Figure {
  figureId: string;
  grade: string;
  maxLevel: number;
  /** 레벨 1 행의 첫 스탯 (칸 이름 옆 안내용) */
  firstStat: string;
}

const figureCache = new WeakMap<object, Figure[]>();

/** 피규어 목록 (표 순서, 피규어마다 한 번) */
export function figures(tables: StatTables): Figure[] {
  const table = tables[TABLE];
  if (!table) return [];
  let cached = figureCache.get(table);
  if (!cached) {
    const byId = new Map<string, Figure>();
    for (const row of tableRows(table)) {
      const figureId = row[ID_COLUMN];
      const level = Number(row[LEVEL_COLUMN]);
      const current = byId.get(figureId);
      if (!current) {
        byId.set(figureId, { figureId, grade: row[GRADE_COLUMN], maxLevel: level, firstStat: row[`${STAT_COLUMN_PREFIX}1`] });
      } else {
        current.maxLevel = Math.max(current.maxLevel, level);
      }
    }
    cached = [...byId.values()];
    figureCache.set(table, cached);
  }
  return cached;
}

/** 피규어 하나의 그 레벨 행 */
export function figureRow(tables: StatTables, figureId: string, level: number): TableRow | undefined {
  const table = tables[TABLE];
  if (!table || level < 1) return undefined;
  return tableRows(table).find((row) => row[ID_COLUMN] === figureId && Number(row[LEVEL_COLUMN]) === level);
}

export function figureLevel(values: CalcValues, figureId: string): number {
  return numberValue(values, figureLevelField(figureId));
}

/** 개수형 효과의 N (피규어 레벨 합 · 신화 피규어 수 · 배지 점수 합 · 전용 무기 초월 합 · 히어로 각성 합) */
export function figureCounts(values: CalcValues, tables: StatTables): Record<FigureCountKind, number> {
  const owned = figures(tables).map((figure) => ({ grade: figure.grade, level: Math.min(figureLevel(values, figure.figureId), figure.maxLevel) }));
  const levelSum = (grades: string[]) => owned.reduce((sum, figure) => (grades.includes(figure.grade) ? sum + figure.level : sum), 0);
  const stickerIds = [...new Set(tableRows(tables.CardStickerSet ?? EMPTY_TABLE).map((row) => row.stickerId))];
  return {
    figureLevelDC: levelSum(LEVEL_SUM_GRADES.figureLevelDC),
    figureLevelDCB: levelSum(LEVEL_SUM_GRADES.figureLevelDCB),
    mythicFigures: owned.filter((figure) => figure.grade === MYTHIC_GRADE && figure.level > 0).length,
    stickerPoints: stickerIds.reduce((sum, stickerId) => sum + numberValue(values, stickerLevelField(stickerId)), 0),
    weaponTranscend: exclusiveWeapons(tables).reduce((sum, weapon) => sum + numberValue(values, exclusiveOwnedStarField(weapon.weaponId)), 0),
    heroAwaken: tables.Character
      ? rosterHeroes(tables).reduce((sum, hero) => sum + numberValue(values, rosterAwakenField(hero.charId)), 0)
      : 0,
  };
}

export function figureLines(values: CalcValues, tables: StatTables, label: SourceLabel): Line[] {
  const lines: Line[] = [];
  const heroId = heroFirstRow(tables, slotHeroName(values, tables))?.charId;
  const cardSetPoint = numberValue(values, CARD_SET_POINT_FIELD);
  let counts: Record<FigureCountKind, number> | undefined;
  for (const figure of figures(tables)) {
    const level = Math.min(figureLevel(values, figure.figureId), figure.maxLevel);
    const row = figureRow(tables, figure.figureId, level);
    if (!row) continue;
    const source = label('calc.figure.source', { figure: figure.figureId, level });
    for (let slot = 1; slot <= SLOT_COUNT; slot++) {
      const stat = row[`${STAT_COLUMN_PREFIX}${slot}`];
      const value = Number(row[`${VALUE_COLUMN_PREFIX}${slot}`]) || 0;
      if (!stat || EMPTY_STATS.includes(stat) || !value) continue;
      // 사망 방어 뒤 공격력은 넣지 않는다 — 죽을 일이 없으므로 (사용자 결정 2026-11-07)
      if (stat === CONSTS.masteryRuneBuff.FIGURE_BATTLE.DEATH_GUARD_STAT) continue;
      const targetHero = TARGET_HERO_PATTERN.exec(stat);
      if (targetHero) {
        // 히어로 번호가 같을 때만: 체력 % · 공격력 % 로 넣는다 (m2730)
        if (heroId !== undefined && targetHero[1] === heroId) {
          lines.push({ source, stat: TARGET_HERO_STATS[targetHero[2].toLowerCase()], value });
        }
      } else if (stat === CARD_SET_POINT_STAT) {
        // 개수 수집기 m2684: 1 + (v − 1) x 세트 점수 = 값 x 세트 점수 %
        if (cardSetPoint) lines.push({ source, stat: CARD_SET_POINT_TARGET_STAT, value: value * cardSetPoint });
      } else if (COUNT_STATS[stat]) {
        // 개수 수집기 m2684: 값 x N % (N = 레벨 합 · 신화 수 · 배지 점수 합 · 초월 합 · 각성 합)
        counts ??= figureCounts(values, tables);
        const count = counts[COUNT_STATS[stat].count];
        if (count) lines.push({ source, stat: COUNT_STATS[stat].target, value: value * count });
      } else {
        lines.push({ source, stat, value });
      }
    }
  }
  return lines;
}
