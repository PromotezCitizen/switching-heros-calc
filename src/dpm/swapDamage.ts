/**
 * 자동 교체를 넣은 대상 대미지: 1슬롯 · 2슬롯 히어로를 바꾼 입력값으로 두 히어로의 공격 한 번씩 대미지를 각각 계산해 더한다.
 * 두 히어로의 장착 스킬 · 전용 무기 장착은 저장 가져오기가 `skillEquip2_<칸>` · `exclusiveEquipped2` 로 채운다.
 * 교체 등장 후 지속 효과 (얼티밋 HeroSwap) 는 최대 상태라 늘 켜짐 (입력칸 swapUptimePercent 를 100 으로)
 */
import { CONSTS } from '@/CONSTS';
import { SKILL_EQUIP_SLOT_NUMBERS, skillEquipField } from '@/calc/sources/skill/skill';
import type { CalcValues } from '@/calc/types';
import type { StatTables } from '@/data/statTables';
import {
  logSum,
  targetDamage,
  type DamageInputs,
  type DamagePart,
  type DamageTarget,
  type TargetDamage,
} from '@/dpm/targetDamage';

const { SWAP } = CONSTS.dpm;
const { SWAP_UPTIME_FIELD } = CONSTS.masteryRuneBuff;
const [HERO_FIELD, SECOND_HERO_FIELD] = SWAP.HERO_FIELDS;
const [EQUIPPED_FIELD, SECOND_EQUIPPED_FIELD] = SWAP.EQUIPPED_FIELDS;
const NO_HERO_CODE = 'noHero';

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

function withUptime(values: CalcValues): CalcValues {
  return { ...values, [SWAP_UPTIME_FIELD]: String(SWAP.HERO_SWAP_EFFECT_UPTIME_PERCENT) };
}

function heroParts(result: TargetDamage, hero: string): DamagePart[] {
  return result.parts.map((part) => ({ ...part, hero }));
}

/** 자동 교체: 두 히어로의 공격 한 번씩 대미지를 모두 더한다. 교체 등장 후 지속 효과는 최대 상태라 두 히어로 모두 늘 켜짐 */
export function targetDamageWithSwap(
  values: CalcValues,
  tables: StatTables,
  target: DamageTarget,
  inputs: DamageInputs,
): TargetDamage {
  const swapped = inputs.swap ? swappedHeroValues(values) : null;
  if (!swapped) return targetDamage(values, tables, target, inputs);
  const second = targetDamage(withUptime(swapped), tables, target, inputs);
  // 2슬롯 히어로를 계산하지 못하면 (표에 없는 이름 등) 교체 없이 1슬롯만으로 둔다
  if (second.missing.includes(NO_HERO_CODE)) return targetDamage(values, tables, target, inputs);
  const first = targetDamage(withUptime(values), tables, target, inputs);
  const parts = [...heroParts(first, values[HERO_FIELD]), ...heroParts(second, values[SECOND_HERO_FIELD])];
  const missing = [...new Set([...first.missing, ...second.missing])];
  return { target, totalLog: logSum(parts.map((part) => part.damagePerCastLog)), parts, missing };
}
