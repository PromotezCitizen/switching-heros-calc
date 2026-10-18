/** 히어로의 기록·무기·몬스터 카드·펫·광산 계산이 같이 쓰는 도우미. 화면·React 와 무관한 순수 함수 */
import { CONSTS } from '@/CONSTS';
import { tableRows, type StatTables, type TableRow } from '@/data/statTables';
import { parseGameNumber } from '@/calc/gameNumber';
import type { CalcValues } from '@/calc/types';

/** 출처 글을 만드는 함수 (번역 키, 끼워 넣을 값) → 글. 탭 목록(index.ts)이 번역 함수를 넘겨 준다 */
export type SourceLabel = (translationKey: string, params?: Record<string, string | number>) => string;

const { MIN_NUMBER, GRADE_STAR_SEPARATOR } = CONSTS.heroWeaponCardPet;

/** 표 행 객체 목록 (표가 아직 없으면 빈 목록) */
export function rowsOf(tables: StatTables, tableName: string): TableRow[] {
  const table = tables[tableName];
  return table ? tableRows(table) : [];
}

/** 숫자 칸: 정수로 내림, 음수·빈칸·읽을 수 없는 글은 0 (기존 numberValue) */
export function numberValue(values: CalcValues, fieldId: string): number {
  return Math.max(Math.floor(Number(values[fieldId]) || MIN_NUMBER), MIN_NUMBER);
}

/** 게임 표기 화면 값 → log10 (빈칸·해석 불가면 null) */
export function screenLog(values: CalcValues, fieldId: string): number | null {
  return parseGameNumber(values[fieldId])?.log ?? null;
}

export interface RowGroup {
  key: string;
  rows: TableRow[];
}

/** 열 값으로 묶음 (처음 나온 순서 유지) */
export function groupBy(rows: TableRow[], column: string): RowGroup[] {
  const groups = new Map<string, TableRow[]>();
  for (const row of rows) {
    const key = row[column];
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  return [...groups].map(([key, groupRows]) => ({ key, rows: groupRows }));
}

export function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

/** "등급_성" 선택 칸 값 */
export function gradeStarValue(row: TableRow): string {
  return row.grade + GRADE_STAR_SEPARATOR + row.star;
}

/** 히어로 이름 → 캐릭터 표 첫 행 (이름 칸 charName 은 히어로 선택 담당이 만든다) */
export function heroByName(tables: StatTables, name: string | undefined): TableRow | undefined {
  const trimmed = (name ?? '').trim();
  return trimmed ? rowsOf(tables, 'Character').find((row) => row.name === trimmed) : undefined;
}
