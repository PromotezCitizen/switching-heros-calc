/**
 * 공격 종류 (평타 · 버프 스킬 · 액티브 스킬 · 전용 스킬) 별로 달라지는 몫: 평타 기준 최종 공격력 위에 더 곱하는 묶음 A (log10),
 * 치명타 확률 (모든 종류 같음), 치명 배수 (C / 100) × D 의 log10. damage-formula.md 2-2·2-4
 */
import { CONSTS } from '@/CONSTS';
import { criticalDamageMultiplierStats, criticalRateStats } from '@/calc/sources/summary/summary';
import type { AttackStats } from '@/dpm/attackStats';

const { KIND_STATS, CRITICAL_DAMAGE_DIVISOR } = CONSTS.dpm;
const { STATS, PER_PREFIX, ATTRIBUTE_HERO_SUFFIX } = CONSTS.summary;

export type AttackKind = 'normal' | 'buff' | 'active' | 'char' | 'swap';

export interface KindModifiers {
  /** 평타 기준 최종 공격력 위에 더 곱하는 배율 (log10). 평타는 0 */
  extraAttackLog: number;
  /** 치명타 확률 % (합) */
  criticalRate: number;
  /** 치명 성공 배수 (C / 100) × D 의 log10 (슈퍼 치명타 제외). C 가 0 이면 -Infinity */
  criticalMultiplierLog: number;
}

/** 직업 변형 (_per_<직업>_<꼬리>) 과 속성 변형 (_per_<속성>Hero_<꼬리>) 이름. 히어로가 없으면 없음 */
function kindVariantStats(stats: AttackStats, jobSuffixes: readonly string[], attributeSuffixes: readonly string[]): string[] {
  const { hero } = stats;
  if (!hero) return [];
  return [
    ...jobSuffixes.map((suffix) => `${PER_PREFIX}${hero.job}_${suffix}`),
    ...attributeSuffixes.map((suffix) => `${PER_PREFIX}${hero.attribute}${ATTRIBUTE_HERO_SUFFIX}_${suffix}`),
  ];
}

export function kindModifiers(stats: AttackStats, kind: AttackKind): KindModifiers {
  const { read, hero } = stats;
  const kindStats = kind === 'normal' ? undefined : KIND_STATS[kind];
  const attackStatNames = kindStats
    ? [...kindStats.ATTACK, ...kindVariantStats(stats, kindStats.JOB_VARIANT_SUFFIXES, kindStats.ATTRIBUTE_VARIANT_SUFFIXES)]
    : [];
  const damageSum = [STATS.CRITICAL_DAMAGE_SUM, ...(kindStats?.CRITICAL_DAMAGE_SUM ?? [])].reduce((sum, stat) => sum + read.sum(stat), 0);
  const multiplierLog = [...criticalDamageMultiplierStats(hero), ...(kindStats?.CRITICAL_DAMAGE_MULTIPLY ?? [])].reduce(
    (sum, stat) => sum + read.log(stat),
    0,
  );
  return {
    extraAttackLog: attackStatNames.reduce((sum, stat) => sum + read.log(stat), 0),
    criticalRate: criticalRateStats(hero).reduce((sum, stat) => sum + read.sum(stat), 0),
    criticalMultiplierLog: damageSum > 0 ? Math.log10(damageSum / CRITICAL_DAMAGE_DIVISOR) + multiplierLog : -Infinity,
  };
}
