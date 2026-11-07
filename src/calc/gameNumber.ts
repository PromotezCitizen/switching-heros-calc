/**
 * 게임 큰 수 표기("8.97DC", "356.53CI%")를 log10 으로 읽고 되돌려 쓴다. 처음엔 stat-calc-core.js 를 옮겼고 (단위 2글자까지),
 * 단위는 게임 m850 과 같게 8글자까지로 고침
 */
import { CONSTS } from '@/CONSTS';

const {
  LOG_PER_UNIT,
  UNIT_FROM_LOG,
  LETTER_COUNT,
  MAX_UNIT_LETTERS,
  UPPER_A_CODE,
  LOWER_BEFORE_A_CODE,
  CARRY_MANTISSA,
  MANTISSA_DECIMALS,
  PLAIN_DECIMALS,
  ONE_PLUS_IGNORE_FROM,
} = CONSTS.gameNumber;

const GAME_NUMBER_PATTERN = new RegExp(`^\\s*([\\d.,]+)\\s*([a-zA-Z]{0,${MAX_UNIT_LETTERS}})\\s*(%?)\\s*$`);

export interface ParsedGameNumber {
  log: number;
  percent: boolean;
}

/** 단위 글자 → 번호 (엑셀 열 이름 방식: A=1 … Z=26, AA=27 … ZZ=702, AAA=703 …). 글자 없으면 0 */
export function letterIndex(letters: string): number {
  let index = 0;
  for (const letter of letters.toLowerCase()) index = index * LETTER_COUNT + (letter.charCodeAt(0) - LOWER_BEFORE_A_CODE);
  return index;
}

/** 단위 번호 → 대문자 글자 (게임 화면 표기, 게임 m850 과 같은 방식) */
export function unitSuffix(index: number): string {
  let suffix = "";
  for (let rest = index; rest > 0; rest = Math.floor((rest - 1) / LETTER_COUNT)) {
    suffix = String.fromCharCode(UPPER_A_CODE + ((rest - 1) % LETTER_COUNT)) + suffix;
  }
  return suffix;
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
