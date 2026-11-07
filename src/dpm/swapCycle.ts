/**
 * 스위칭 사이클: 교체 게이지 (최대 hero_swap_cool, 시작 hero_swap_init_cool %) 가 차서 교체되는 시간 (게임 시간, 배속은 곱하지 않음).
 * 게이지는 dt × (1 + 충전 속도 / 100) 로 찬다 (damage-pipeline.md 3절).
 * 시작값 (hero_swap_init_cool) 은 전투 시작 때만 쓰인다: 첫 교체는 시작값에서 출발한다 (필요 게이지 = 최대 − 시작).
 * 교체할 때마다 교체 게이지가 0 으로 돌아가므로 (T309 m2275, damage-pipeline.md · sprite-animation.md 102 확정) 이후 교체는 처음부터 가득 채운다
 * (필요 게이지 = 최대). 옛 "시작값에서 다시 시작" 가정은 버렸다
 */
import { CONSTS } from '@/CONSTS';
import { rowsOf } from '@/calc/sources/heroWeaponCardPet/shared';
import type { StatTables } from '@/data/statTables';

const { OPTION_TABLE, SWAP, PERCENT_DIVISOR } = CONSTS.dpm;

export interface SwapCycle {
  /** 게이지 최대 · 시작 (게임초 단위로 센 양) 과 시작 비율 (%) */
  gaugeMax: number;
  gaugeStart: number;
  gaugeStartPercent: number;
  chargeSpeedPercent: number;
  /** 첫 교체까지 (시작값에서 출발, 게임초) */
  firstSeconds: number;
  /** 이후 교체 간격: 교체마다 게이지가 0 으로 돌아가 처음부터 가득 채운다 (게임초) */
  fullSeconds: number;
}

function optionInt(tables: StatTables, key: string): number | null {
  const row = rowsOf(tables, OPTION_TABLE).find((candidate) => candidate.key === key);
  const value = Number(row?.valueInt1);
  return row && Number.isFinite(value) ? value : null;
}

/** 설정표에 교체 게이지 값이 없으면 null */
export function swapCycle(tables: StatTables, chargeSpeedPercent = 0): SwapCycle | null {
  const gaugeMax = optionInt(tables, SWAP.COOL_KEY);
  const gaugeStartPercent = optionInt(tables, SWAP.INIT_COOL_KEY);
  if (gaugeMax === null || gaugeStartPercent === null) return null;
  const gaugeStart = (gaugeMax * gaugeStartPercent) / PERCENT_DIVISOR;
  const chargeFactor = 1 + chargeSpeedPercent / PERCENT_DIVISOR;
  return {
    gaugeMax,
    gaugeStart,
    gaugeStartPercent,
    chargeSpeedPercent,
    firstSeconds: (gaugeMax - gaugeStart) / chargeFactor,
    fullSeconds: gaugeMax / chargeFactor,
  };
}
