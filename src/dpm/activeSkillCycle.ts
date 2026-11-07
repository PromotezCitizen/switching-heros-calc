/**
 * 액티브 스킬 주기 (게임초). damage-pipeline.md 7절: 작업량 W = max(coolTime − 옵션 · 문양 초, 0) × (1 − skillCoolReduction / 100),
 * 게이지는 매 프레임 dt × 속도 만큼 차고, 속도 = 1 + (스탯 0x42 + 0x43) / 100 (T967 m5437).
 * 0x42 · 0x43 출처 (skill-gauge-accel-names.md): 카드 세트 "창공" (액티브 시전 뒤 3초만) 과 전용 무기 초월 행 (켜지는 대상에서 최대 중첩)
 */
import { CONSTS } from '@/CONSTS';
import { equippedExclusiveStar } from '@/calc/sources/heroWeaponCardPet/weapon';
import { skillCoolOptionSeconds, skillPerkCoolSeconds, skillRows } from '@/calc/sources/skill/skill';
import type { SummaryTarget } from '@/calc/sources/summary/summary';
import type { CalcValues } from '@/calc/types';
import { tableRows, type StatTables } from '@/data/statTables';
import type { StatReader } from '@/dpm/attackStats';

const { PERCENT_DIVISOR, ACTIVE_COOL } = CONSTS.dpm;
const TRANSCEND_TABLE = 'WeaponTranscend';

/** 1슬롯 히어로 전용 무기 초월의 상시 게이지 가속 % (그 대상에서 켜지는 행만, 최대 중첩) */
export function weaponCoolSpeedPercent(values: CalcValues, tables: StatTables, target: SummaryTarget): number {
  const transcend = tables[TRANSCEND_TABLE];
  if (!transcend) return 0;
  return ACTIVE_COOL.WEAPON_ROWS.reduce((sum, weapon) => {
    if (!(weapon.TARGETS as readonly string[]).includes(target)) return sum;
    if (equippedExclusiveStar(values, tables, weapon.WEAPON_ID) < weapon.STAR) return sum;
    const row = tableRows(transcend).find((candidate) => candidate.weaponType === weapon.WEAPON_ID && Number(candidate.star) === weapon.STAR);
    if (!row) return sum;
    const stacks = weapon.STACKS ? Number(row[weapon.STACKS]) || 0 : 1;
    return sum + (Number(row[weapon.VALUE]) || 0) * stacks;
  }, 0);
}

export interface ActiveCycleInput {
  coolTime: number;
  optionSeconds: number;
  coolReductionPercent: number;
  /** 상시 게이지 가속 % (무기 초월) */
  constantSpeedPercent: number;
  /** 시전 직후 잠깐 더해지는 가속 % (카드 세트 창공, 쌓인 수 반영) */
  burstSpeedPercent: number;
  burstSeconds: number;
}

/**
 * 주기 = 작업량 W 를 채우는 시간. 시전 직후 burstSeconds 동안은 속도 g + b, 그 뒤는 g (g = 1 + 상시 %, b = 시전 직후 %).
 * W ≤ burstSeconds × (g + b) 이면 W / (g + b), 아니면 burstSeconds + (W − burstSeconds × (g + b)) / g
 */
export function activeCooldownGameSeconds(input: ActiveCycleInput): number {
  const work = Math.max(input.coolTime - input.optionSeconds, 0) * (1 - input.coolReductionPercent / PERCENT_DIVISOR);
  const constant = 1 + input.constantSpeedPercent / PERCENT_DIVISOR;
  const burst = constant + input.burstSpeedPercent / PERCENT_DIVISOR;
  const burstWork = input.burstSeconds * burst;
  return work <= burstWork ? work / burst : input.burstSeconds + (work - burstWork) / constant;
}

/** 입력값 → 액티브 스킬 하나의 주기 (게임초). 스킬 행이 없으면 null */
export function activeSkillGameSeconds(
  values: CalcValues,
  tables: StatTables,
  read: StatReader,
  skillId: string,
  target: SummaryTarget,
): number | null {
  const row = skillRows(tables).find((candidate) => candidate.skillId === skillId);
  if (!row) return null;
  return activeCooldownGameSeconds({
    coolTime: Number(row.coolTime) || 0,
    optionSeconds: skillCoolOptionSeconds(values, tables, skillId) + skillPerkCoolSeconds(values, tables, skillId),
    coolReductionPercent: read.sum(ACTIVE_COOL.COOL_REDUCTION_STAT),
    constantSpeedPercent: weaponCoolSpeedPercent(values, tables, target),
    burstSpeedPercent: read.sum(ACTIVE_COOL.CARD_SET_STAT) * ACTIVE_COOL.CARD_SET_STACKS,
    burstSeconds: ACTIVE_COOL.CARD_SET_SECONDS,
  });
}
