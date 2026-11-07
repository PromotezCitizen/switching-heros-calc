/**
 * 별자리 유물 → 효과 줄 (표 AncientRelic 5.70 · 저장 Dispatch.ancientRelicData, 규칙은 consts/providers.ts ancientRelic 설명).
 * 달성한 별자리는 모든 칸 최대 레벨 + 모든 단계 보너스, 진행 중인 별자리는 입력한 칸 레벨 + 켜진 단계의 보너스. 줄마다 `_per_` 곱
 */
import { CONSTS } from '@/CONSTS';
import { tableRows, type StatTables, type TableRow } from '@/data/statTables';
import type { Line } from '@/calc/combine';
import type { CalcValues } from '@/calc/types';
import type { SourceLabel } from '@/calc/sources/heroWeaponCardPet/shared';

const { EMPTY_STATS } = CONSTS.providers;
const {
  TABLE,
  MASTERED_FIELD,
  PROGRESS_FIELD,
  CONST_COLUMN,
  STEP_COLUMN,
  NODE_COLUMN,
  MAX_LEVEL_COLUMN,
  BASE_COLUMN,
  ENHANCE_COLUMN,
  STAT_COLUMN,
  ENTRY_SEPARATOR,
  FIELD_SEPARATOR,
  NODE_SEPARATOR,
  LEVEL_SEPARATOR,
  LIST_SEPARATOR,
  STEP_BONUS_NODE,
} = CONSTS.providers.ancientRelic;

/** 진행 중인 별자리의 한 단계 */
export interface AncientStep {
  constId: string;
  step: string;
  active: boolean;
  /** 칸 번호 → 레벨 */
  levels: Map<string, number>;
}

/** 달성한 별자리 번호 목록 (입력 글 "1,3") */
export function ancientMastered(values: CalcValues): string[] {
  return (values[MASTERED_FIELD] ?? '')
    .split(LIST_SEPARATOR)
    .map((id) => id.trim())
    .filter(Boolean);
}

/** 진행 글 "별자리:단계:켜짐:칸=레벨,칸=레벨;…" → 단계 목록 (읽을 수 없는 항목은 건너뜀) */
export function ancientProgress(values: CalcValues): AncientStep[] {
  return (values[PROGRESS_FIELD] ?? '')
    .split(ENTRY_SEPARATOR)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry): AncientStep[] => {
      const [constId, step, active, nodes = ''] = entry.split(FIELD_SEPARATOR);
      if (!constId || !step) return [];
      const levels = new Map<string, number>();
      for (const node of nodes.split(NODE_SEPARATOR)) {
        const [idx, level] = node.split(LEVEL_SEPARATOR);
        if (idx && Number(level) > 0) levels.set(idx.trim(), Number(level));
      }
      return [{ constId: constId.trim(), step: step.trim(), active: active?.trim() === '1', levels }];
    });
}

interface AncientIndex {
  rows: TableRow[];
  byConst: Map<string, TableRow[]>;
  byNode: Map<string, TableRow>;
}

const indexCache = new WeakMap<object, AncientIndex>();

function nodeKey(constId: string, step: string, idx: string): string {
  return [constId, step, idx].join(FIELD_SEPARATOR);
}

function ancientIndex(tables: StatTables): AncientIndex | null {
  const table = tables[TABLE];
  if (!table) return null;
  let index = indexCache.get(table);
  if (!index) {
    const rows = tableRows(table);
    const byConst = new Map<string, TableRow[]>();
    const byNode = new Map<string, TableRow>();
    for (const row of rows) {
      byConst.set(row[CONST_COLUMN], [...(byConst.get(row[CONST_COLUMN]) ?? []), row]);
      byNode.set(nodeKey(row[CONST_COLUMN], row[STEP_COLUMN], row[NODE_COLUMN]), row);
    }
    index = { rows, byConst, byNode };
    indexCache.set(table, index);
  }
  return index;
}

function lineOf(row: TableRow, level: number, label: SourceLabel): Line | null {
  const stat = row[STAT_COLUMN];
  const value = Number(row[BASE_COLUMN]) + Number(row[ENHANCE_COLUMN]) * level;
  if (EMPTY_STATS.includes(stat) || !(value > 0)) return null;
  return { source: label('calc.ancientRelic.source', { constellation: row[CONST_COLUMN], step: row[STEP_COLUMN] }), stat, value };
}

export function ancientRelicLines(values: CalcValues, tables: StatTables, label: SourceLabel): Line[] {
  const index = ancientIndex(tables);
  if (!index) return [];
  const lines: Line[] = [];
  const mastered = new Set(ancientMastered(values));
  for (const constId of mastered) {
    for (const row of index.byConst.get(constId) ?? []) {
      const line = lineOf(row, Number(row[MAX_LEVEL_COLUMN]), label);
      if (line) lines.push(line);
    }
  }
  for (const step of ancientProgress(values)) {
    if (mastered.has(step.constId)) continue;
    for (const [idx, level] of step.levels) {
      const row = index.byNode.get(nodeKey(step.constId, step.step, idx));
      const line = row && lineOf(row, Math.min(level, Number(row[MAX_LEVEL_COLUMN])), label);
      if (line) lines.push(line);
    }
    const bonus = step.active ? index.byNode.get(nodeKey(step.constId, step.step, STEP_BONUS_NODE)) : undefined;
    const bonusLine = bonus && lineOf(bonus, Number(bonus[MAX_LEVEL_COLUMN]), label);
    if (bonusLine) lines.push(bonusLine);
  }
  return lines;
}
