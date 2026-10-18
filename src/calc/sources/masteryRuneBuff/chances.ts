/**
 * 전투 확률 (프로필 확률 줄) 을 다른 탭 줄의 합으로 계산하고, 확률 150%·200% 초과 얼티밋 줄을 만든다.
 * 규칙 (저장 데이터 검증 claude-docs/react-port/verify-2026-10-07-0206.md 2-1): 확률 = 기본 스탯 + 추가 스탯 합,
 * 연타는 공격속도 350% 초과 몫, 슈퍼 치명타는 치명타 확률 100% 초과 몫이 더 붙는다.
 * 버프 탭 (줄·패널) 이 쓴다 (특성 탭 줄도 다른 탭 줄에 들어가므로 특성 탭에서는 계산할 수 없다)
 */
import { CONSTS } from '@/CONSTS';
import type { RawTable, StatTables, TableRow } from '@/data/statTables';
import { combineLines, type CombinedStat, type Line } from '@/calc/combine';
import type { CalcValues } from '@/calc/types';
import { heroFirstRow, slotHeroName } from '@/calc/sources/hero/character';
import { hasEquippedActiveSkill } from '@/calc/sources/skill/skill';
import { attackSpeedPercent, combinedSum, doubleAttackPercent } from '@/calc/sources/masteryRuneBuff/buff';
import { masteryLevel, masteryTraits, plainNumber, traitName, traitValue } from '@/calc/sources/masteryRuneBuff/mastery';
import type { SourceLabel } from '@/calc/sources/masteryRuneBuff/sourceLabel';
import { formationHeroAttributes, formationPair } from '@/calc/sources/masteryRuneBuff/ultimate';

const {
  STATS,
  CHANCE_STATS,
  CHANCE_ULTIMATES,
  SWITCHING_SAME_ATTRIBUTE_STAT,
  SWITCHING_DIFFERENT_ATTRIBUTE_STAT,
  SUPER_CRITICAL_RATE_THRESHOLD,
  SUPER_CRITICAL_RATE_STEP,
  JOB_CRITICAL_SUFFIX,
  ATTRIBUTE_CRITICAL_SUFFIX,
} = CONSTS.masteryRuneBuff;

/** 확률 이름 (doubleAttack, superCritical, spearAttack, switchingBoost, skillCombo, smite, barrier) → % */
export type Chances = Record<string, number>;

/** 치명타 확률 % = 치명타 확률 줄 합 + 1슬롯 히어로 직업·속성 치명타 확률 (저장 데이터 검증 488.3, 화면 489.3 근사) */
export function criticalRatePercent(combined: Record<string, CombinedStat>, hero: TableRow | undefined): number {
  const stats: string[] = [STATS.CRITICAL_RATE];
  if (hero) stats.push(hero.job + JOB_CRITICAL_SUFFIX, hero.attribute + ATTRIBUTE_CRITICAL_SUFFIX);
  return stats.reduce((sum, stat) => sum + combinedSum(combined, stat), 0);
}

/** 슈퍼 치명타 % = 기본 + 추가 + floor((치명타 확률 − 100) / 10) × 초과 특성 값. 예: 18.37 + 40 + 38 × 1 = 96.37 */
export function superCriticalPercent(combined: Record<string, CombinedStat>, criticalRate: number): number {
  const steps = Math.max(Math.floor((criticalRate - SUPER_CRITICAL_RATE_THRESHOLD) / SUPER_CRITICAL_RATE_STEP), 0);
  return (
    combinedSum(combined, STATS.SUPER_CRITICAL) +
    combinedSum(combined, STATS.SUPER_CRITICAL_ADD) +
    steps * combinedSum(combined, STATS.SUPER_CRITICAL_RATE_OVER)
  );
}

/**
 * 다른 탭 줄 전부 → 확률들. 직업·속성 몫은 1슬롯 히어로 기준.
 * 스위칭 부스트는 1·2슬롯 두 히어로가 같은 속성 / 다른 속성이면 그 특성 값을 더한다 (특성 208·209 설명)
 */
export function chancesFromLines(lines: Line[], values: CalcValues, tables: StatTables): Chances {
  const combined = combineLines(lines);
  const hero = heroFirstRow(tables, slotHeroName(values, tables));
  const chances: Chances = {
    doubleAttack: doubleAttackPercent(combined, attackSpeedPercent(combined, hero, !hasEquippedActiveSkill(values, tables))),
    superCritical: superCriticalPercent(combined, criticalRatePercent(combined, hero)),
  };
  for (const [chance, stats] of Object.entries(CHANCE_STATS)) {
    chances[chance] = stats.reduce((sum, stat) => sum + combinedSum(combined, stat), 0);
  }
  const attributePair = formationPair(formationHeroAttributes(values, tables));
  if (attributePair.same) chances.switchingBoost += combinedSum(combined, SWITCHING_SAME_ATTRIBUTE_STAT);
  if (attributePair.different) chances.switchingBoost += combinedSum(combined, SWITCHING_DIFFERENT_ATTRIBUTE_STAT);
  return chances;
}

/** 켠 확률 문턱 얼티밋 중 확률이 문턱을 넘은 것 → 공격력 % 줄 (발동 시 효과를 늘 붙는 것으로 넣음, 추정) */
export function chanceUltimateLines(
  values: CalcValues,
  masteryTable: RawTable,
  chances: Chances,
  sourceLabel: SourceLabel,
): Line[] {
  const lines: Line[] = [];
  for (const trait of masteryTraits(masteryTable)) {
    const rule = trait.ultimate ? CHANCE_ULTIMATES[trait.statName] : undefined;
    if (!rule) continue;
    const level = masteryLevel(values, trait);
    const chance = chances[rule.chance] ?? 0;
    if (!(level > 0) || !(chance > rule.threshold)) continue;
    lines.push({
      source: sourceLabel('calc.ultimate.chanceSource', {
        name: traitName(trait, sourceLabel),
        chance: plainNumber(chance),
        threshold: rule.threshold,
      }),
      stat: STATS.ATTACK_PERCENT,
      value: traitValue(trait, level),
    });
  }
  return lines;
}
