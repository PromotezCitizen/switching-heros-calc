/**
 * 저장 데이터 Dispatch 의 별자리 유물 (ancientRelicData) → 입력 칸 ancientMastered (달성한 별자리 번호) · ancientProgress (진행 중 별자리의 단계·칸 레벨).
 * 5.70 이전 저장에는 없어 그럴 땐 칸을 비운다 (전에 가져온 값이 남지 않게)
 */
import { CONSTS } from '@/CONSTS';
import { readDictionary, runSection, type SaveDictionary, type SaveImportResult } from '@/usb/saveImport/saveDictionary';

const { MASTERED_FIELD, PROGRESS_FIELD, ENTRY_SEPARATOR, FIELD_SEPARATOR, NODE_SEPARATOR, LEVEL_SEPARATOR, LIST_SEPARATOR } =
  CONSTS.providers.ancientRelic;

interface SaveStep {
  id: number;
  isActive: number;
  lvDic: SaveDictionary<number, { idx: number; lv: number }>;
}

export interface AncientRelicSave {
  ancientRelicData?: {
    _constellationList: { id: number; stepDic: SaveDictionary<number, SaveStep> }[];
    _masteredList: { id: number }[];
  };
}

export function ancientRelicValues(dispatch: AncientRelicSave): SaveImportResult {
  const values: Record<string, string> = { [MASTERED_FIELD]: '', [PROGRESS_FIELD]: '' };
  const notes: string[] = [];
  const data = dispatch.ancientRelicData;
  if (!data) return { values, notes };
  runSection(notes, '별자리 유물', () => {
    values[MASTERED_FIELD] = data._masteredList.map((constellation) => constellation.id).join(LIST_SEPARATOR);
    values[PROGRESS_FIELD] = data._constellationList
      .flatMap((constellation) =>
        [...readDictionary(constellation.stepDic)].map(([step, state]) => {
          const nodes = [...readDictionary(state.lvDic)].map(([idx, node]) => `${idx}${LEVEL_SEPARATOR}${node.lv}`).join(NODE_SEPARATOR);
          return [constellation.id, step, state.isActive ? 1 : 0, nodes].join(FIELD_SEPARATOR);
        }),
      )
      .join(ENTRY_SEPARATOR);
  });
  return { values, notes };
}
