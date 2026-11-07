/** "최적 특성" 페이지가 불러올 표: 계산기 탭 전체가 쓰는 표 (종합 탭이 모아 둠) + 대미지 계산 (`src/dpm`) 이 더 쓰는 표 */
import { CALC_TABS } from '@/calc/tabs';
import { SUMMARY_TAB_ID } from '@/calc/sources/summary';

/** 계산기 탭에는 없고 대미지 계산만 읽는 표 (게임 속도 · 보스 시간 · 특성 포인트, 전용 스킬, 히어로 각성) */
const DAMAGE_ONLY_TABLES = ['Vip', 'CharSkill', 'ChangeSkill', 'CharacterAwaken'];

export const OPTIMIZER_TABLES: readonly string[] = [
  ...new Set([...(CALC_TABS.find((tab) => tab.id === SUMMARY_TAB_ID)?.tableNames ?? []), ...DAMAGE_ONLY_TABLES]),
];
