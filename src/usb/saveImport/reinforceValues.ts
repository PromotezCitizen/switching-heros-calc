/** 저장 데이터 Reinforce → 베르 각성 · 특성 · 훈련 입력 칸 값 */
import { CONSTS } from '@/CONSTS';
import { tableRows, type StatTables } from '@/data/statTables';
import { groupBy, readDictionary, runSection, type SaveDictionary, type SaveImportResult } from '@/usb/saveImport/saveDictionary';

const { TRAINING_SHOWN_STATS } = CONSTS.usb;
/** 각성 표의 능력치 열 type1 ~ type6 */
const AWAKEN_STAT_COLUMN_PREFIX = 'type';

export interface ReinforceSave {
  awakenDatas: { awakenLv: number; statLvs: number[] };
  /** 프리셋 → (특성 번호 → 레벨 또는 { lv }) */
  masteryDatas: SaveDictionary<number, SaveDictionary<number, number | { lv: number }>>;
  trDatas: { grLv: number; statLvDic: SaveDictionary<string, number> };
}

export function reinforceValues(reinforce: ReinforceSave, presetKey: number, tables: StatTables): SaveImportResult {
  const values: Record<string, string> = {};
  const notes: string[] = [];

  // 베르 각성: 각성 레벨 행의 등급·별, 능력치별 레벨
  runSection(notes, '베르 각성', () => {
    const awaken = reinforce.awakenDatas;
    const awakenRow = tableRows(tables.Awaken).find((row) => row.awakenLv === String(awaken.awakenLv));
    if (!awakenRow) throw new Error(`계산기에 없는 각성 레벨이에요 (${awaken.awakenLv})`);
    values.awakenGrade = awakenRow.grade;
    values.awakenStar = awakenRow.star;
    awaken.statLvs.forEach((level, index) => {
      const stat = awakenRow[`${AWAKEN_STAT_COLUMN_PREFIX}${index + 1}`];
      if (stat) values[`awakenDetailLevel${stat}`] = String(level);
    });
  });

  // 특성: 쓰는 프리셋의 특성 번호별 레벨
  runSection(notes, '특성', () => {
    const masteries = readDictionary(reinforce.masteryDatas).get(presetKey);
    if (!masteries) throw new Error(`사용 중인 특성 프리셋(${presetKey})을 찾지 못했어요`);
    for (const [masteryNo, entry] of readDictionary(masteries)) {
      const level = typeof entry === 'number' ? entry : entry.lv;
      if (level) values[`mastery_${masteryNo}`] = String(level);
    }
  });

  // 훈련: 단계 = grLv + 1, 칸 레벨 = 그 능력치 누적 레벨 − 앞 단계들에서 다 채운 레벨
  runSection(notes, '훈련', () => {
    const training = reinforce.trDatas;
    values.trainingStage = String(training.grLv + 1);
    // 표의 능력치 이름 글자 크기가 섞여 있어 (_per_normal / _per_Normal) 소문자로 맞춘다
    const levelByStat = new Map<string, number>();
    for (const [stat, level] of readDictionary(training.statLvDic)) {
      const key = stat.toLowerCase();
      levelByStat.set(key, (levelByStat.get(key) ?? 0) + level);
    }
    const rowsByGrade = groupBy(tableRows(tables.Training), (row) => row.grade);
    const currentRows = (rowsByGrade.get(String(training.grLv)) ?? []).slice(0, TRAINING_SHOWN_STATS);
    currentRows.forEach((row, index) => {
      const stat = row.stat.toLowerCase();
      let finished = 0;
      for (let grade = 0; grade < training.grLv; grade += 1) {
        for (const done of rowsByGrade.get(String(grade)) ?? []) {
          if (done.stat.toLowerCase() === stat) finished += Number(done.maxLevel);
        }
      }
      values[`trainingLevel${index + 1}`] = String(Math.max((levelByStat.get(stat) ?? 0) - finished, 0));
    });
  });

  return { values, notes };
}
