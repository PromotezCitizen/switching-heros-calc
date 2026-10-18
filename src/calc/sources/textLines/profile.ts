/**
 * 프로필 창 값: 계산이 읽는 칸만 둔다.
 * 공격력·체력 = 히어로 기본값 확인 (hero/baseCheck.ts). 연타는 다른 탭 줄로 계산한다 (masteryRuneBuff/buff.ts).
 * 줄을 만들지 않고, 다른 계산이 쓸 수 있게 화면 값을 log10 으로 읽기만 한다.
 */
import { parseGameNumber } from '@/calc/gameNumber';
import type { CalcValues } from '@/calc/types';

export const PROFILE_FIELDS = ['atk', 'hp'] as const;

export type ProfileFieldId = (typeof PROFILE_FIELDS)[number];

/** 칸 하나 → log10 (빈칸·해석 불가면 null, 기존 profileLog 와 같음) */
export function profileLog(values: CalcValues, fieldId: ProfileFieldId): number | null {
  return parseGameNumber(values[fieldId])?.log ?? null;
}

/** 칸 하나 → 숫자 그대로 (% 칸이면 % 값, 빈칸·해석 불가면 0, 기존 profilePercent 와 같음) */
export function profilePercent(values: CalcValues, fieldId: ProfileFieldId): number {
  const log = profileLog(values, fieldId);
  return log === null ? 0 : Math.pow(10, log);
}

/** 프로필 창 칸 전부 → 칸 이름별 log10 (읽을 수 없으면 null) */
export function parseProfile(values: CalcValues): Record<ProfileFieldId, number | null> {
  return Object.fromEntries(PROFILE_FIELDS.map((fieldId) => [fieldId, profileLog(values, fieldId)])) as Record<
    ProfileFieldId,
    number | null
  >;
}
