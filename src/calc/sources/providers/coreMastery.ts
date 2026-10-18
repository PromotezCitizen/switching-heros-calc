/**
 * 코어 특성 → 효과 줄 (제공자 T1271 m6818 @306a8c8, claude-docs/react-port/stat-provider-formulas.md 10-4절).
 * 코어 특성 레벨의 표 CoreMastery 행에서, 켠 항목 k (1 ~ 13) 마다 k 번째 스탯 · 값을 한 번씩 넣는다.
 * 이 계정 값이 비어 있어 화면 대조는 못 했다 (구조 확정, 필드 이름 대응 유력)
 */
import { CONSTS } from '@/CONSTS';
import { tableRows, type StatTables, type TableRow } from '@/data/statTables';
import type { Line } from '@/calc/combine';
import type { CalcValues } from '@/calc/types';
import type { SourceLabel } from '@/calc/sources/heroWeaponCardPet/shared';

const { EMPTY_STATS } = CONSTS.providers;
const { TABLE, LEVEL_FIELD, SELECT_FIELD_PREFIX, SLOT_COUNT, LEVEL_COLUMN, STAT_COLUMN_PREFIX, VALUE_COLUMN_PREFIX } =
  CONSTS.providers.coreMastery;

export const CORE_MASTERY_SLOT_NUMBERS = Array.from({ length: SLOT_COUNT }, (_, index) => index + 1);

export function coreMasterySelectField(slot: number): string {
  return `${SELECT_FIELD_PREFIX}${slot}`;
}

/** 코어 특성 레벨 (정수, 비었으면 0 = 입력 전) */
export function coreMasteryLevel(values: CalcValues): number {
  return Math.max(Math.floor(Number(values[LEVEL_FIELD]) || 0), 0);
}

/** 표의 최대 레벨 */
export function maxCoreMasteryLevel(tables: StatTables): number {
  const table = tables[TABLE];
  return table ? tableRows(table).reduce((max, row) => Math.max(max, Number(row[LEVEL_COLUMN])), 0) : 0;
}

/** 그 레벨의 표 행 (없으면 undefined) */
export function coreMasteryRow(tables: StatTables, level: number): TableRow | undefined {
  const table = tables[TABLE];
  return level >= 1 && table ? tableRows(table).find((row) => Number(row[LEVEL_COLUMN]) === level) : undefined;
}

/** 행의 k 번째 항목 (스탯 이름 · 값). 스탯이 없음이면 undefined */
export function coreMasterySlot(row: TableRow, slot: number): { stat: string; value: number } | undefined {
  const stat = row[`${STAT_COLUMN_PREFIX}${slot}`];
  if (!stat || EMPTY_STATS.includes(stat)) return undefined;
  return { stat, value: Number(row[`${VALUE_COLUMN_PREFIX}${slot}`]) || 0 };
}

export function coreMasteryLines(values: CalcValues, tables: StatTables, label: SourceLabel): Line[] {
  const level = coreMasteryLevel(values);
  const row = coreMasteryRow(tables, level);
  if (!row) return [];
  const lines: Line[] = [];
  for (const slot of CORE_MASTERY_SLOT_NUMBERS) {
    if (values[coreMasterySelectField(slot)] !== 'true') continue;
    const item = coreMasterySlot(row, slot);
    if (item && item.value) {
      lines.push({ source: label('calc.coreMastery.source', { level, slot }), stat: item.stat, value: item.value });
    }
  }
  return lines;
}
