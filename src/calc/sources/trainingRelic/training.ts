/**
 * 훈련 → 효과 줄 (기존 htmls/stat-calc-sources.js renderTraining, stat-calc-core.js trainingRowItems).
 * 앱 코드 (확정): 끝낸 단계 행만 × gradeUpMultiply 한 번, 현재 단계 × 1. 행마다 한 줄.
 */
import { CONSTS } from '../../../CONSTS';
import { tableRows, type StatTables, type TableRow } from '../../../data/statTables';
import type { Line } from '../../combine';
import type { CalcValues } from '../../types';
import { integerFieldValue } from './fieldNumbers';

const { ITEM_COUNT, FIRST_ITEM_NUMBER, SCREEN_STAGE_OFFSET, DEFAULT_GRADE_UP_MULTIPLY, CURRENT_STAGE_MULTIPLY } =
  CONSTS.trainingRelic.training;
const EMPTY_LEVEL = CONSTS.emptyInput.LEVEL;

export const TRAINING_TABLE = 'Training';
export const TRAINING_STAGE_FIELD = 'trainingStage';
/** 명중 (hit) 항목은 계산에서 뺀다 (사용자 지시) */
export const TRAINING_HIDDEN_STAT = 'hit';

/** 현재 단계 항목 레벨 칸 이름 (trainingLevel1 ~ 4) */
export const TRAINING_LEVEL_FIELDS: string[] = Array.from(
  { length: ITEM_COUNT },
  (_, index) => `trainingLevel${index + FIRST_ITEM_NUMBER}`,
);

/** 칸 순서 (0부터) → 화면 항목 번호 (1부터) */
export function trainingItemNumber(index: number): number {
  return index + FIRST_ITEM_NUMBER;
}

/** 훈련 단계 입력이 있는지 (0·빈칸이면 줄을 만들지 않는다) */
export function trainingStageEntered(values: CalcValues): boolean {
  return Boolean(integerFieldValue(values, TRAINING_STAGE_FIELD));
}

interface TrainingIndex {
  rows: TableRow[];
  maxStage: number;
  rowsByStage: Map<number, TableRow[]>;
}

const indexCache = new WeakMap<TableRow[], TrainingIndex>();

function trainingIndex(tables: StatTables): TrainingIndex {
  const rows = tableRows(tables[TRAINING_TABLE]);
  let index = indexCache.get(rows);
  if (!index) {
    const rowsByStage = new Map<number, TableRow[]>();
    let maxStage: number = EMPTY_LEVEL;
    for (const row of rows) {
      const stage = Number(row.grade);
      maxStage = Math.max(maxStage, stage);
      const stageRows = rowsByStage.get(stage) ?? [];
      stageRows.push(row);
      rowsByStage.set(stage, stageRows);
    }
    index = { rows, maxStage, rowsByStage };
    indexCache.set(rows, index);
  }
  return index;
}

/** 수치표의 가장 높은 단계 (grade) */
export function trainingMaxStage(tables: StatTables): number {
  return trainingIndex(tables).maxStage;
}

/** 게임 화면 단계 입력 → 수치표 단계 (grade). 입력이 없으면 0 */
export function trainingGrade(values: CalcValues, tables: StatTables): number {
  const screenStage = integerFieldValue(values, TRAINING_STAGE_FIELD);
  return Math.min(Math.max(screenStage - SCREEN_STAGE_OFFSET, EMPTY_LEVEL), trainingMaxStage(tables));
}

/** 수치표 단계 → 게임 화면 단계 */
export function trainingScreenStage(grade: number): number {
  return grade + SCREEN_STAGE_OFFSET;
}

/** 현재 단계 항목 칸마다 그 칸에 해당하는 행 (없거나 명중이면 null = 칸을 숨김) */
export function trainingSlotRows(values: CalcValues, tables: StatTables): (TableRow | null)[] {
  const stageRows = trainingIndex(tables).rowsByStage.get(trainingGrade(values, tables)) ?? [];
  return TRAINING_LEVEL_FIELDS.map((_, index) => {
    const row = stageRows[index];
    return row && row.stat !== TRAINING_HIDDEN_STAT ? row : null;
  });
}

export interface TrainingRowItem {
  stat: string;
  value: number;
  /** 수치표 단계 (grade) */
  stage: number;
}

/** 훈련 행별 값: stage = 수치표 단계, currentLevels = 현재 단계 스탯 → 레벨 */
export function trainingRowItems(
  tables: StatTables,
  stage: number,
  currentLevels: Record<string, number>,
): TrainingRowItem[] {
  const items: TrainingRowItem[] = [];
  for (const row of trainingIndex(tables).rows) {
    const rowStage = Number(row.grade);
    if (rowStage > stage) continue;
    const finished = rowStage < stage;
    const maxLevel = Number(row.maxLevel);
    const level = finished
      ? maxLevel
      : Math.min(Math.max(Number(currentLevels[row.stat]) || EMPTY_LEVEL, EMPTY_LEVEL), maxLevel);
    const multiply = finished ? Number(row.gradeUpMultiply) || DEFAULT_GRADE_UP_MULTIPLY : CURRENT_STAGE_MULTIPLY;
    const value = Number(row.statUpValue) * level * multiply;
    if (value) items.push({ stat: row.stat, value, stage: rowStage });
  }
  return items;
}

/** stageLabel: 게임 화면 단계 → 줄 출처 이름 (예: "훈련 177단계") */
export function trainingLines(
  values: CalcValues,
  tables: StatTables,
  stageLabel: (screenStage: number) => string,
): Line[] {
  if (!trainingStageEntered(values)) return [];
  const currentLevels: Record<string, number> = {};
  trainingSlotRows(values, tables).forEach((row, index) => {
    if (!row) return;
    currentLevels[row.stat] = Math.min(integerFieldValue(values, TRAINING_LEVEL_FIELDS[index]), Number(row.maxLevel));
  });
  return trainingRowItems(tables, trainingGrade(values, tables), currentLevels)
    .filter((item) => item.stat !== TRAINING_HIDDEN_STAT)
    .map((item) => ({ source: stageLabel(trainingScreenStage(item.stage)), stat: item.stat, value: item.value }));
}
