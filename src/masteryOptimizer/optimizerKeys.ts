/** 추천 계산이 쓰는 저장소 칸 이름 (추천 페이지와 내 값 › 계산 설정이 같이 쓴다) */
import { ACCOUNT_KEYS } from '@/account/accountKeys';

const KEY_PREFIX = 'optimizer.';

export const OPTIMIZER_KEYS = {
  /** 유저 레벨 (총 특성 포인트) */
  userLevel: ACCOUNT_KEYS.userLevel,
  /** 최적화 대상 */
  target: `${KEY_PREFIX}target`,
  /** 스킬 한 번에 맞는 적 수 (일반 대상) */
  targetsPerSkill: `${KEY_PREFIX}targetsPerSkill`,
  /** 스테이지 층 (적 체력 조건 피해용) */
  stageFloor: `${KEY_PREFIX}stageFloor`,
  /** 자동 교체 (저장된 값이 없으면 켜짐: 2026-10-28 결정) */
  autoSwap: `${KEY_PREFIX}autoSwap`,
} as const;

/** 맞는 적 수를 비워 두었을 때 */
export const DEFAULT_TARGETS_PER_SKILL = 3;
