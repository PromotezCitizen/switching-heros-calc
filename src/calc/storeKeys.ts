import { ACCOUNT_KEYS } from '../account/accountKeys';
import { CONSTS } from '../CONSTS';

const CHECKED_TEXT = CONSTS.textLines.CHECKED_TEXT;

/** 계산식 확인기 입력 칸을 저장소에 넣을 때 붙이는 접두사 (칸 이름은 기존 HTML 의 data-key 그대로) */
export const CALC_KEY_PREFIX = 'calc.';

const PREFIX_LENGTH = CALC_KEY_PREFIX.length;

/** 계정 공통 값 → 계산식 확인기에서 쓰는 칸 이름 (계산 칸에서 따로 받지 않고 "공통 입력" 값을 읽는다) */
const ACCOUNT_FIELD_ALIASES: Record<string, string> = {
  fairyBondLevel: ACCOUNT_KEYS.fairyLevel,
};

/** 저장소 값 전체에서 계산식 확인기 칸만 접두사를 떼어 돌려주고, 계정 공통 값을 해당 칸 이름으로 붙인다 */
export function calcValuesOf(storeValues: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, text] of Object.entries(storeValues)) {
    if (key.startsWith(CALC_KEY_PREFIX)) result[key.slice(PREFIX_LENGTH)] = text;
  }
  for (const [fieldId, accountKey] of Object.entries(ACCOUNT_FIELD_ALIASES)) {
    if (storeValues[accountKey] !== undefined) result[fieldId] = storeValues[accountKey];
  }
  // 요정의 축복 켜짐: 저장된 값이 없으면 켜짐 (공통 입력의 기본값과 같다)
  result.fairyBlessingOn = storeValues[ACCOUNT_KEYS.fairyOn] ?? CHECKED_TEXT;
  return result;
}
