/**
 * 격투가 스킬 10개 (지면 강타, 분노, 할퀴기, 용의 가호, 돌진 펀치, 연속 펀치, 기공장, 어퍼컷, 원투 펀치, 몸통 박치기) 의
 * 시전 (버프 스킬은 발동) 1번 적중 구조. 근거 식과 확신도는 claude-docs/react-port/catalog-skill-hits.md 4절,
 * job-skills-active-2026-11-05.md 2절, job-skills-buff-2026-11-05.md 2~3절.
 * hits = 한 판정의 계수가 곱해지는 횟수의 기대값 (판정 수 × 맞는 적 수), coefficientFactor = 이 스킬 전용 옵션, 문양이 계수에 더 곱하는 배수.
 * 확률 옵션은 chanceOf 기대값. 넣지 못한 몫은 estimates 에 표시를 남긴다
 */
import { CONSTS } from '@/CONSTS';
import { chosenSkillOptions, chosenSkillPerks, skillOptionSum, skillRows } from '@/calc/sources/skill/skill';
import type { CalcValues } from '@/calc/types';
import type { StatTables } from '@/data/statTables';
import { optionValue, perkNumber, perkOf, percentFactor, type SkillHits } from '@/dpm/archerSkillHits';
import { chanceOf } from '@/dpm/hitMultipliers';

const { FIGHTER_SKILLS: FIGHTER, PERCENT_DIVISOR } = CONSTS.dpm;
const { BUFF_DURATION_OPTION_TYPE } = CONSTS.skill;

const UNSUPPORTED: SkillHits = { supported: false, hits: 0, coefficientFactor: 1 };

/** 반복 판정 상자의 판정 수: 첫 판정 first 초, 이후 interval 간격, 지속 duration 초까지 (최소 1번) */
export function repeatedTicks(duration: number, first: number, interval: number): number {
  if (!(interval > 0)) return 1;
  return Math.max(Math.floor((duration - first) / interval) + 1, 1);
}

/** statusCount = 대상에 걸린 상태이상 수 (0 보다 크면 "상태이상인 적" 조건 문양이 켜진다) */
export function fighterSkillHits(values: CalcValues, tables: StatTables, skillId: string, targets: number, statusCount = 0): SkillHits {
  const row = skillRows(tables).find((candidate) => candidate.skillId === skillId);
  if (!row) return UNSUPPORTED;
  const value1 = Number(row.value1) || 0;
  const value3 = Number(row.value3) || 0;
  const options = chosenSkillOptions(values, tables, skillId);
  const perks = chosenSkillPerks(values, tables, skillId);
  const has = (type: string) => optionValue(options, type) !== undefined;
  const found = (hits: number, coefficientFactor = 1, estimates: string[] = []): SkillHits => ({ supported: true, hits, coefficientFactor, estimates });
  const perkFactor = (perkType: string, column: 'val1' | 'val2' | 'val3') => {
    const perk = perkOf(perks, perkType);
    return perk ? percentFactor(perkNumber(perk, column)) : 1;
  };

  switch (skillId) {
    case FIGHTER.GROUND_SMASH: {
      // 판정 1번, 옵션 1101: 확률로 0.3초 뒤 1번 더. 문양은 상태이상인 적에게만
      const times = 1 + chanceOf(optionValue(options, FIGHTER.GROUND_SMASH_EXTRA_OPTION) ?? 0);
      return found(times * targets, statusCount > 0 ? perkFactor(FIGHTER.GROUND_SMASH_PERK, 'val1') : 1);
    }
    case FIGHTER.RAGE:
      // 광역 판정 1번 (분노 공격력 버프는 대미지 판정과 따로)
      return found(targets);
    case FIGHTER.CLAW: {
      // 판정 4번, 옵션 1300: 확률로 7번
      const times = FIGHTER.CLAW_HITS + FIGHTER.CLAW_EXTRA_HITS * chanceOf(optionValue(options, FIGHTER.CLAW_EXTRA_OPTION) ?? 0);
      return found(times * targets, perkFactor(FIGHTER.CLAW_PERK, 'val3'));
    }
    case FIGHTER.DRAGON_WHEEL: {
      // 켜질 때 지속 동안 간격 I 마다 판정
      const duration = (Number(row.buffDuration) || 0) + skillOptionSum(values, tables, skillId, BUFF_DURATION_OPTION_TYPE);
      const intervalPerk = perkOf(perks, FIGHTER.DRAGON_WHEEL_INTERVAL_PERK);
      const interval =
        value1 /
        (intervalPerk ? percentFactor(perkNumber(intervalPerk, 'val1')) : 1) /
        percentFactor(optionValue(options, FIGHTER.DRAGON_WHEEL_INTERVAL_OPTION) ?? 0);
      const factor = FIGHTER.DRAGON_WHEEL_DAMAGE_PERKS.reduce((product, perkType) => product * perkFactor(perkType, 'val2'), 1);
      return found(repeatedTicks(duration, FIGHTER.DRAGON_WHEEL_FIRST_TICK_SECONDS, interval) * targets, factor);
    }
    case FIGHTER.DASH_PUNCH:
      // 판정 1번 (기습과 같은 효과). 연속 적중 문양은 넣지 못함
      return found(targets, 1, perkOf(perks, FIGHTER.DASH_PUNCH_PERK) ? [FIGHTER.ESTIMATE_STACK_PERK_NOT_COUNTED] : []);
    case FIGHTER.MULTI_PUNCH:
      // 판정 int(value1) + int(옵션 1600) 번
      return found((Math.floor(value1) + Math.floor(optionValue(options, FIGHTER.MULTI_PUNCH_EXTRA_OPTION) ?? 0)) * targets);
    case FIGHTER.WIND_SPHERE: {
      // 첫 판정 0.5초, 간격 I, 지속 D
      const half = has(FIGHTER.WIND_SPHERE_HALF_OPTION);
      const perk = perkOf(perks, FIGHTER.WIND_SPHERE_PERK);
      const duration =
        (FIGHTER.WIND_SPHERE_BASE_SECONDS + (optionValue(options, FIGHTER.WIND_SPHERE_DURATION_OPTION) ?? 0)) *
        (half ? FIGHTER.HALF_FACTOR : 1) *
        (perk ? 1 - perkNumber(perk, 'val1') / PERCENT_DIVISOR : 1);
      const interval = Math.max(FIGHTER.WIND_SPHERE_MIN_INTERVAL, value1 / percentFactor(optionValue(options, FIGHTER.WIND_SPHERE_HALF_OPTION) ?? 0));
      const estimates = has(FIGHTER.WIND_SPHERE_EXPLODE_OPTION) ? [FIGHTER.ESTIMATE_EXPLODE_OPTION_NOT_COUNTED] : [];
      return found(
        repeatedTicks(duration, FIGHTER.WIND_SPHERE_FIRST_TICK_SECONDS, interval) * targets,
        perk ? percentFactor(perkNumber(perk, 'val2')) : 1,
        estimates,
      );
    }
    case FIGHTER.UPPERCUT: {
      // 판정 int(value1) 번, 옵션 1800 이면 2번 더
      const times = Math.floor(value1) + (has(FIGHTER.UPPERCUT_EXTRA_OPTION) ? FIGHTER.UPPERCUT_EXTRA_HITS : 0);
      return found(times * targets, perkFactor(FIGHTER.UPPERCUT_PERK, 'val2'));
    }
    case FIGHTER.ONE_TWO_PUNCH:
      // 판정 2번, 두 번째는 value1 배 → 계수 합 (1 + value1)
      return found((FIGHTER.ONE_TWO_FIRST_HITS + value1) * targets, perkFactor(FIGHTER.ONE_TWO_PERK, 'val2'));
    case FIGHTER.BODY_SLAM: {
      // 첫 판정 0.1초, 간격 value3, 지속 D
      const lengthen = optionValue(options, FIGHTER.BODY_SLAM_DURATION_OPTION);
      const half = optionValue(options, FIGHTER.BODY_SLAM_HALF_OPTION);
      const perk = perkOf(perks, FIGHTER.BODY_SLAM_PERK);
      const duration =
        value1 *
        (lengthen === undefined ? 1 : percentFactor(lengthen)) *
        (half === undefined ? 1 : FIGHTER.HALF_FACTOR) *
        (perk ? 1 - perkNumber(perk, 'val1') / PERCENT_DIVISOR : 1);
      let factor = half === undefined ? 1 : percentFactor(half);
      if (perk) factor *= percentFactor(perkNumber(perk, 'val2'));
      return found(repeatedTicks(duration, FIGHTER.BODY_SLAM_FIRST_TICK_SECONDS, value3) * targets, factor);
    }
    default:
      return UNSUPPORTED;
  }
}
