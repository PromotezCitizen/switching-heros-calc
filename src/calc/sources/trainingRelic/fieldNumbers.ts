/** 숫자 칸 읽기 (기존 HTML 의 numberValue 와 같음): 읽을 수 없거나 음수면 0, 소수는 내림 */
import { CONSTS } from '../../../CONSTS';
import type { CalcValues } from '../../types';

const EMPTY_LEVEL = CONSTS.emptyInput.LEVEL;

export function integerFieldValue(values: CalcValues, fieldId: string): number {
  return Math.max(Math.floor(Number(values[fieldId]) || EMPTY_LEVEL), EMPTY_LEVEL);
}
