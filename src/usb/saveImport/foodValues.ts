/**
 * 저장 데이터 Dispatch 의 음식 먹은 기록 (myGuildData._foodUseList: 음식 번호 _itemType = Item 표 itemId, 먹은 시각 _useDate)
 * → 버프 탭 "일반 몬스터 피해 음식" 칸 (normalMonsterFood). 먹은 시각 + 지속 시간 (60분) 이 저장 시각 (st) 보다 뒤인 음식만 켜진 것으로 본다.
 * 여러 개가 켜져 있으면 가장 센 것 하나 (칸이 하나). 켜진 음식이 없으면 칸을 비운다 (전에 가져온 값이 남지 않게).
 * 경험치·골드·정수 음식은 대미지 계산과 상관없어 여기서 다루지 않는다
 */
import { CONSTS } from '@/CONSTS';
import { runSection, type SaveImportResult } from '@/usb/saveImport/saveDictionary';

const { NORMAL_MONSTER_FOOD_FIELD, NORMAL_MONSTER_FOODS, NORMAL_MONSTER_FOOD_MINUTES } = CONSTS.masteryRuneBuff;
const MS_PER_MINUTE = 60_000;

export interface FoodSave {
  /** 저장 시각 "2026-10-31 18:12:04" */
  st?: string;
  myGuildData?: { _foodUseList?: { _itemType: number; _useCnt?: number; _useDate: string }[] };
}

/** "2026-10-31 18:12:04" → 시각 (같은 형식끼리만 비교하므로 시간대는 상관없다) */
function timeOf(text: string): number {
  return new Date(text.replace(' ', 'T')).getTime();
}

export function foodValues(dispatch: FoodSave): SaveImportResult {
  const values: Record<string, string> = {};
  const notes: string[] = [];
  runSection(notes, '음식', () => {
    const uses = dispatch.myGuildData?._foodUseList;
    if (!uses || !dispatch.st) return;
    const savedAt = timeOf(dispatch.st);
    const active = NORMAL_MONSTER_FOODS.filter((food) =>
      uses.some((use) => use._itemType === food.itemId && timeOf(use._useDate) + NORMAL_MONSTER_FOOD_MINUTES * MS_PER_MINUTE > savedAt),
    );
    const strongest = active.reduce<(typeof NORMAL_MONSTER_FOODS)[number] | undefined>(
      (best, food) => (!best || food.percent > best.percent ? food : best),
      undefined,
    );
    values[NORMAL_MONSTER_FOOD_FIELD] = strongest?.id ?? '';
  });
  return { values, notes };
}
