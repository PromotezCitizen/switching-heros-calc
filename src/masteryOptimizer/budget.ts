/**
 * 총 특성 포인트 (예산) = 레벨업으로 받은 몫 (유저 레벨 − 1) + VIP 혜택 (표 mastery_point_up, 그 레벨 이하 행 누적).
 * 저장 데이터 `MasteryPoint` 와 같은 값 (확정, 2026-10-28: 레벨 91352 · VIP 13 → 91,351 + 50 + 100 = 91,501, 화면 `P 91,501`).
 * 프리셋마다 남는 포인트는 이 총량 − 프리셋 사용량. 계획: claude-docs/plans/2026-10-28-mastery-optimizer.md
 */
import { rowsOf } from '@/calc/sources/heroWeaponCardPet/shared';
import type { StatTables } from '@/data/statTables';

const VIP_TABLE = 'Vip';
/** 레벨 1 에서 시작하므로 레벨업 횟수 = 유저 레벨 − 1 (레벨업 보상 = 특성 포인트 1) */
const FIRST_USER_LEVEL = 1;

/** VIP 혜택으로 받는 특성 포인트 (그 VIP 레벨 이하 행의 합) */
export function vipMasteryPoints(tables: StatTables, vipLevel: number): number {
  return rowsOf(tables, VIP_TABLE)
    .filter((row) => Number(row.lv) <= vipLevel)
    .reduce((sum, row) => sum + (Number(row.masteryPointUp) || 0), 0);
}

export function totalMasteryPoints(tables: StatTables, userLevel: number, vipLevel: number): number {
  return Math.max(userLevel - FIRST_USER_LEVEL, 0) + vipMasteryPoints(tables, vipLevel);
}
