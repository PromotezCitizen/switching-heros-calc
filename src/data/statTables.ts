/** 서버 수치표 (react/scripts/export_stat_tables.py 가 public/data/tables/<표 이름>.json 으로 내보냄) */
import { useMemo } from 'react';
import { useJsonData, useJsonFiles, type JsonLoadState } from './useJsonData';

/** 원본 표: 값은 전부 문자열 (비교는 문자열 그대로 한다 — 기존 HTML 과 같음) */
export interface RawTable {
  columns: string[];
  rows: string[][];
}
export type TableRow = Record<string, string>;
export type StatTables = Record<string, RawTable>;

const rowCache = new WeakMap<RawTable, TableRow[]>();

/** 표 → 행 객체 목록. 표마다 한 번만 만든다 */
export function tableRows(table: RawTable): TableRow[] {
  let rows = rowCache.get(table);
  if (!rows) {
    rows = table.rows.map((row) => Object.fromEntries(table.columns.map((column, index) => [column, row[index]])));
    rowCache.set(table, rows);
  }
  return rows;
}

/** 스탯 하나의 메타 정보 (statMeta.json 의 stats) */
export interface StatInfo {
  name: string;
  family: string;
  kind: string;
  desc?: string;
}

/** tables 를 뺀 나머지 (statMeta.json). 필요한 부분만 타입을 적었다 */
export interface StatMeta {
  stats: Record<string, StatInfo>;
  sources: Record<string, unknown>;
  masteryNames: Record<string, unknown>;
  labels: Record<string, unknown>;
  [key: string]: unknown;
}

export function useStatMeta(): JsonLoadState<StatMeta> {
  return useJsonData<StatMeta>('statMeta.json');
}

/** 필요한 표 이름만 받아 StatTables 로 돌려준다 */
export function useStatTables(names: readonly string[]): JsonLoadState<StatTables> {
  const files = useMemo(() => names.map((name) => `tables/${name}.json`), [names]);
  const state = useJsonFiles<RawTable>(files);
  return useMemo(() => {
    if (state.status !== 'ready') return state;
    return {
      status: 'ready',
      data: Object.fromEntries(names.map((name) => [name, state.data[`tables/${name}.json`]])),
    };
  }, [state, names]);
}
