/**
 * 최적 특성 페이지의 계산 입력 (대상 하나): 화면 (OptimizerPage) 과 일괄 계산 (batchRecommend.ts) 이 같은 입력을 쓰게 모아 둔다
 */
import { ACCOUNT_KEYS } from '@/account/accountKeys';
import { calcValuesOf } from '@/calc/storeKeys';
import type { CalcValues } from '@/calc/types';
import type { MonsterHpData } from '@/dpm/hpCondition';
import type { DamageTarget } from '@/dpm/targetDamage';
import type { OptimizerInputs } from '@/masteryOptimizer/snapshot';
import { readNumber } from '@/store/storedValues';
import { valuesForTarget } from '@/usb/saveImport/contentPresets';

const KEY_PREFIX = 'optimizer.';
export const OPTIMIZER_KEYS = {
  USER_LEVEL: ACCOUNT_KEYS.userLevel,
  TARGET: `${KEY_PREFIX}target`,
  TARGETS_PER_SKILL: `${KEY_PREFIX}targetsPerSkill`,
  STAGE_FLOOR: `${KEY_PREFIX}stageFloor`,
  /** 자동 교체 (저장된 값이 없으면 켜짐: 2026-10-28 결정) */
  AUTO_SWAP: `${KEY_PREFIX}autoSwap`,
} as const;
export const DEFAULT_TARGETS_PER_SKILL = 3;

/** 자동 교체 켜짐 (저장된 값이 없으면 켜짐) */
export function autoSwapOn(storeValues: Record<string, string>): boolean {
  return storeValues[OPTIMIZER_KEYS.AUTO_SWAP] !== 'false';
}

/** 대상의 콘텐츠 프리셋 칸으로 바꾼 계산 입력값 (계산식 확인기 칸 + VIP 레벨) */
export function optimizerValuesFor(storeValues: Record<string, string>, target: DamageTarget): CalcValues {
  return valuesForTarget({ ...calcValuesOf(storeValues), [ACCOUNT_KEYS.vipLevel]: storeValues[ACCOUNT_KEYS.vipLevel] ?? '' }, target);
}

/** 대상 하나의 대미지 계산 조건 */
export function optimizerInputsFor(storeValues: Record<string, string>, target: DamageTarget, monsterHp: MonsterHpData | null): OptimizerInputs {
  const stageFloor = readNumber(storeValues, OPTIMIZER_KEYS.STAGE_FLOOR);
  return {
    userLevel: readNumber(storeValues, OPTIMIZER_KEYS.USER_LEVEL),
    vipLevel: readNumber(storeValues, ACCOUNT_KEYS.vipLevel),
    target,
    damage: {
      targetsPerSkill: readNumber(storeValues, OPTIMIZER_KEYS.TARGETS_PER_SKILL, DEFAULT_TARGETS_PER_SKILL),
      orbShardHits: {},
      targetStatusCount: {},
      stageFloor: stageFloor > 0 ? stageFloor : null,
      attributeDungeonFloor: null,
      monsterHp,
      swap: autoSwapOn(storeValues),
    },
  };
}
