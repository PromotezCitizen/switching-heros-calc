/** 저장 데이터 Progress (도감 · 칭호) · Alchemy (연성) → 표를 합쳐 계산한 화면 값 칸 */
import { CONSTS } from '@/CONSTS';
import { groupBy, readDictionary, runSection, type SaveDictionary, type SaveImportResult } from '@/usb/saveImport/saveDictionary';
import { tableRows, type StatTables } from '@/data/statTables';
import { multiplierLogFromPercent, percentTextFromMultiplierLog } from '@/usb/saveImport/saveText';

const { ATTACK_PERCENT_STAT, HP_PERCENT_STAT, ALCHEMY_ALL_PARTS, ALCHEMY_SUM_FIELDS, ALCHEMY_SUM_DECIMALS, ALCHEMY_PART_FIELDS } = CONSTS.usb;

export interface CollectionProgress {
  collectionDic: SaveDictionary<number, number>;
  titleData: { obtainList: number[] };
}

export interface AlchemySave {
  /** 장착 아이템: uTypes2 · uValues = 보조 능력치, pValues = [공격력 %, 체력 %, …] */
  equipItemDic: SaveDictionary<number, { rarity: number; uTypes2: string[]; uValues: number[]; pValues: number[] }>;
  slotData: { slotLvDic: SaveDictionary<number, number> };
}

export function collectionValues(progress: CollectionProgress, alchemy: AlchemySave, tables: StatTables): SaveImportResult {
  const values: Record<string, string> = {};
  const notes: string[] = [];

  // 도감: 수집 항목마다 지금 레벨 행의 공격력 · 체력 % 를 곱함
  runSection(notes, '도감', () => {
    const collectionRows = groupBy(tableRows(tables.Collection), (row) => row.collectId);
    const collected = [...readDictionary(progress.collectionDic)];
    for (const [stat, field] of [
      [ATTACK_PERCENT_STAT, 'encyclopediaAtk'],
      [HP_PERCENT_STAT, 'encyclopediaHp'],
    ]) {
      let log = 0;
      for (const [collectId, level] of collected) {
        for (const row of collectionRows.get(String(collectId)) ?? []) {
          if (Number(row.level) === level && row.stat_type === stat) log += multiplierLogFromPercent(Number(row.stat_value));
        }
      }
      values[field] = percentTextFromMultiplierLog(log);
    }
  });

  // 칭호: 얻은 칭호의 공격력 · 체력 % 를 곱함
  runSection(notes, '칭호', () => {
    const titleRows = new Map(tableRows(tables.Title).map((row) => [row.titleId, row]));
    for (const [stat, field] of [
      [ATTACK_PERCENT_STAT, 'titleAtk'],
      [HP_PERCENT_STAT, 'titleHp'],
    ]) {
      const log = progress.titleData.obtainList.reduce((sum, titleId) => {
        const row = titleRows.get(String(titleId));
        return row && row.statType === stat ? sum + multiplierLogFromPercent(Number(row.statVal)) : sum;
      }, 0);
      values[field] = percentTextFromMultiplierLog(log);
    }
  });

  runSection(notes, '아티팩트', () => alchemyTotals(alchemy, tables, values, notes));

  return { values, notes };
}

/** 연성: 슬롯 단계 (가장 낮은 슬롯 기준) 까지의 부위 % · 세트 %, 장착 아이템 공격력 · 체력 %, 보조 능력치 합 */
function alchemyTotals(alchemy: AlchemySave, tables: StatTables, values: Record<string, string>, notes: string[]): void {
  const slotRows = tableRows(tables.AlchemySlot);
  const slotLevels = [...readDictionary(alchemy.slotData.slotLvDic).values()];
  const minSlot = Math.min(...slotLevels);
  if (new Set(slotLevels).size > 1) notes.push(`아티팩트 슬롯 단계가 서로 달라서 가장 낮은 ${minSlot}단계로 계산했어요`);
  const partLogByStat = new Map<string, number>();
  const parts = [...new Set(slotRows.map((row) => row.parts))].filter((part) => part !== ALCHEMY_ALL_PARTS).sort();
  for (const part of parts) {
    const rows = slotRows.filter((row) => row.parts === part && Number(row.lv) <= minSlot);
    if (rows.length === 0) continue;
    partLogByStat.set(rows[0].statType, rows.reduce((sum, row) => sum + multiplierLogFromPercent(Number(row.statValue)), 0));
  }
  const setLogByStat = new Map<string, number>();
  for (const row of slotRows) {
    if (row.parts !== ALCHEMY_ALL_PARTS || Number(row.enhCostVal) > minSlot) continue;
    setLogByStat.set(row.statType, (setLogByStat.get(row.statType) ?? 0) + multiplierLogFromPercent(Number(row.statValue)));
  }
  const items = [...readDictionary(alchemy.equipItemDic).values()];
  const subStatSums = new Map<string, number>();
  for (const item of items) {
    item.uTypes2.forEach((stat, index) => subStatSums.set(stat, (subStatSums.get(stat) ?? 0) + item.uValues[index]));
  }
  const { ALCHEMY_ITEM_ATTACK_INDEX: attackIndex, ALCHEMY_ITEM_HP_INDEX: hpIndex } = CONSTS.usb;
  const itemLog = (index: number) => items.reduce((sum, item) => sum + multiplierLogFromPercent(item.pValues[index]), 0);
  values.artifactTotalAtk = percentTextFromMultiplierLog(
    itemLog(attackIndex) + (partLogByStat.get(ATTACK_PERCENT_STAT) ?? 0) + (setLogByStat.get(ATTACK_PERCENT_STAT) ?? 0),
  );
  values.artifactTotalHp = percentTextFromMultiplierLog(
    itemLog(hpIndex) + (partLogByStat.get(HP_PERCENT_STAT) ?? 0) + (setLogByStat.get(HP_PERCENT_STAT) ?? 0),
  );
  // 같은 등급 (rarity 숫자 그대로) 이 가장 많은 등급의 개수: 얼티밋 균형의 완성 · 완전한 세트 조건 (게임 코드 m2687)
  const gradeCounts = new Map<number, number>();
  for (const item of items) if (Number.isFinite(item.rarity)) gradeCounts.set(item.rarity, (gradeCounts.get(item.rarity) ?? 0) + 1);
  values[CONSTS.masteryRuneBuff.ALCHEMY_SAME_GRADE_FIELD] = String(Math.max(0, ...gradeCounts.values()));
  for (const [field, stat] of Object.entries(ALCHEMY_SUM_FIELDS)) {
    values[field] = (subStatSums.get(stat) ?? 0).toFixed(ALCHEMY_SUM_DECIMALS);
  }
  for (const [field, stat] of Object.entries(ALCHEMY_PART_FIELDS)) {
    const log = partLogByStat.get(stat);
    if (log === undefined) notes.push('아티팩트 슬롯 정보에 없는 능력치가 있어서 그 값은 뺐어요');
    else values[field] = percentTextFromMultiplierLog(log);
  }
}
