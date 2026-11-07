/**
 * 입력값 + 대상 (일반 / 보스 / 히어로 몬스터) → 대미지 계산에 쓰는 합친 줄과 대상 기준 최종 공격력 (log10).
 * 최종 공격력은 종합 탭 finalAtk 줄 (스탯 6 × 평타 · 그 대상의 묶음 A × 최종 공격력 배수) 그대로이고,
 * 그 위에 대상별 묶음 F (_multiply_Boss/HeroMonsterDamage) 를 곱한다 (damage-formula.md 2-2·2-5)
 */
import { CONSTS } from '@/CONSTS';
import { combineLines, type CombinedStat, type Line } from '@/calc/combine';
import { heroFirstRow, slotHeroName } from '@/calc/sources/hero/character';
import { summaryRows, type SummaryTarget } from '@/calc/sources/summary/summary';
import { expandedTabLines } from '@/calc/tabLines';
import { CALC_TABS } from '@/calc/tabs';
import type { CalcValues } from '@/calc/types';
import type { StatTables, TableRow } from '@/data/statTables';

const { TARGET_FIELD } = CONSTS.summary;
const { TARGET_MULTIPLY_STATS } = CONSTS.dpm;

export interface StatReader {
  /** 합 계열 값 (줄 값의 합, 없으면 0) */
  sum: (stat: string) => number;
  /** 곱 계열 배율 (log10, 없으면 0) */
  log: (stat: string) => number;
}

export interface AttackStats {
  target: SummaryTarget;
  lines: Line[];
  read: StatReader;
  hero: TableRow | undefined;
  /** 대상 기준 최종 공격력 (log10). 히어로 · 각성 단계가 없어 계산할 수 없으면 null */
  targetFinalAttackLog: number | null;
}

/** 합친 스탯을 대소문자 구분 없이 읽는다 (종합 탭과 같은 규칙) */
export function statReader(combined: Record<string, CombinedStat>): StatReader {
  const byLowerCase = new Map(Object.entries(combined).map(([stat, entry]) => [stat.toLowerCase(), entry]));
  return {
    sum: (stat) => byLowerCase.get(stat.toLowerCase())?.sum ?? 0,
    log: (stat) => byLowerCase.get(stat.toLowerCase())?.log ?? 0,
  };
}

/**
 * 줄에 적힌 값의 합 (대소문자 구분 없음). _per_ 스탯은 합칠 때 곱 계열 (log) 로만 남아 read.sum 이 늘 0 이므로,
 * 게임이 필드에 값의 합을 넣는 스탯 (슈퍼 치명타 증가 _per_superCriticalAddDmg 등) 은 여기서 읽는다
 */
export function lineValueSum(lines: Line[], stat: string): number {
  const wanted = stat.toLowerCase();
  return lines.reduce((sum, line) => (line.stat.toLowerCase() === wanted ? sum + (Number(line.value) || 0) : sum), 0);
}

/** 대상 칸을 바꾼 입력값으로 줄을 다시 만든다 (버프 탭의 대상 몬스터 공격시 줄도 대상을 따른다) */
export function attackStats(values: CalcValues, tables: StatTables, target: SummaryTarget): AttackStats {
  const targetValues = { ...values, [TARGET_FIELD]: target };
  const lines = expandedTabLines(CALC_TABS, targetValues, tables);
  const read = statReader(combineLines(lines));
  const hero = heroFirstRow(tables, slotHeroName(targetValues, tables));
  const finalAtk = summaryRows(lines, targetValues, tables).find((row) => row.id === 'finalAtk')?.log ?? null;
  // 묶음 F: 줄 값이 배수 그대로 (5 = ×5), 줄이 없으면 곱하지 않음
  const targetMultiplyLog = TARGET_MULTIPLY_STATS[target].reduce((sum, stat) => {
    const multiplier = read.sum(stat);
    return multiplier > 0 ? sum + Math.log10(multiplier) : sum;
  }, 0);
  return {
    target,
    lines,
    read,
    hero,
    targetFinalAttackLog: finalAtk === null || !isFinite(finalAtk) ? null : finalAtk + targetMultiplyLog,
  };
}
