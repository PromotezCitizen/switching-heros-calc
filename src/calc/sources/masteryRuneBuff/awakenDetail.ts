/**
 * 베르 각성 세부 스탯: 게임 각성 화면의 세부 스탯 레벨 ("LV.50") → 효과 줄.
 * 식 (이 계정 화면 6줄 일치 확인, scratchpad awaken_detail_check.py):
 *   스탯 배율 = Π(앞 단계 행: 1 + 값 × 최대 레벨 / 100) × (1 + 현재 단계 값 × 입력 레벨 / 100), 효과 % = (배율 − 1) × 100
 *   앞 단계 = 표 Awaken 에서 현재 등급·별보다 단계 (awakenLv) 가 낮은 행 전부 (다 찍어야 다음 단계로 넘어감)
 * 명중은 계산에서 빼므로 칸도 만들지 않는다
 */
import { CONSTS } from '../../../CONSTS';
import type { StatTables } from '../../../data/statTables';
import type { Line } from '../../combine';
import type { CalcValues } from '../../types';
import { awakenStages, selectedAwakenStage, type AwakenStage } from '../../sources/hero/awaken';
import type { SourceLabel } from './sourceLabel';

const { STAT_COLUMN_NUMBERS } = CONSTS.hero.awakenDetail;
const { PERCENT_DIVISOR, EXCLUDED_STATS } = CONSTS.common;
const EXCLUDED = new Set(EXCLUDED_STATS.map((stat) => stat.toLowerCase()));

/** 세부 스탯 레벨 칸 이름 (스탯마다 하나) */
export function awakenDetailLevelField(stat: string): string {
  return `awakenDetailLevel${stat}`;
}

/** 단계 행의 세부 스탯 [스탯, 레벨당 값] (빈 칸·명중 제외) */
function stageStats(stage: AwakenStage): Array<{ stat: string; valuePerLevel: number }> {
  return STAT_COLUMN_NUMBERS.map((number) => ({ stat: stage.row[`type${number}`], valuePerLevel: Number(stage.row[`val${number}`]) }))
    .filter(({ stat }) => stat && !EXCLUDED.has(stat.toLowerCase()));
}

export interface AwakenDetailStat {
  stat: string;
  /** 현재 단계의 최대 레벨 (입력 칸 상한) */
  maxLevel: number;
  /** 효과 % (log10). 효과가 없으면 null */
  percentLog: number | null;
}

/** 현재 단계의 세부 스탯마다 입력 상한과 누적 효과 %. 각성 단계가 없으면 빈 목록 */
export function awakenDetailStats(values: CalcValues, tables: StatTables): AwakenDetailStat[] {
  const current = selectedAwakenStage(values, tables);
  if (!current) return [];
  const multipliers = new Map<string, number>();
  for (const stage of awakenStages(tables)) {
    if (stage.awakenLv > current.awakenLv) break;
    for (const { stat, valuePerLevel } of stageStats(stage)) {
      const level =
        stage.awakenLv < current.awakenLv
          ? stage.maxLv
          : Math.min(Math.max(Number(values[awakenDetailLevelField(stat)]) || 0, 0), stage.maxLv);
      multipliers.set(stat, (multipliers.get(stat) ?? 1) * (1 + (valuePerLevel * level) / PERCENT_DIVISOR));
    }
  }
  return stageStats(current).map(({ stat }) => {
    const multiplier = multipliers.get(stat) ?? 1;
    return {
      stat,
      maxLevel: current.maxLv,
      percentLog: multiplier > 1 ? Math.log10((multiplier - 1) * PERCENT_DIVISOR) : null,
    };
  });
}

export function awakenDetailLines(values: CalcValues, tables: StatTables, sourceLabel: SourceLabel): Line[] {
  return awakenDetailStats(values, tables)
    .filter((entry) => entry.percentLog !== null)
    .map((entry) => ({ source: sourceLabel('calc.awakenDetail.lineSource'), stat: entry.stat, log: entry.percentLog as number }));
}
