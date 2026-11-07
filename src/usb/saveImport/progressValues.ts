/**
 * 저장 데이터에서 전에는 안 읽던 진행 값: 소울포지 (Equip.soulForgeData), 코어 특성 레벨 (Reinforce.coreMasteryLv), 피규어 레벨 (Relic.figureDic).
 * 없는 값은 칸을 비우거나 꺼서 (전에 가져온 값이 남지 않게) 5.70 이전 저장도 오류 없이 지나간다
 */
import { CONSTS } from '@/CONSTS';
import { tableRows, type StatTables } from '@/data/statTables';
import { SOUL_FORGE_FIELD, soulForgeSlotField } from '@/calc/sources/heroWeaponCardPet/weapon';
import { readDictionary, runSection, type SaveDictionary, type SaveImportResult } from '@/usb/saveImport/saveDictionary';

const { LEVEL_FIELD: CORE_MASTERY_LEVEL_FIELD } = CONSTS.providers.coreMastery;
const { LEVEL_FIELD_PREFIX: FIGURE_LEVEL_PREFIX } = CONSTS.providers.figure;

export interface SoulForgeSave {
  soulForgeData?: { lv: number; slotDataDic: SaveDictionary<number, { isGet?: number }> };
}
export interface CoreMasterySave {
  coreMasteryLv?: number;
}
export interface FigureSave {
  figureDic?: SaveDictionary<number, number | { lv?: number }>;
}

/** 소울포지: 레벨, 얻은 (켠) 슬롯 번호. 표에 있는 슬롯 번호는 안 켠 것도 꺼짐으로 적는다 */
export function soulForgeValues(equip: SoulForgeSave, tables: StatTables): SaveImportResult {
  const values: Record<string, string> = {};
  const notes: string[] = [];
  runSection(notes, '소울포지', () => {
    const data = equip.soulForgeData;
    if (!data) return;
    values[SOUL_FORGE_FIELD] = String(data.lv);
    const active = new Set(
      [...readDictionary(data.slotDataDic)].filter(([, slot]) => (slot.isGet ?? 1) > 0).map(([slotIdx]) => String(slotIdx)),
    );
    const known = tables.SoulForge ? tableRows(tables.SoulForge).map((row) => row.statIdx).filter((statIdx) => Number(statIdx) >= 1) : [];
    for (const slotIdx of new Set([...known, ...active])) values[soulForgeSlotField(slotIdx)] = String(active.has(slotIdx));
  });
  return { values, notes };
}

/** 코어 특성 레벨 (켠 항목은 저장 구조의 대응이 확인되지 않아 직접 입력) */
export function coreMasteryValues(reinforce: CoreMasterySave): SaveImportResult {
  const values: Record<string, string> = {};
  if (typeof reinforce.coreMasteryLv === 'number') values[CORE_MASTERY_LEVEL_FIELD] = String(reinforce.coreMasteryLv);
  return { values, notes: [] };
}

/** 피규어 레벨 (figureDic: 피규어 번호 → 레벨) */
export function figureValues(relic: FigureSave): SaveImportResult {
  const values: Record<string, string> = {};
  const notes: string[] = [];
  runSection(notes, '피규어', () => {
    if (!relic.figureDic) return;
    for (const [figureId, owned] of readDictionary(relic.figureDic)) {
      const level = typeof owned === 'number' ? owned : owned.lv;
      if (level) values[`${FIGURE_LEVEL_PREFIX}${figureId}`] = String(level);
    }
  });
  return { values, notes };
}
