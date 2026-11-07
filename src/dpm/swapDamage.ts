/**
 * 자동 교체를 넣은 대상 대미지: 1슬롯 · 2슬롯 히어로를 바꾼 입력값으로 두 히어로의 대미지를 각각 계산해,
 * 필드에 서는 시간 비율 (같다고 둠, CONSTS.dpm.SWAP.TIME_SHARE) 로 합친다. 교체 스킬 대미지는 못 넣는다 (빠진 몫 표시).
 * 두 히어로의 장착 스킬 · 전용 무기 장착은 저장 가져오기가 `skillEquip2_<칸>` · `exclusiveEquipped2` 로 채운다.
 * 교체 등장 후 지속 효과 (얼티밋 HeroSwap) 는 "교체 이후" 에만 걸린다: 켜진 시간 비율을 입력칸 swapUptimePercent 로 넣는다
 */
import { CONSTS } from '@/CONSTS';
import { SKILL_EQUIP_SLOT_NUMBERS, skillEquipField } from '@/calc/sources/skill/skill';
import type { CalcValues } from '@/calc/types';
import type { StatTables } from '@/data/statTables';
import { aeikaCurrentHpBonus } from '@/dpm/currentHpDamage';
import { swapCycle } from '@/dpm/swapCycle';
import { fightSeconds, logSum, prepareTargetDamage, targetDamage, type DamageInputs, type DamagePart, type DamageTarget, type TargetDamage } from '@/dpm/targetDamage';

const { SWAP } = CONSTS.dpm;
const { SWAP_UPTIME_FIELD } = CONSTS.masteryRuneBuff;
const [HERO_FIELD, SECOND_HERO_FIELD] = SWAP.HERO_FIELDS;
const [EQUIPPED_FIELD, SECOND_EQUIPPED_FIELD] = SWAP.EQUIPPED_FIELDS;
const NO_HERO_CODE = 'noHero';
/** 빠진 몫 · 안내 표시: 현재 체력 % 추가 피해를 넣었음 (`:횟수`) / 보스 체력 (층) 을 몰라 못 넣음 */
const CURRENT_HP_INCLUDED_CODE = 'aeikaCurrentHpIncluded';
const CURRENT_HP_NO_HP_CODE = 'aeikaCurrentHpNoFloor';

/** 1슬롯과 2슬롯 히어로 (이름 · 장착 스킬 · 전용 무기 장착) 를 서로 바꾼 입력값. 2슬롯 히어로가 없으면 null */
export function swappedHeroValues(values: CalcValues): CalcValues | null {
  if (!values[HERO_FIELD] || !values[SECOND_HERO_FIELD]) return null;
  const swapped: CalcValues = {
    ...values,
    [HERO_FIELD]: values[SECOND_HERO_FIELD],
    [SECOND_HERO_FIELD]: values[HERO_FIELD],
    [EQUIPPED_FIELD]: values[SECOND_EQUIPPED_FIELD] ?? '',
    [SECOND_EQUIPPED_FIELD]: values[EQUIPPED_FIELD] ?? '',
    [SWAP.SWAPPED_FIELD]: 'true',
  };
  const [firstSssField, secondSssField] = SWAP.SSS_OPTION_COUNT_FIELDS;
  swapped[firstSssField] = values[secondSssField] ?? '';
  swapped[secondSssField] = values[firstSssField] ?? '';
  for (const slot of SKILL_EQUIP_SLOT_NUMBERS) {
    const first = skillEquipField(slot);
    const second = `${SWAP.SECOND_SKILL_EQUIP_PREFIX}${slot}`;
    swapped[first] = values[second] ?? '';
    swapped[second] = values[first] ?? '';
  }
  for (const [firstPrefix, secondPrefix] of SWAP.OPTION_FIELD_PAIRS) {
    for (let index = 1; index <= SWAP.OPTION_ROWS; index++) {
      const first = `${firstPrefix}${index}`;
      const second = `${secondPrefix}${index}`;
      swapped[first] = values[second] ?? '';
      swapped[second] = values[first] ?? '';
    }
  }
  return swapped;
}

export interface SwapEffectUptimes {
  /** 먼저 필드에 서 있는 히어로 (1슬롯) */
  first: number;
  /** 교체해서 나오는 히어로 (2슬롯) */
  second: number;
}

/**
 * 교체 등장 후 지속 효과 ("교체해 등장 시 20초간") 가 켜진 시간 비율 (%). 선행 조건은 "교체 이후" 하나뿐이라 그 뒤로는 100%:
 * - 교체해서 나오는 히어로는 등장하는 순간부터 켜진다. 교체 간격 (4.5게임초 · 18게임초) 이 20초보다 짧아 이어서 계속 켜져 있다.
 * - 먼저 서 있는 히어로는 첫 교체 전까지 효과가 없다. 시간이 정해진 대상 (보스 · 던전) 은 그만큼 뺀다.
 *   스테이지 (긴 시간 평균) 는 첫 구간이 무시할 만해서 100%
 */
export function swapEffectUptimes(values: CalcValues, tables: StatTables, target: DamageTarget): SwapEffectUptimes {
  const full = SWAP.HERO_SWAP_EFFECT_UPTIME_PERCENT;
  const window = fightSeconds(values, tables, target);
  const cycle = swapCycle(tables);
  if (window === null || !cycle) return { first: full, second: full };
  const firstHeroFieldSeconds = window * SWAP.TIME_SHARE;
  const beforeFirstSwap = Math.min(cycle.firstSeconds, firstHeroFieldSeconds);
  return { first: full * (1 - beforeFirstSwap / firstHeroFieldSeconds), second: full };
}

function withUptime(values: CalcValues, percent: number): CalcValues {
  return { ...values, [SWAP_UPTIME_FIELD]: String(percent) };
}

function sharedParts(result: TargetDamage, hero: string, shareLog: number): DamagePart[] {
  return result.parts.map((part) => ({ ...part, hero, perMinuteLog: part.perMinuteLog + shareLog }));
}

export function targetDamageWithSwap(values: CalcValues, tables: StatTables, target: DamageTarget, inputs: DamageInputs): TargetDamage {
  const swapped = inputs.swap ? swappedHeroValues(values) : null;
  if (!swapped) return targetDamage(values, tables, target, inputs);
  const uptimes = swapEffectUptimes(values, tables, target);
  const secondPrepared = prepareTargetDamage(withUptime(swapped, uptimes.second), tables, target, inputs);
  const firstPrepared = prepareTargetDamage(withUptime(values, uptimes.first), tables, target, inputs);
  // 대상 상태이상 수는 두 히어로 장착 스킬이 거는 것을 합쳐 센다 ("1 진행").
  // 각 히어로는 필드에 서 있는 동안만 시전하므로 시전 간격을 서 있는 몫 (TIME_SHARE) 으로 나눠 늘린다 (교체 주기 안의 몰림은 무시, 추정).
  // 한 번 걸린 상태이상은 지속시간 동안 남으므로 교체해도 다른 히어로 차례에 그대로 센다
  const sharedSkillSources = [...firstPrepared.skillStatusSources, ...secondPrepared.skillStatusSources].map((source) => ({
    ...source,
    intervalSeconds: source.intervalSeconds / SWAP.TIME_SHARE,
  }));
  const second = secondPrepared.finish(sharedSkillSources);
  // 2슬롯 히어로를 계산하지 못하면 (표에 없는 이름 등) 교체 없이 1슬롯만으로 둔다
  if (second.missing.includes(NO_HERO_CODE)) return targetDamage(values, tables, target, inputs);
  const first = firstPrepared.finish(sharedSkillSources);
  const shareLog = Math.log10(SWAP.TIME_SHARE);
  const parts = [...sharedParts(first, values[HERO_FIELD], shareLog), ...sharedParts(second, values[SECOND_HERO_FIELD], shareLog)];
  const perMinuteLog = logSum(parts.map((part) => part.perMinuteLog));
  let windowTotalLog =
    first.windowTotalLog === null || second.windowTotalLog === null ? null : logSum([first.windowTotalLog + shareLog, second.windowTotalLog + shareLog]);
  const missing = [...new Set([...first.missing, ...second.missing])];
  // 에이카 전용 무기 ★1: 교체해 들어올 때 보스 현재 체력 × 15 % (체력이 유한한 보스 대상만)
  const bonus = aeikaCurrentHpBonus(values, swapped, tables, target, inputs, perMinuteLog, windowTotalLog);
  if (bonus) {
    if (bonus.windowTotalLog === null) missing.push(CURRENT_HP_NO_HP_CODE);
    else {
      windowTotalLog = bonus.windowTotalLog;
      missing.push(`${CURRENT_HP_INCLUDED_CODE}:${bonus.hits}`);
    }
  }
  return { target, perMinuteLog, windowSeconds: first.windowSeconds, windowTotalLog, parts, missing };
}
