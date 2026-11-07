/** 사냥 계산기 입력 칸 이름 (사냥 페이지와 세이브 불러오기가 같이 쓴다) */
export const HUNTING_KEY_PREFIX = 'hunting.';

export const HUNTING_KEYS = {
  /** 오프라인 층 = 최대층 (사용자 결정 2026-11-07 "\"최대층\"이 오프라인 기준이다"), 세이브 Default.maxStageNo 로 불러온다 */
  offlineFloor: `${HUNTING_KEY_PREFIX}offlineFloor`,
} as const;
