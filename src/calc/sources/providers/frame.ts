/**
 * 프로필 테두리 보유 효과 → 효과 줄 (5.70 새 제공자 새 @30d69f0, claude-docs/react-port/attack-formula-5.70.md).
 * 보유한 테두리 (칸 frameOwned_<번호> 가 켜짐) 마다 표 Frame 의 (스탯, 값) 을 한 번씩 넣는다 (스탯 없음이거나 값 0 이면 건너뜀)
 */
import { CONSTS } from '@/CONSTS';
import { tableRows, type StatTables, type TableRow } from '@/data/statTables';
import type { Line } from '@/calc/combine';
import type { CalcValues } from '@/calc/types';
import type { SourceLabel } from '@/calc/sources/heroWeaponCardPet/shared';

const { EMPTY_STATS } = CONSTS.providers;
const { TABLE, OWNED_FIELD_PREFIX, ID_COLUMN, STAT_COLUMN, VALUE_COLUMN } = CONSTS.providers.frame;

export function frameOwnedField(frameId: string): string {
  return `${OWNED_FIELD_PREFIX}${frameId}`;
}

/** 효과가 있는 테두리 행 (표 순서) */
export function frameRows(tables: StatTables): TableRow[] {
  const table = tables[TABLE];
  return table ? tableRows(table).filter((row) => !EMPTY_STATS.includes(row[STAT_COLUMN]) && Number(row[VALUE_COLUMN]) > 0) : [];
}

export function frameLines(values: CalcValues, tables: StatTables, label: SourceLabel): Line[] {
  return frameRows(tables)
    .filter((row) => values[frameOwnedField(row[ID_COLUMN])] === 'true')
    .map((row) => ({
      source: label('calc.frame.source', { frame: row[ID_COLUMN] }),
      stat: row[STAT_COLUMN],
      value: Number(row[VALUE_COLUMN]),
    }));
}
