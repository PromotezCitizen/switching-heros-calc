/**
 * 계정 레벨업 필요 경험치와 목표 레벨까지 더 필요한 경험치 (온라인 효율 계산기 floor-calc/calc.js levelExpLog · expToTargetLog 를 옮김).
 * 값이 1e308 을 넘는 구간이 있어 모두 log10 으로 다룬다.
 */
import { CONSTS } from '@/CONSTS';

const E = CONSTS.hunting.LEVEL_EXP;
const { PERCENT_DIVISOR } = CONSTS.common;

/** 149~7799 구간의 묶음 바탕값 (앞에서부터 쌓아 둔다) */
const midBundleCache = [0, E.MID_FIRST];

function midBundleBase(bundle: number): number {
  for (let j = midBundleCache.length - 1; j < bundle; j += 1) {
    midBundleCache[j + 1] = (midBundleCache[j] + E.MID_STEP * j * j) * E.MID_GROWTH;
  }
  return midBundleCache[bundle];
}

/** 레벨 L 에서 L+1 로 가는 데 필요한 경험치 (log10) */
export function levelExpLog(level: number): number {
  const early = E.EARLY.find(([from, to]) => level >= from && level <= to);
  if (early) return Math.log10(early[2]);
  const bundle = Math.floor(level / E.BUNDLE);
  const inBundle = level % E.BUNDLE;
  if (level <= E.MID_END) return Math.log10(midBundleBase(bundle) + E.MID_PER_LEVEL * bundle * bundle * inBundle);
  if (level <= E.HIGH_END) {
    const log = E.HIGH_BASE_LOG + (bundle - E.HIGH_BUNDLE_BASE) * E.BUNDLE_GROWTH_LOG + Math.log10(1 + E.PER_LEVEL_RATE * inBundle);
    if (level < E.ROUND_FROM) return log;
    // 가수를 소수 셋째 자리로 반올림, 지수는 그대로
    const exponent = Math.floor(log);
    return Math.log10(Math.round(Math.pow(10, log - exponent) * E.ROUND_DIGITS) / E.ROUND_DIGITS) + exponent;
  }
  if (level <= E.HIGHER_END) {
    return E.HIGHER_BASE_LOG + (bundle - E.HIGHER_BUNDLE_BASE) * E.BUNDLE_GROWTH_LOG + Math.log10(1 + E.PER_LEVEL_RATE * inBundle);
  }
  if (level <= E.TOP_END) {
    return E.TOP_BASE_LOG + (bundle - E.TOP_BUNDLE_BASE) * E.TOP_BUNDLE_GROWTH_LOG + (inBundle / E.BUNDLE) * E.TOP_IN_BUNDLE_LOG;
  }
  const past = level - E.TOP_END;
  const bundlesPast = Math.floor(past / E.BUNDLE);
  return E.LAST_BASE_LOG + (past - bundlesPast) * E.LAST_PER_LEVEL_LOG + bundlesPast * E.LAST_BUNDLE_LOG;
}

/** log10 끼리 더하기 */
function addLog(a: number, b: number): number {
  if (!Number.isFinite(a)) return b;
  const high = Math.max(a, b);
  return high + Math.log10(1 + Math.pow(10, Math.min(a, b) - high));
}

/**
 * 현재 레벨 (막대 % 만큼 모음) 에서 목표 레벨에 닿기까지 더 필요한 경험치 (log10).
 * 레벨이 비었거나 목표가 현재 이하, 너무 먼 목표면 null
 */
export function expToTargetLog(currentLevel: number, currentPercent: number, targetLevel: number): number | null {
  if (!(currentLevel >= 1) || !(targetLevel > currentLevel) || targetLevel - currentLevel > E.MAX_SPAN) return null;
  let total = -Infinity;
  for (let level = currentLevel; level < targetLevel; level += 1) total = addLog(total, levelExpLog(level));
  const percent = Math.min(Math.max(currentPercent || 0, 0), PERCENT_DIVISOR);
  if (percent === 0) return total;
  const collected = levelExpLog(currentLevel) + Math.log10(percent / PERCENT_DIVISOR);
  return total + Math.log10(1 - Math.pow(10, collected - total));
}
