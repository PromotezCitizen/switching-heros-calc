import { useJsonData } from '@/data/useJsonData';
import type { StageRewards } from '@/hunting/huntingCalc';

/** 층별 보상 표 (stat-calc/scripts/export_stage_rewards.py 가 만든 JSON) */
export function useStageRewards() {
  const state = useJsonData<StageRewards>('stageRewards.json');
  return state.status === 'ready' ? ({ status: 'ready', rewards: state.data } as const) : state;
}
