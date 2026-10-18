/** 저장 데이터에서 계산한 값을 입력 칸 글로 바꾼다 (화면 표시용 formatLog 보다 자릿수를 많이 남김) */
import { CONSTS } from '@/CONSTS';
import { unitSuffix } from '@/calc/gameNumber';

const { SAVE_TEXT_DECIMALS, SAVE_TEXT_UNIT_FROM_LOG, LOG_PER_UNIT, PERCENT_LOG_SHIFT, MULTIPLIER_LOG_DIRECT_FROM } = CONSTS.usb;

/** log10(값) → 게임 표기 글 (예: 4.2 → "15.848932A") */
export function gameTextFromLog(log: number): string {
  if (log < SAVE_TEXT_UNIT_FROM_LOG) return Math.pow(10, log).toFixed(SAVE_TEXT_DECIMALS);
  const unitIndex = Math.floor(log / LOG_PER_UNIT);
  const mantissa = Math.pow(10, log - unitIndex * LOG_PER_UNIT);
  return mantissa.toFixed(SAVE_TEXT_DECIMALS) + unitSuffix(unitIndex);
}

/** 곱한 배율의 log10 → (배율 − 1) × 100 % 의 게임 표기 (배율이 아주 크면 − 1 은 무시) */
export function percentTextFromMultiplierLog(multiplierLog: number): string {
  if (multiplierLog > MULTIPLIER_LOG_DIRECT_FROM) return gameTextFromLog(multiplierLog + PERCENT_LOG_SHIFT);
  return gameTextFromLog(Math.log10((Math.pow(10, multiplierLog) - 1) * CONSTS.common.PERCENT_DIVISOR));
}

/** 퍼센트 값 하나를 배율 log10 으로 (30 → log10(1.3)) */
export function multiplierLogFromPercent(percent: number): number {
  return Math.log10(1 + percent / CONSTS.common.PERCENT_DIVISOR);
}
