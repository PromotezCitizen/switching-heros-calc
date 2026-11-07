/**
 * 별자리 유물 → 효과 줄 (표 AncientRelic 5.70 · 저장 Dispatch.ancientRelicData, 규칙은 consts/providers.ts ancientRelic 설명).
 * 진행 중인 별자리 앞의 별자리 = 달성 (모든 칸 최대 + 모든 단계 보너스). 진행 중인 별자리는 현재 단계 앞 = 다 찬 단계 (칸 최대 + 보너스),
 * 현재 단계 = 입력한 칸 레벨 (칸이 모두 최대면 보너스도). 줄마다 `_per_` 곱
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
  CURRENT_CONST_FIELD,
  CURRENT_STEP_FIELD,
  STEP_LEVEL_FIELD_PREFIX,
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

/** 예전 진행 글 "별자리:단계:켜짐:칸=레벨,칸=레벨;…" → 단계 목록 (읽을 수 없는 항목은 건너뜀). 새 칸이 비었을 때만 쓴다 */
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

/**
 * 별자리 이름 키 (번역 constellation_name_<별 개수>Star_<순번>): 별자리 표의 단계 수 = 별 개수이고, 같은 단계 수의 별자리를 번호순으로 세면 순번.
 * 1~44번이 이름 44개와 하나씩 맞고 (단계 수 순서 확인), 45~88번은 같은 순서가 한 번 더 반복돼 같은 이름 (45번 = 1번, 게임 화면 미확인). 모르면 null
 */
export function constellationNameKey(tables: StatTables, constId: string): string | null {
  const index = ancientIndex(tables);
  if (!index) return null;
  const ids = [...index.byConst.keys()].map(Number).sort((left, right) => left - right);
  const cycle = ids.length / 2;
  const id = Number(constId);
  if (!(id >= 1) || !Number.isInteger(cycle)) return null;
  const base = ((id - 1) % cycle) + 1;
  const stepsOf = (constNumber: number) => Math.max(...(index.byConst.get(String(constNumber)) ?? []).map((row) => Number(row[STEP_COLUMN])));
  const stars = stepsOf(base);
  if (!Number.isFinite(stars)) return null;
  const order = ids.filter((other) => other <= base && stepsOf(other) === stars).length;
  return `${stars}Star_${order}`;
}

/** 별자리의 단계 수 (= 별 개수, 표에 없으면 0) */
export function constellationStepCount(tables: StatTables, constId: string): number {
  const index = ancientIndex(tables);
  const rows = index?.byConst.get(constId) ?? [];
  return rows.reduce((max, row) => Math.max(max, Number(row[STEP_COLUMN]) || 0), 0);
}

/** 별자리 번호 목록 (표 순서) */
export function constellationIds(tables: StatTables): string[] {
  const index = ancientIndex(tables);
  return index ? [...index.byConst.keys()].sort((left, right) => Number(left) - Number(right)) : [];
}

/** 이름이 처음 쓰인 뒤 몇 바퀴째인지 (1~44 = 1, 45~88 = 2) */
export function constellationRound(tables: StatTables, constId: string): number {
  const total = constellationIds(tables).length;
  const cycle = total / 2;
  return Number.isInteger(cycle) && cycle > 0 ? Math.floor((Number(constId) - 1) / cycle) + 1 : 1;
}

/** 현재 단계 칸 레벨 입력 칸 이름 */
export function stepLevelField(idx: string): string {
  return `${STEP_LEVEL_FIELD_PREFIX}${idx}`;
}

/** (별자리, 단계) 의 칸 행 (단계 보너스 빼고, 표 순서) */
function stepNodes(index: AncientIndex, constId: string, step: number): TableRow[] {
  return (index.byConst.get(constId) ?? []).filter((row) => Number(row[STEP_COLUMN]) === step && row[NODE_COLUMN] !== STEP_BONUS_NODE);
}

/** 현재 단계의 칸 행 (화면 입력 칸 만들기용) */
export function ancientStepNodes(tables: StatTables, constId: string, step: number): TableRow[] {
  const index = ancientIndex(tables);
  return index ? stepNodes(index, constId, step) : [];
}

/** 진행 중인 별자리: 번호 · 현재 단계 · 그 단계 칸 레벨 */
export interface AncientCurrent {
  constId: string;
  step: number;
  levels: Map<string, number>;
}

/** 새 칸 (별자리 · 현재 단계 · 칸 레벨). 비었으면 예전 진행 글에서 같은 값을 읽는다 (처음으로 안 켜진 단계 = 현재 단계) */
export function ancientCurrent(values: CalcValues, tables: StatTables): AncientCurrent | null {
  const constId = (values[CURRENT_CONST_FIELD] ?? '').trim();
  if (constId) {
    const step = Math.floor(Number(values[CURRENT_STEP_FIELD]) || 0);
    if (step < 1) return null;
    const levels = new Map<string, number>();
    for (const row of ancientStepNodes(tables, constId, step)) {
      const level = Math.floor(Number(values[stepLevelField(row[NODE_COLUMN])]) || 0);
      if (level > 0) levels.set(row[NODE_COLUMN], level);
    }
    return { constId, step, levels };
  }
  const mastered = new Set(ancientMastered(values));
  const steps = ancientProgress(values).filter((entry) => !mastered.has(entry.constId));
  if (!steps.length) return null;
  const own = steps.filter((entry) => entry.constId === steps[0].constId).sort((left, right) => Number(left.step) - Number(right.step));
  const current = own.find((entry) => !entry.active) ?? own[own.length - 1];
  return { constId: current.constId, step: Number(current.step), levels: current.levels };
}

export function ancientRelicLines(values: CalcValues, tables: StatTables, label: SourceLabel): Line[] {
  const index = ancientIndex(tables);
  if (!index) return [];
  const lines: Line[] = [];
  // 진행 중인 별자리 앞의 별자리는 모두 달성 (별자리는 순서대로만 열림: 게임 문구 "다음 별자리로!" · "이전 별을 활성화하세요!",
  // 훈련 단계와 같은 방식)
  const current = ancientCurrent(values, tables);
  const mastered = new Set(current ? [...index.byConst.keys()].filter((id) => Number(id) < Number(current.constId)) : []);
  for (const constId of mastered) {
    for (const row of index.byConst.get(constId) ?? []) {
      const line = lineOf(row, Number(row[MAX_LEVEL_COLUMN]), label);
      if (line) lines.push(line);
    }
  }
  if (current) {
    for (const row of index.byConst.get(current.constId) ?? []) {
      const step = Number(row[STEP_COLUMN]);
      if (step < current.step) {
        // 현재 단계 앞 = 다 찬 단계: 모든 칸 최대 + 단계 보너스
        const line = lineOf(row, Number(row[MAX_LEVEL_COLUMN]), label);
        if (line) lines.push(line);
      } else if (step === current.step && row[NODE_COLUMN] !== STEP_BONUS_NODE) {
        const level = Math.min(current.levels.get(row[NODE_COLUMN]) ?? 0, Number(row[MAX_LEVEL_COLUMN]));
        const line = level > 0 ? lineOf(row, level, label) : null;
        if (line) lines.push(line);
      }
    }
    // 현재 단계 칸이 모두 최대면 그 단계 보너스도
    const nodes = stepNodes(index, current.constId, current.step);
    const full = nodes.length > 0 && nodes.every((row) => (current.levels.get(row[NODE_COLUMN]) ?? 0) >= Number(row[MAX_LEVEL_COLUMN]));
    const bonus = full ? index.byNode.get(nodeKey(current.constId, String(current.step), STEP_BONUS_NODE)) : undefined;
    const bonusLine = bonus && lineOf(bonus, Number(bonus[MAX_LEVEL_COLUMN]), label);
    if (bonusLine) lines.push(bonusLine);
  }
  return lines;
}
