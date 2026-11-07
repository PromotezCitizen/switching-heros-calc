/** 출처 줄을 앱 코드 규칙으로 합친다 (_per_ → × (1 + v/100), _down_ → × (1 − v/100), _pow_ → × v, 그 밖 → + v) */
import { CONSTS } from '@/CONSTS';
import { logOnePlus } from '@/calc/gameNumber';

const { MAX_LOG, PERCENT_LOG_OFFSET, MIN_POSITIVE } = CONSTS.combine;
const PERCENT_DIVISOR = CONSTS.common.PERCENT_DIVISOR;

/** 효과 줄 하나 = 앱 코드에서 스탯을 한 번 넣는 단위. 표 값은 value, 화면 값(1e308 초과 가능)은 log */
export interface Line {
  source: string;
  stat: string;
  value?: number;
  log?: number;
}

export type CombineKind = 'multiply' | 'down' | 'pow' | 'sum';

export interface CombinedStat {
  kind: CombineKind;
  /** 곱 계열의 log10 배율 */
  log: number;
  /** 합 계열의 합 */
  sum: number;
  /** 합친 줄 수 */
  count: number;
}

const EXCLUDED_STATS = new Set(CONSTS.common.EXCLUDED_STATS.map((stat) => stat.toLowerCase()));

/** 계산식에서 빼기로 한 스탯 (명중)의 줄을 걸러 낸다. 모든 탭의 줄이 합산 전에 여기를 지난다 */
export function withoutExcludedStats(lines: Line[]): Line[] {
  return lines.filter((line) => !EXCLUDED_STATS.has(line.stat.toLowerCase()));
}

export function combineKind(stat: string): CombineKind {
  if (stat.includes('_per_')) return 'multiply';
  if (stat.includes('_down_')) return 'down';
  if (stat.includes('_pow_')) return 'pow';
  return 'sum';
}

/**
 * 줄들을 스탯별로 합친다. 대소문자만 다른 스탯 (예: _per_NormalMonsterDamage / _per_normalMonsterDamage) 은
 * 같은 스탯으로 보고 처음 나온 철자로 합친다 (: 대소문자는 동일).
 */
export function combineLines(lines: Line[]): Record<string, CombinedStat> {
  const result: Record<string, CombinedStat> = {};
  const spellingByLowerCase = new Map<string, string>();
  for (const line of lines) {
    const hasLog = line.log !== undefined && line.log !== null;
    const value = hasLog ? Math.pow(10, Math.min(line.log as number, MAX_LOG)) : Number(line.value);
    if (!line.stat || !value) continue;
    const kind = combineKind(line.stat);
    const lowerCase = line.stat.toLowerCase();
    if (!spellingByLowerCase.has(lowerCase)) spellingByLowerCase.set(lowerCase, line.stat);
    const stat = spellingByLowerCase.get(lowerCase) as string;
    const entry = (result[stat] ??= { kind, log: 0, sum: 0, count: 0 });
    entry.count += 1;
    if (kind === 'multiply') {
      entry.log += logOnePlus((hasLog ? (line.log as number) : Math.log10(Math.abs(value))) - PERCENT_LOG_OFFSET);
    } else if (kind === 'down') {
      entry.log += Math.log10(Math.max(1 - value / PERCENT_DIVISOR, MIN_POSITIVE));
    } else if (kind === 'pow') {
      entry.log += Math.log10(value);
    } else {
      entry.sum += value;
    }
  }
  return result;
}
