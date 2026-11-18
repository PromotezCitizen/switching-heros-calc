/**
 * 코인 파워 → 효과 줄. 코인 레벨의 CoinPower 행에서 (스탯, 값) 2쌍 (공격력, 체력) 을 한 번씩 넣는다.
 * 레벨 0 이나 빈 칸은 줄 없음. 값이 1E+308 을 넘는 행이 있어 줄은 log 로 만든다
 */
import { CONSTS } from '@/CONSTS';
import { tableRows, type StatTables, type TableRow } from '@/data/statTables';
import type { Line } from '@/calc/combine';
import type { CalcValues } from '@/calc/types';
import type { SourceLabel } from '@/calc/sources/heroWeaponCardPet/shared';

const { TABLE, LEVEL_FIELD, LEVEL_COLUMN, STAT_PAIRS } = CONSTS.providers.coinPower;

/** 표 값 문자열 ("3.5", "4.10890219118287E+365") → log10. 0 이하이거나 읽을 수 없으면 null */
export function tableValueLog(text: string): number | null {
  const [mantissa, exponent = '0'] = text.trim().toUpperCase().split('E');
  const number = Number(mantissa);
  if (!(number > 0)) return null;
  return Math.log10(number) + Number(exponent);
}

export function coinPowerMaxLevel(tables: StatTables): number {
  const table = tables[TABLE];
  return table ? tableRows(table).length : 0;
}

export function coinPowerRow(values: CalcValues, tables: StatTables): TableRow | null {
  const table = tables[TABLE];
  const level = values[LEVEL_FIELD];
  if (!table || !level) return null;
  return tableRows(table).find((row) => row[LEVEL_COLUMN] === String(Number(level))) ?? null;
}

export function coinPowerLines(values: CalcValues, tables: StatTables, label: SourceLabel): Line[] {
  const row = coinPowerRow(values, tables);
  if (!row) return [];
  const source = label('calc.coinPower.source', { level: row[LEVEL_COLUMN] });
  return STAT_PAIRS.flatMap(([statColumn, valueColumn]) => {
    const log = tableValueLog(row[valueColumn]);
    return log === null ? [] : [{ source, stat: row[statColumn], log }];
  });
}
