/** 게임 큰 수 표기("8.97DC", "356.53CI%")를 log10 으로 읽고 되돌려 쓴다. stat-calc-core.js 와 같은 규칙 */
import { CONSTS } from '@/CONSTS';

const {
  LOG_PER_UNIT,
  UNIT_FROM_LOG,
  LETTER_COUNT,
  TWO_LETTER_UNIT_START,
  UPPER_A_CODE,
  LOWER_A_CODE,
  LOWER_BEFORE_A_CODE,
  CARRY_MANTISSA,
  MANTISSA_DECIMALS,
  PLAIN_DECIMALS,
  ONE_PLUS_IGNORE_FROM,
} = CONSTS.gameNumber;

const GAME_NUMBER_PATTERN = /^\s*([\d.,]+)\s*([a-zA-Z]{0,2})\s*(%?)\s*$/;

export interface ParsedGameNumber {
  log: number;
  percent: boolean;
}

/** 단위 글자 → 번호 (A=1 … Z=26, AA=27 …). 글자 없으면 0 */
export function letterIndex(letters: string): number {
  const lower = letters.toLowerCase();
  if (!lower) return 0;
  if (lower.length === 1) return lower.charCodeAt(0) - LOWER_BEFORE_A_CODE;
  return (
    TWO_LETTER_UNIT_START +
    (lower.charCodeAt(0) - LOWER_A_CODE) * LETTER_COUNT +
    (lower.charCodeAt(1) - LOWER_A_CODE)
  );
}

/** 단위 번호 → 대문자 글자 (게임 화면 표기) */
export function unitSuffix(index: number): string {
  if (index <= 0) return '';
  if (index <= LETTER_COUNT) return String.fromCharCode(UPPER_A_CODE - 1 + index);
  const offset = index - TWO_LETTER_UNIT_START;
  return (
    String.fromCharCode(UPPER_A_CODE + Math.floor(offset / LETTER_COUNT)) +
    String.fromCharCode(UPPER_A_CODE + (offset % LETTER_COUNT))
  );
}

/** "8.97DC" → { log: 321.95, percent: false }. 해석 못 하거나 0 이하이면 null */
export function parseGameNumber(text: string | null | undefined): ParsedGameNumber | null {
  const match = GAME_NUMBER_PATTERN.exec(String(text ?? ''));
  if (!match) return null;
  const number = parseFloat(match[1].replace(/,/g, ''));
  if (!(number > 0)) return null;
  return { log: Math.log10(number) + LOG_PER_UNIT * letterIndex(match[2]), percent: match[3] === '%' };
}

/** log10 값 → 게임 표기 문자열 */
export function formatLog(log: number | null | undefined): string {
  if (log === null || log === undefined || !isFinite(log)) return '-';
  if (log < UNIT_FROM_LOG) {
    return Number(Math.pow(10, log).toFixed(PLAIN_DECIMALS)).toLocaleString('ko-KR');
  }
  let index = Math.floor(log / LOG_PER_UNIT);
  let mantissa = Math.pow(10, log - LOG_PER_UNIT * index);
  if (mantissa >= CARRY_MANTISSA) {
    index += 1;
    mantissa /= Math.pow(10, LOG_PER_UNIT);
  }
  return mantissa.toFixed(MANTISSA_DECIMALS) + unitSuffix(index);
}

/** log10(1 + 10^x). x 가 크면 1 은 무시 */
export function logOnePlus(x: number): number {
  return x > ONE_PLUS_IGNORE_FROM ? x : Math.log10(1 + Math.pow(10, x));
}
