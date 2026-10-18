/**
 * 저장 데이터 Relic · Card (+ Dispatch 파견 레벨, Progress 던전 기록) → 유물 · 유물 연동 · 몬스터 카드 입력 칸 값.
 * 유물 연동 칸 (relicLink_*) 이 파견·던전·카드 값을 같이 써서 한 곳에서 만든다.
 */
import { CONSTS } from '@/CONSTS';
import { tableRows, type StatTables } from '@/data/statTables';
import { groupBy, readDictionary, runSection, type SaveDictionary, type SaveImportResult } from '@/usb/saveImport/saveDictionary';

const { RELIC_LINK_DUNGEONS, CARD_GRADE_R, CARD_GRADE_SSR } = CONSTS.usb;
const DECIMAL_BASE = 10;

export interface RelicSave {
  relicData: { relicGrade: number; relicDic: SaveDictionary<number, number> };
}

export interface CardSave {
  cardDic: SaveDictionary<number, { trsc: number; presetDic: SaveDictionary<number, { slotIdx: number; setEquipList: number[] }> }>;
}

/** 던전 최고 기록: 큰 수는 { value, exponent } */
type DungeonRecord = number | { value: number; exponent: number };

export interface DungeonProgress {
  dungeonDataDic: SaveDictionary<number, { recordValue: DungeonRecord }>;
}

export function relicCardValues(
  relic: RelicSave,
  card: CardSave,
  dispatchLevel: number | undefined,
  progress: DungeonProgress,
  presetKey: number,
  tables: StatTables,
): SaveImportResult {
  const values: Record<string, string> = {};
  const notes: string[] = [];

  // 유물: 최고 등급 (표에 나오는 등급 순서의 relicGrade 번째), 유물별 레벨
  runSection(notes, '유물', () => {
    const grades = [...new Set(tableRows(tables.Relic).map((row) => row.grade))];
    const maxGrade = grades[relic.relicData.relicGrade - 1];
    if (maxGrade) values.relicMaxGrade = maxGrade;
    else notes.push(`알 수 없는 유물 등급이에요 (${relic.relicData.relicGrade})`);
    for (const [relicId, level] of readDictionary(relic.relicData.relicDic)) {
      if (level) values[`relic_${relicId}`] = String(level);
    }
  });

  // 유물 연동: 파견 레벨, 던전 최고 기록
  runSection(notes, '유물 연동 (파견 레벨)', () => {
    if (typeof dispatchLevel !== 'number') throw new Error('파견 레벨을 찾지 못했어요');
    values.relicLink_dispatchLevel = String(dispatchLevel);
  });
  runSection(notes, '유물 연동 (던전 기록)', () => {
    const dungeons = readDictionary(progress.dungeonDataDic);
    for (const [dungeonKey, field] of Object.entries(RELIC_LINK_DUNGEONS)) {
      const record = dungeons.get(Number(dungeonKey))?.recordValue;
      if (record === undefined) continue;
      values[`relicLink_${field}`] =
        typeof record === 'number' ? String(record) : String(Math.round(record.value * Math.pow(DECIMAL_BASE, record.exponent)));
    }
  });

  // 몬스터 카드: 쓰는 프리셋의 슬롯 카드·등급·세트 선택, 세트 점수 합, R · SSR 보유 수
  runSection(notes, '몬스터 카드', () => {
    const cardRows = groupBy(tableRows(tables.Card), (row) => row.cardId);
    const gradeCounts = new Map<string, number>();
    let setPoint = 0;
    for (const [cardId, owned] of readDictionary(card.cardDic)) {
      const row = cardRows.get(String(cardId))?.find((candidate) => candidate.star === String(owned.trsc));
      if (!row) {
        notes.push(`계산기에 없는 카드예요 (번호 ${cardId}, ★${owned.trsc})`);
        continue;
      }
      gradeCounts.set(row.grade, (gradeCounts.get(row.grade) ?? 0) + 1);
      const slotInfo = readDictionary(owned.presetDic).get(presetKey);
      if (!slotInfo?.slotIdx) continue;
      const slot = slotInfo.slotIdx;
      values[`cardSlot${slot}`] = String(cardId);
      values[`cardSlotGrade${slot}`] = `${row.grade}_${row.star}`;
      setPoint += Number(row.setPoint);
      slotInfo.setEquipList.forEach((setId, index) => {
        values[`cardSetPick${slot}_${index + 1}`] = String(setId);
      });
    }
    values.relicLink_cardSetBonus = String(setPoint);
    values.relicLink_rCards = String(gradeCounts.get(CARD_GRADE_R) ?? 0);
    values.relicLink_ssrCards = String(gradeCounts.get(CARD_GRADE_SSR) ?? 0);
  });

  return { values, notes };
}
