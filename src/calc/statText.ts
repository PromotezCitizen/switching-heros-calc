/** 스탯 설명 문구({0} 자리에 값)와 값 표기 */
import { formatLog } from './gameNumber';
import type { Line } from './combine';

export type StatDescriptions = Record<string, string>;

const VALUE_PLACEHOLDER = '{0}';
const SAMPLE_VALUE = 'N';

const lowerCaseIndexCache = new WeakMap<StatDescriptions, Map<string, string>>();

/** 대소문자만 다른 스탯 이름도 같은 설명을 찾는다 (대소문자는 동일) */
function findDescription(descriptions: StatDescriptions, stat: string): string | undefined {
  if (descriptions[stat] !== undefined) return descriptions[stat];
  let index = lowerCaseIndexCache.get(descriptions);
  if (!index) {
    index = new Map(Object.entries(descriptions).map(([name, text]) => [name.toLowerCase(), text]));
    lowerCaseIndexCache.set(descriptions, index);
  }
  return index.get(stat.toLowerCase());
}

export function statDescription(descriptions: StatDescriptions, stat: string): string {
  return findDescription(descriptions, stat) ?? `${stat} ${VALUE_PLACEHOLDER}`;
}

export function amountText(value: number): string {
  return value ? formatLog(Math.log10(Math.abs(value))) : '0';
}

/** 줄 하나의 효과 문장: 설명의 {0} 자리에 값 */
export function lineText(descriptions: StatDescriptions, line: Line): string {
  const shown = line.log !== undefined ? formatLog(line.log) : amountText(Number(line.value));
  const description = statDescription(descriptions, line.stat);
  return description.includes(VALUE_PLACEHOLDER)
    ? description.replace(VALUE_PLACEHOLDER, shown)
    : `${description} ${shown}`;
}

export function statLabel(descriptions: StatDescriptions, stat: string): string {
  return statDescription(descriptions, stat).replace(VALUE_PLACEHOLDER, SAMPLE_VALUE);
}

const PERCENT_DECIMALS = 4;

/** 화면 % 값 표기 (게임 일기장 목록과 같은 소수 넷째 자리, 예: 169.5217%) */
export function formatPercentText(percent: number): string {
  return `${percent.toFixed(PERCENT_DECIMALS)}%`;
}
