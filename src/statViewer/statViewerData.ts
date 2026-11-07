/** 스탯 모아 보기: statMeta.json (출처 · 스탯 · 계열) 과 수치표를 화면용으로 묶고 글로 바꾼다 */
import { CONSTS } from '@/CONSTS';
import { formatLog } from '@/calc/gameNumber';
import type { RawTable } from '@/data/statTables';

const {
  GRADE_ORDER,
  GRADE_RANGE_SEPARATOR,
  ASCENDING_TABLES,
  UNIT_FROM,
  PLAIN_MAX_DECIMALS,
  DEFAULT_LEVEL_FORMAT,
  LEVEL_PLACEHOLDER,
  VALUE_PLACEHOLDERS,
} = CONSTS.statViewer;
const RATIO_PREFIX = '×';
const RANGE_SEPARATOR = ' ~ ';
const LEVEL_RANGE_SEPARATOR = '~';
const VALUE_SEPARATOR = ', ';
const EMPTY_TEXT = '-';
const NUMBER_PATTERN = /^-?\d+(\.\d+)?(E[+-]?\d+)?$/i;
const RAW_KEY_SEPARATOR = '\u0001';

/** [등급, 레벨, 값] */
export type ValuePoint = [string, number, number];
export type SortDirection = 'asc' | 'desc';

export interface ViewerStat {
  name: string;
  family: string;
  kind: string;
  /** [갈래, 표시 글] */
  tags: [string, string][];
  desc?: string;
}

/** 출처 하나 = 표 × 대상 × 스탯 */
export interface ViewerSource {
  table: string;
  entity: string;
  grade: string;
  stat: string;
  rows: number[];
  columns: string[];
  memberColumns?: string[];
  levelMin: number | null;
  levelMax: number | null;
  first: number;
  last: number | null;
  perLevel: number | null;
  formula: string;
  points?: ValuePoint[];
  ratio?: boolean;
}

export interface ViewerFamily {
  label: string;
  stats: string[];
  sourceCount: number;
}

export interface ExcludedStat {
  name: string;
  desc?: string;
  combine: string;
}

export interface ViewerMeta {
  stats: Record<string, ViewerStat>;
  families: Record<string, ViewerFamily>;
  sources: ViewerSource[];
  excluded: ExcludedStat[];
  unrelated: ExcludedStat[];
}

/** 수치표 JSON 의 표시용 칸 (label · 레벨 표기 · 열 이름) */
export interface ViewerTable extends RawTable {
  label: string;
  levelFormat: string | null;
  columnLabels: Record<string, string>;
  unresolved?: boolean;
}
export type ViewerTables = Record<string, ViewerTable>;

/** 숫자 → 화면 글. 1만 미만은 그대로, 그 위는 게임 단위 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return EMPTY_TEXT;
  if (Math.abs(value) < UNIT_FROM) return value.toLocaleString('ko-KR', { maximumFractionDigits: PLAIN_MAX_DECIMALS });
  return (value < 0 ? '-' : '') + formatLog(Math.log10(Math.abs(value)));
}

export function formatRange(first: number | null, last: number | null): string {
  if (last === null || last === undefined || last === first) return formatNumber(first);
  return formatNumber(first) + RANGE_SEPARATOR + formatNumber(last);
}

export function formatLevels(source: ViewerSource): string {
  if (source.levelMin === null && source.levelMax === null) return EMPTY_TEXT;
  return formatRange(source.levelMin, source.levelMax);
}

function levelText(table: ViewerTable | undefined, levels: string): string {
  return (table?.levelFormat || DEFAULT_LEVEL_FORMAT).replace(LEVEL_PLACEHOLDER, levels);
}

export function gradeRank(grade: string | undefined): number {
  return GRADE_ORDER.indexOf(String(grade ?? '').split(GRADE_RANGE_SEPARATOR)[0]);
}

/** 설명 글의 값 자리 ({0}, {1}) 를 N, M 으로 */
export function descriptionText(desc: string): string {
  return VALUE_PLACEHOLDERS.reduce((text, [placeholder, shown]) => text.split(placeholder).join(shown), desc);
}

export function statLabel(meta: ViewerMeta, name: string): string {
  const desc = meta.stats[name]?.desc;
  return desc ? descriptionText(desc) : name;
}

export function defaultSortDirection(table: string): SortDirection {
  return ASCENDING_TABLES.includes(table) ? 'asc' : 'desc';
}

interface ValueRun {
  from: number;
  to: number;
  value: number;
}

/** 연속으로 같은 값은 레벨 범위 하나로 */
function valueRuns(points: ValuePoint[]): ValueRun[] {
  const runs: ValueRun[] = [];
  for (const [, level, value] of points) {
    const last = runs[runs.length - 1];
    if (last && last.value === value) last.to = level;
    else runs.push({ from: level, to: level, value });
  }
  return runs;
}

/**
 * 값 칸 글 (줄 목록). 등급이 여러 개면 등급마다 한 줄, 같은 값 연속은 묶음: "SSS: ×6(27단계), ×7(28~34단계)".
 * 레벨별 값이 없으면 1레벨 ~ 최대 값
 */
export function formatValues(source: ViewerSource, table: ViewerTable | undefined, direction: SortDirection): string[] {
  const prefix = source.ratio ? RATIO_PREFIX : '';
  if (!source.points) return [prefix + formatRange(source.first, source.last)];
  const byGrade = new Map<string, ValuePoint[]>();
  for (const point of source.points) {
    const list = byGrade.get(point[0]);
    if (list) list.push(point);
    else byGrade.set(point[0], [point]);
  }
  const sign = direction === 'asc' ? 1 : -1;
  const grades = [...byGrade.keys()].sort((left, right) => (gradeRank(left) - gradeRank(right)) * sign);
  return grades.map((grade) => {
    const values = valueRuns(byGrade.get(grade) ?? [])
      .map((run) => {
        const levels = run.from === run.to ? formatNumber(run.from) : formatNumber(run.from) + LEVEL_RANGE_SEPARATOR + formatNumber(run.to);
        return `${prefix}${formatNumber(run.value)}(${levelText(table, levels)})`;
      })
      .join(VALUE_SEPARATOR);
    return grades.length > 1 ? `${grade}: ${values}` : values;
  });
}

/** 출처를 계열 · 필터로 고르고 표 × 스탯으로 묶는다 (첫 등장 순서) */
export function groupSources(
  sources: ViewerSource[],
  stats: Record<string, ViewerStat>,
  kinds: readonly string[],
  tagTypes: readonly string[],
): { key: string; list: ViewerSource[] }[] {
  const groups = new Map<string, ViewerSource[]>();
  for (const source of sources) {
    const info = stats[source.stat];
    if (!kinds.includes(info.kind) || !info.tags.some(([type]) => tagTypes.includes(type))) continue;
    const key = `${source.table}|${source.stat}`;
    const list = groups.get(key);
    if (list) list.push(source);
    else groups.set(key, [source]);
  }
  return [...groups].map(([key, list]) => ({ key, list }));
}

/** 묶음의 값 범위와 펼쳐 볼 내용이 있는지 */
export function groupRange(list: ViewerSource[]): { low: number; high: number; allSame: boolean } {
  const low = Math.min(...list.map((source) => source.first));
  const high = Math.max(...list.map((source) => source.last ?? source.first));
  return { low, high, allSame: low === high && list.every((source) => !source.perLevel) };
}

/** 값이 전부 같은 묶음의 설명: 레벨 범위 전부 같음 / 대상 N개 같음 / 없음 */
export function sameValueRange(
  list: ViewerSource[],
  table: ViewerTable | undefined,
): { type: 'levels'; from: string; to: string } | { type: 'count'; count: number } | null {
  const levels = list.flatMap((source) => [source.levelMin, source.levelMax]).filter((level): level is number => level !== null);
  const lowest = Math.min(...levels);
  const highest = Math.max(...levels);
  if (!levels.length || lowest === highest) return list.length > 1 ? { type: 'count', count: list.length } : null;
  return { type: 'levels', from: levelText(table, formatNumber(lowest)), to: levelText(table, formatNumber(highest)) };
}

/** 등급 하나에 값 하나뿐인 줄 (예: 모든 단계 ×3) */
function isUniform(source: ViewerSource): boolean {
  if (!source.points) return false;
  return new Set(source.points.map((point) => point[0])).size === 1 && valueRuns(source.points).length === 1;
}

/** "베르 각성 R 등급" + "베르 각성 MAX8 등급" → "베르 각성 R ~ MAX8 등급" (공통 앞뒤는 단어 단위로 한 번만) */
export function rangeLabel(first: string, last: string): string {
  let start = 0;
  let end = 0;
  while (start < first.length && start < last.length && first[start] === last[start]) start++;
  while (start > 0 && first[start - 1] !== ' ') start--;
  while (end < first.length - start && end < last.length - start && first[first.length - 1 - end] === last[last.length - 1 - end]) end++;
  while (end > 0 && first[first.length - end] !== ' ') end--;
  return first.slice(0, first.length - end) + RANGE_SEPARATOR + last.slice(start, last.length - end) + first.slice(first.length - end);
}

/** 정렬 순서로 이웃한 줄이 같은 값 하나로만 이뤄져 있으면 한 줄로 묶는다 */
function mergeNeighbors(sorted: ViewerSource[], table: ViewerTable | undefined): ViewerSource[] {
  const groups: { uniform: boolean; members: ViewerSource[] }[] = [];
  for (const source of sorted) {
    const previous = groups[groups.length - 1];
    const uniform = isUniform(source);
    if (previous && uniform && previous.uniform && previous.members[0].points?.[0][2] === source.points?.[0][2]) {
      previous.members.push(source);
      continue;
    }
    groups.push({ uniform, members: [source] });
  }
  return groups.map(({ members }) => {
    if (members.length === 1) return members[0];
    const first = members[0];
    const last = members[members.length - 1];
    const columns = [...new Set(members.flatMap((member) => member.columns))];
    if (table?.columns.includes('grade') && !columns.includes('grade')) columns.unshift('grade');
    const points = members
      .flatMap((member) => (member.points ?? []).map((point): ValuePoint => ['', point[1], point[2]]))
      .sort((left, right) => left[1] - right[1]);
    const levels = points.map((point) => point[1]);
    return {
      ...first,
      entity: rangeLabel(first.entity, last.entity),
      grade: first.grade + GRADE_RANGE_SEPARATOR + last.grade,
      levelMin: Math.min(...levels),
      levelMax: Math.max(...levels),
      points,
      rows: members.flatMap((member) => member.rows),
      columns,
      memberColumns: [],
    };
  });
}

export type EntityColumn = 'grade' | 'levels' | 'values' | 'perLevel' | 'formula';
const ENTITY_COLUMNS: readonly EntityColumn[] = ['grade', 'levels', 'values', 'perLevel', 'formula'];

export interface EntityRow {
  source: ViewerSource;
  cells: Record<EntityColumn, string[]>;
  /** 원본 버튼: 값 칸을 범위로 줄인 줄 (레벨별 값이 여러 행) 에만. 값 목록 · 계산식 줄은 원본 내용이 다 나와 있음 */
  hasRaw: boolean;
}

/** 대상별 표: 등급 순 정렬 → 이웃 묶기 → 칸 글. 모든 줄이 같은 열은 숨긴다 (값 열은 항상) */
export function entityRows(
  list: ViewerSource[],
  table: ViewerTable | undefined,
  direction: SortDirection,
): { rows: EntityRow[]; columns: EntityColumn[] } {
  const sign = direction === 'asc' ? 1 : -1;
  const sorted = [...list].sort((left, right) => (gradeRank(left.grade) - gradeRank(right.grade)) * sign);
  const rows = mergeNeighbors(sorted, table).map((source): EntityRow => ({
    source,
    cells: {
      grade: [source.grade || EMPTY_TEXT],
      levels: [formatLevels(source)],
      values: formatValues(source, table, direction),
      perLevel: [formatNumber(source.perLevel)],
      formula: [source.formula],
    },
    hasRaw:
      !source.points && source.perLevel == null && source.levelMin != null && source.levelMax != null && source.rows.length > 1,
  }));
  const columns = ENTITY_COLUMNS.filter(
    (column) =>
      column === 'values' || rows.length === 1 || rows.some((row) => row.cells[column].join() !== rows[0].cells[column].join()),
  );
  return { rows, columns };
}

/** 원본 칸 숫자도 화면과 같은 단위 표기. 1e308 을 넘는 값 (예: 1.00E+499) 은 글 그대로 */
function formatCell(cell: string): string {
  if (!NUMBER_PATTERN.test(cell)) return cell;
  const value = Number(cell);
  return isFinite(value) ? formatNumber(value) : cell;
}

/**
 * 원본 표. memberColumns (묶인 대상을 구분하는 열: charId, name 등) 는 대상 칸에 이미 나오므로 숨기고,
 * 그 열만 다르던 행은 한 행으로 합친다. rowIndexes 가 없으면 표 전체
 */
export function rawRows(
  table: ViewerTable,
  rowIndexes?: number[],
  columns?: string[],
  memberColumns?: string[],
): { headers: string[]; rows: string[][] } {
  const rows = rowIndexes ? rowIndexes.map((index) => table.rows[index]).filter(Boolean) : table.rows;
  const shownColumns = (columns ?? table.columns).filter((column) => !(memberColumns ?? []).includes(column));
  const columnIndexes = shownColumns.map((column) => table.columns.indexOf(column));
  const seen = new Set<string>();
  const merged: string[][] = [];
  for (const row of rows) {
    const cells = columnIndexes.map((index) => String(row[index] ?? ''));
    const key = cells.join(RAW_KEY_SEPARATOR);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(cells.map(formatCell));
  }
  return { headers: shownColumns.map((column) => table.columnLabels[column] || column), rows: merged };
}

/** 계열 검색: 계열 이름 · 키 · 소속 스탯 이름 · 설명 */
export function familyMatches(meta: ViewerMeta, key: string, search: string): boolean {
  if (!search) return true;
  const query = search.toLowerCase();
  const family = meta.families[key];
  return (
    family.label.toLowerCase().includes(query) ||
    key.toLowerCase().includes(query) ||
    family.stats.some((name) => name.toLowerCase().includes(query) || statLabel(meta, name).toLowerCase().includes(query))
  );
}
