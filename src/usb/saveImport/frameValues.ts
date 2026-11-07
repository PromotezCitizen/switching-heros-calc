/**
 * 저장 데이터 Relic 의 보유 테두리 목록 (frameIdList) → 테두리 보유 칸 (frameOwned_<번호>).
 * 표 Frame 에 있는 테두리는 안 가진 것도 꺼짐 (false) 으로 적어, 전에 가져온 값이 남지 않게 한다
 */
import { CONSTS } from '@/CONSTS';
import { tableRows, type StatTables } from '@/data/statTables';
import { frameOwnedField } from '@/calc/sources/providers/frame';
import { runSection, type SaveImportResult } from '@/usb/saveImport/saveDictionary';

const { TABLE, ID_COLUMN } = CONSTS.providers.frame;

export interface FrameSave {
  /** 5.70 이전 저장에는 없다 */
  frameIdList?: number[];
}

export function frameValues(relic: FrameSave, tables: StatTables): SaveImportResult {
  const values: Record<string, string> = {};
  const notes: string[] = [];
  runSection(notes, '테두리', () => {
    const owned = new Set((relic.frameIdList ?? []).map(String));
    const known = tables[TABLE] ? tableRows(tables[TABLE]).map((row) => row[ID_COLUMN]) : [];
    for (const frameId of new Set([...known, ...owned])) values[frameOwnedField(frameId)] = String(owned.has(frameId));
  });
  return { values, notes };
}
