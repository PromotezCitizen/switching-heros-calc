/**
 * 저장 데이터 Dispatch 의 별자리 유물 (ancientRelicData) → 진행 중인 별자리 (번호 · 현재 단계 = 처음으로 안 켜진 단계 · 그 단계 칸 레벨). 앞의 별자리는 계산이 모두 달성으로 본다. 예전 칸 (ancientMastered · ancientProgress) 은 비운다.
 * 5.70 이전 저장에는 없어 그럴 땐 칸을 비운다 (전에 가져온 값이 남지 않게)
 */
import { CONSTS } from '@/CONSTS';
import { readDictionary, runSection, type SaveDictionary, type SaveImportResult } from '@/usb/saveImport/saveDictionary';

const { MASTERED_FIELD, CURRENT_CONST_FIELD, CURRENT_STEP_FIELD, STEP_LEVEL_FIELD_PREFIX, PROGRESS_FIELD } = CONSTS.providers.ancientRelic;

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
  const values: Record<string, string> = { [MASTERED_FIELD]: '', [CURRENT_CONST_FIELD]: '', [CURRENT_STEP_FIELD]: '', [PROGRESS_FIELD]: '' };
  const notes: string[] = [];
  const data = dispatch.ancientRelicData;
  if (!data) return { values, notes };
  runSection(notes, '별자리 유물', () => {
    const mastered = data._masteredList.map((constellation) => constellation.id);
    // 진행 중인 별자리: 달성 목록에 없는 첫 별자리. 현재 단계 = 처음으로 안 켜진 단계 (다 켜졌으면 마지막 단계)
    const constellation = data._constellationList.find((entry) => !mastered.includes(entry.id));
    if (!constellation) return;
    const steps = [...readDictionary(constellation.stepDic)].sort(([left], [right]) => left - right);
    const current = steps.find(([, state]) => !state.isActive) ?? steps[steps.length - 1];
    if (!current) return;
    values[CURRENT_CONST_FIELD] = String(constellation.id);
    values[CURRENT_STEP_FIELD] = String(current[0]);
    for (const [idx, node] of readDictionary(current[1].lvDic)) values[`${STEP_LEVEL_FIELD_PREFIX}${idx}`] = String(node.lv);
  });
  return { values, notes };
}
