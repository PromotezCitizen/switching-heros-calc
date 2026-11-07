import type { DamageTarget } from '@/dpm/targetDamage';
import type { Allocation } from '@/masteryOptimizer/rules';

/** 추천 특성 결과를 저장하는 칸의 앞부분: 최적화 대상마다 따로 저장한다 (대상을 바꿨다 돌아와도 다시 계산하지 않게) */
const RESULT_KEY_PREFIX = 'optimizer.masteryResult.';

/** 저장하는 추천 특성 결과 */
export interface StoredMasteryResult {
  allocation: Allocation;
  /** 비교 기준 (아무것도 없는 상태) 의 효율. 모르면 null */
  baseEfficiency: number | null;
  efficiency: number;
}

/**
 * 결과를 저장하는 칸 이름의 뒷부분: `<최적화 대상>.<자동 교체 상태>`.
 * 자동 교체를 켰을 때와 껐을 때는 계산하는 대미지가 달라서 결과를 따로 저장한다
 */
export function resultSlot(target: DamageTarget, autoSwap: boolean): string {
  return `${target}.${autoSwap ? 'swap' : 'single'}`;
}

export function masteryResultKey(target: DamageTarget, autoSwap: boolean): string {
  return `${RESULT_KEY_PREFIX}${resultSlot(target, autoSwap)}`;
}

/** 저장된 글을 결과로 읽는다 (없거나 모양이 다르면 null) */
export function parseMasteryResult(text: string | undefined): StoredMasteryResult | null {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as Partial<StoredMasteryResult>;
    const { allocation, baseEfficiency, efficiency } = parsed;
    if (!allocation || typeof allocation !== 'object' || typeof efficiency !== 'number') return null;
    return { allocation, baseEfficiency: typeof baseEfficiency === 'number' ? baseEfficiency : null, efficiency };
  } catch {
    return null;
  }
}
