/**
 * 게임 속도 배율: VIP 혜택 game_speed_up % (Vip 표, scripts/export_dpm_tables.py). 화면 시간 = 게임 시간 ÷ 배율.
 * 표에는 혜택이 열리는 레벨 (11) 행에만 값이 있고 그 위 레벨도 유지된다 → VIP 레벨 이하 행의 최댓값
 */
import { CONSTS } from '@/CONSTS';
import { tableRows, type RawTable } from '@/data/statTables';

const { PERCENT_DIVISOR } = CONSTS.dpm;

export function gameSpeedMultiplier(vipTable: RawTable | undefined, vipLevel: number): number {
  if (!vipTable) return 1;
  const speedUp = tableRows(vipTable)
    .filter((row) => Number(row.lv) <= vipLevel)
    .reduce((best, row) => Math.max(best, Number(row.gameSpeedUp) || 0), 0);
  return 1 + speedUp / PERCENT_DIVISOR;
}
