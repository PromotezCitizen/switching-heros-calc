/**
 * 베르 각성 단계 (Awaken 표): 등급·별 선택지, 고른 단계의 최종 배율, 화면 최종 배율 확인.
 * 기존 stat-calc-core.js awakenStages (58~66), stat-calc.html refreshAwakenStars·selectedStage (583~592),
 * 각성 확인 문구 (696~701). 화면·React 와 무관한 순수 함수
 */
import { CONSTS } from '../../../CONSTS';
import { tableRows, type StatTables, type TableRow } from '../../../data/statTables';
import { parseGameNumber } from '../../gameNumber';
import type { CalcValues } from '../../types';
import { resolveChoice } from './character';

const { FIELDS, TABLES, AWAKEN_FINAL_TOLERANCE_LOG } = CONSTS.hero;

/** 각성 단계 한 행 */
export interface AwakenStage {
  awakenLv: number;
  grade: string;
  star: number;
  maxLv: number;
  /** 최종 공격력·체력 배율 (누적, log10) */
  finalAtk: number;
  finalHp: number;
  row: TableRow;
}

const stageCache = new WeakMap<object, AwakenStage[]>();

/** 각성 단계 전부 (단계 순). 표마다 한 번만 만든다 */
export function awakenStages(tables: StatTables): AwakenStage[] {
  const table = tables[TABLES.AWAKEN];
  if (!table) return [];
  let stages = stageCache.get(table);
  if (!stages) {
    stages = tableRows(table)
      .map((row) => ({
        awakenLv: Number(row.awakenLv),
        grade: row.grade,
        star: Number(row.star),
        maxLv: Number(row.maxLv),
        finalAtk: Math.log10(Number(row.finalAtk)),
        finalHp: Math.log10(Number(row.finalHp)),
        row,
      }))
      .sort((left, right) => left.awakenLv - right.awakenLv);
    stageCache.set(table, stages);
  }
  return stages;
}

/** 등급 선택지 (단계 순, 중복 제거) */
export function awakenGradeChoices(stages: AwakenStage[]): string[] {
  return [...new Set(stages.map((stage) => stage.grade))];
}

/** 등급의 별 선택지 (글, 단계 순) */
export function awakenStarChoices(stages: AwakenStage[], grade: string): string[] {
  return stages.filter((stage) => stage.grade === grade).map((stage) => String(stage.star));
}

/** 칸 값 → 등급·별 (비었거나 목록에 없으면 첫 선택지, 기존 화면의 선택 칸과 같음) */
export function selectedAwakenChoice(values: CalcValues, stages: AwakenStage[]): { grade: string; star: string } {
  const grade = resolveChoice(values[FIELDS.AWAKEN_GRADE], awakenGradeChoices(stages));
  const star = resolveChoice(values[FIELDS.AWAKEN_STAR], awakenStarChoices(stages, grade));
  return { grade, star };
}

/** 고른 각성 단계 행. 표가 없으면 undefined (기존 selectedStage) */
export function selectedAwakenStage(values: CalcValues, tables: StatTables): AwakenStage | undefined {
  const stages = awakenStages(tables);
  const { grade, star } = selectedAwakenChoice(values, stages);
  return stages.find((stage) => stage.grade === grade && String(stage.star) === star);
}

export interface AwakenFinalCheckRow {
  /** 'finalAtk' | 'finalHp' */
  target: 'finalAtk' | 'finalHp';
  screenLog: number;
  tableLog: number;
  same: boolean;
}

const FINAL_CHECK_FIELDS = [
  { field: FIELDS.AWAKEN_FINAL_ATK, target: 'finalAtk' },
  { field: FIELDS.AWAKEN_FINAL_HP, target: 'finalHp' },
] as const;

/** 화면 최종 배율 (베르 각성 세부 탭의 확인용 칸) 대 수치표 단계 배율. 값을 넣은 칸만 (기존 html 696~701) */
export function awakenFinalCheck(values: CalcValues, stage: AwakenStage | undefined): AwakenFinalCheckRow[] {
  if (!stage) return [];
  const rows: AwakenFinalCheckRow[] = [];
  for (const { field, target } of FINAL_CHECK_FIELDS) {
    const parsed = parseGameNumber(values[field]);
    if (!parsed) continue;
    rows.push({
      target,
      screenLog: parsed.log,
      tableLog: stage[target],
      same: Math.abs(parsed.log - stage[target]) < AWAKEN_FINAL_TOLERANCE_LOG,
    });
  }
  return rows;
}
