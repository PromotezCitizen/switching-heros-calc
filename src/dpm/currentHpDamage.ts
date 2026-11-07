/**
 * 에이카 전용 무기 (1021) ★1: 교체 스킬이 보스에 맞을 때 "대상 현재 체력 × 15 %" 추가 피해 (claude-docs/react-port/current-hp-damage-2026-11-01.md).
 * - 교체해 들어올 때마다 한 번: 각성형 교체 스킬 (11216 · 11217) 은 첫 틱 (들어온 뒤 틱 간격 1초), 화살형 (1216~1218) 은 마지막 화살.
 * - 치명타 · 데미지 증가 같은 공통 곱은 안 붙는다 (피해 계산을 건너뛰는 종류로 넣음). 체력이 무한한 보스 (각성 · 길드 · 글로벌 · 악몽) 는 게임이 뺀다.
 * 그 시각의 남은 체력은 두 히어로를 합친 평균 대미지 속도 (분당 대미지) 로 깎였다고 보고 구한다 (교체 DPM 이 두 히어로 평균이라 같은 가정)
 */
import { CONSTS } from '@/CONSTS';
import { equippedExclusiveStar } from '@/calc/sources/heroWeaponCardPet/weapon';
import { rowsOf } from '@/calc/sources/heroWeaponCardPet/shared';
import type { CalcValues } from '@/calc/types';
import type { StatTables } from '@/data/statTables';
import { attributeFloorHpLog, stageMonsterHpLog } from '@/dpm/hpCondition';
import { changeSkillIdOf } from '@/dpm/statusEffects';
import { swapCycle, type SwapCycle } from '@/dpm/swapCycle';
import { fightSeconds, type DamageInputs, type DamageTarget } from '@/dpm/targetDamage';

const { AEIKA_WEAPON, SWAP, SWAP_SKILL_FREEZE, SWAP_ARROW_INTERVAL, HP_CONDITION, SECONDS_PER_MINUTE } = CONSTS.dpm;
const [HERO_FIELD] = SWAP.HERO_FIELDS;
const PERCENT = 100;

/** 교체해 들어오는 시각 (게임초). 첫 교체에 2슬롯 (slot 1) 이 들어오고, 그 뒤 교체마다 번갈아 */
export function swapInTimes(cycle: Pick<SwapCycle, 'firstSeconds' | 'fullSeconds'>, windowSeconds: number, slot: 0 | 1): number[] {
  const times: number[] = [];
  let entering: 0 | 1 = 1;
  for (let seconds = cycle.firstSeconds; seconds < windowSeconds; seconds += cycle.fullSeconds) {
    if (entering === slot) times.push(seconds);
    entering = entering === 1 ? 0 : 1;
  }
  return times;
}

/** 대상 보스 체력 log10 (층 입력이 없거나 표 밖이면 null) */
function bossHpLog(target: DamageTarget, inputs: DamageInputs): number | null {
  const hp = inputs.monsterHp;
  if (!hp) return null;
  if (target === 'stageBoss') return inputs.stageFloor === null ? null : stageMonsterHpLog(hp, inputs.stageFloor, true);
  if (target === 'attributeBoss') {
    return inputs.attributeDungeonFloor === null ? null : attributeFloorHpLog(hp, inputs.attributeDungeonFloor, HP_CONDITION.ATTRIBUTE_BOSS_KIND);
  }
  return null;
}

export interface CurrentHpBonus {
  /** 추가 피해까지 넣은 누적 대미지 log10 (보스 체력을 넘지 않음). 체력을 몰라 계산 못 하면 null */
  windowTotalLog: number | null;
  /** 추가 피해가 들어간 횟수 */
  hits: number;
}

/**
 * values = 1슬롯이 먼저 서는 입력값, swapped = 1 · 2슬롯을 바꾼 입력값. 이 효과가 없으면 (대상 · 무기 · 교체 스킬이 안 맞음) null.
 * perMinuteLog · windowTotalLog = 교체를 합친 결과 (추가 피해 전)
 */
export function aeikaCurrentHpBonus(
  values: CalcValues,
  swapped: CalcValues,
  tables: StatTables,
  target: DamageTarget,
  inputs: DamageInputs,
  perMinuteLog: number,
  windowTotalLog: number | null,
): CurrentHpBonus | null {
  if (!AEIKA_WEAPON.CURRENT_HP_TARGETS.includes(target)) return null;
  const windowSeconds = fightSeconds(values, tables, target);
  const cycle = swapCycle(tables);
  const row = rowsOf(tables, 'WeaponTranscend').find(
    (record) => record.weaponType === AEIKA_WEAPON.WEAPON_ID && record.statType === AEIKA_WEAPON.CURRENT_HP_STAT_TYPE,
  );
  const share = Number(row?.val1) / PERCENT;
  if (windowSeconds === null || !cycle || !(share > 0)) return null;
  // 효과가 터지는 시각: 전용 무기 ★1 을 낀 히어로가 교체해 들어온 뒤 (첫 틱 또는 마지막 화살)
  const times = ([0, 1] as const).flatMap((slot) => {
    const heroValues = slot === 0 ? values : swapped;
    if (equippedExclusiveStar(heroValues, tables, AEIKA_WEAPON.WEAPON_ID) < AEIKA_WEAPON.CURRENT_HP_STAR) return [];
    const spec = SWAP_SKILL_FREEZE[changeSkillIdOf(heroValues, tables, heroValues[HERO_FIELD]) ?? ''];
    if (!spec) return [];
    const delay = spec.shots > 0 ? (spec.shots - 1) * SWAP_ARROW_INTERVAL : spec.intervalSeconds;
    return swapInTimes(cycle, windowSeconds, slot)
      .map((seconds) => seconds + delay)
      .filter((seconds) => seconds < windowSeconds);
  });
  if (times.length === 0) return null;
  const hpLog = bossHpLog(target, inputs);
  if (hpLog === null || windowTotalLog === null) return { windowTotalLog: null, hits: 0 };
  // 체력 1 에 대한 비율로 센다 (큰 수라 log 로 들고 있다가 비율만 실수로)
  const ratePerSecondLog = perMinuteLog - Math.log10(SECONDS_PER_MINUTE);
  let bonus = 0;
  let hits = 0;
  for (const seconds of times.sort((left, right) => left - right)) {
    const remaining = 1 - Math.pow(10, ratePerSecondLog + Math.log10(seconds) - hpLog) - bonus;
    if (!(remaining > 0)) break;
    bonus += share * remaining;
    hits += 1;
  }
  const total = Math.min(1, Math.pow(10, windowTotalLog - hpLog) + bonus);
  return { windowTotalLog: hpLog + Math.log10(total), hits };
}
