/**
 * 마법사 스킬 10개 (화염구, 서릿발, 낙뢰, 전류 이동, 번개 사슬, 중력장, 불기둥, 번개창, 눈보라, 얼음창) 의
 * 시전 (버프 스킬은 발동) 1번 적중 구조. 근거 식과 확신도는 claude-docs/react-port/catalog-skill-hits.md 6절,
 * job-skills-active-2026-11-05.md 4절 (중력장 정정, 반복 상자 확인), job-skills-buff-2026-11-05.md 3절.
 * hits = 한 판정의 계수가 곱해지는 횟수의 기대값 (판정 수 × 맞는 적 수), coefficientFactor = 이 스킬 전용 옵션, 문양이 계수에 더 곱하는 배수.
 * 확률 옵션은 chanceOf 기대값. 넣지 못한 몫은 estimates 에 표시를 남긴다
 */
import { CONSTS } from '@/CONSTS';
import { chosenSkillOptions, chosenSkillPerks, skillRows } from '@/calc/sources/skill/skill';
import type { CalcValues } from '@/calc/types';
import type { StatTables } from '@/data/statTables';
import { optionValue, perkNumber, perkOf, percentFactor, type SkillHits } from '@/dpm/archerSkillHits';
import { repeatedTicks } from '@/dpm/fighterSkillHits';
import { chanceOf } from '@/dpm/hitMultipliers';

const { MAGE_SKILLS: MAGE, PIERCE_EXTRA_TARGETS } = CONSTS.dpm;

const UNSUPPORTED: SkillHits = { supported: false, hits: 0, coefficientFactor: 1 };

/** statusCount = 대상에 걸린 상태이상 수 (0 보다 크면 "상태이상인 적" 조건 문양이 켜진다) */
export function mageSkillHits(values: CalcValues, tables: StatTables, skillId: string, targets: number, statusCount = 0): SkillHits {
  const row = skillRows(tables).find((candidate) => candidate.skillId === skillId);
  if (!row) return UNSUPPORTED;
  const value1 = Number(row.value1) || 0;
  const value2 = Number(row.value2) || 0;
  const value3 = Number(row.value3) || 0;
  const options = chosenSkillOptions(values, tables, skillId);
  const perks = chosenSkillPerks(values, tables, skillId);
  const has = (type: string) => optionValue(options, type) !== undefined;
  const found = (hits: number, coefficientFactor = 1, estimates: string[] = []): SkillHits => ({ supported: true, hits, coefficientFactor, estimates });
  const perkFactor = (perkType: string, column: 'val1' | 'val2' | 'val3') => {
    const perk = perkOf(perks, perkType);
    return perk ? percentFactor(perkNumber(perk, column)) : 1;
  };
  const pierceTargets = (pierce: number) => Math.min(targets, pierce + PIERCE_EXTRA_TARGETS);

  switch (skillId) {
    case MAGE.FIRE_BALL: {
      // 폭발 판정 1번, 옵션 3100: 확률로 화염구 2회
      const times = 1 + chanceOf(optionValue(options, MAGE.FIRE_BALL_TWICE_OPTION) ?? 0);
      return found(times * targets, perkFactor(MAGE.FIRE_BALL_PERK, 'val1'));
    }
    case MAGE.FROST_STRIKE:
      // 판정 1번. 문양은 상태이상인 적에게만
      return found(targets, statusCount > 0 ? perkFactor(MAGE.FROST_STRIKE_PERK, 'val1') : 1);
    case MAGE.LIGHTNING_STRIKE:
      // 판정 1번. 연속 발동 문양은 넣지 못함
      return found(targets, 1, perkOf(perks, MAGE.LIGHTNING_STRIKE_PERK) ? [MAGE.ESTIMATE_STACK_PERK_NOT_COUNTED] : []);
    case MAGE.BLINK:
      // 도착 지점 판정 1번. 옵션 3400 의 번개 사슬 (305 계수) 은 넣지 못함
      return found(targets, 1, has(MAGE.BLINK_CHAIN_OPTION) ? [MAGE.ESTIMATE_TRIGGERED_SKILL_NOT_COUNTED] : []);
    case MAGE.CHAIN_LIGHTNING: {
      // 서로 다른 적 min(T, value1) 마리에 1번씩, 문양이면 대상 수 절반
      const perk = perkOf(perks, MAGE.CHAIN_LIGHTNING_PERK);
      const chain = perk ? Math.floor(Math.floor(value1) / MAGE.CHAIN_HALF_DIVISOR) : Math.floor(value1);
      return found(Math.min(targets, chain), perk ? percentFactor(perkNumber(perk, 'val1')) : 1);
    }
    case MAGE.GRAVITY: {
      // 폭발 판정 1번 (순간이동 판정 없음), 문양: val1 % 확률로 한 번 더
      const perk = perkOf(perks, MAGE.GRAVITY_PERK);
      return found((1 + (perk ? chanceOf(perkNumber(perk, 'val1')) : 0)) * targets);
    }
    case MAGE.FIRE_WALL: {
      // 판정 int(value2) 번, 옵션 3700: 확률로 통째 2회
      const times = 1 + chanceOf(optionValue(options, MAGE.FIRE_WALL_TWICE_OPTION) ?? 0);
      return found(times * Math.floor(value2) * targets);
    }
    case MAGE.LIGHTNING_SPEAR: {
      // 첫 판정 0.02초, 간격 I, 지속 D. 문양 (번개 폭풍) 은 같은 판정에 데미지 val1 배
      const half = has(MAGE.LIGHTNING_SPEAR_HALF_OPTION);
      const duration = (value1 + (optionValue(options, MAGE.LIGHTNING_SPEAR_DURATION_OPTION) ?? 0)) * (half ? MAGE.HALF_FACTOR : 1);
      const interval = value2 / percentFactor(optionValue(options, MAGE.LIGHTNING_SPEAR_HALF_OPTION) ?? 0);
      const perk = perkOf(perks, MAGE.LIGHTNING_SPEAR_PERK);
      return found(repeatedTicks(duration, MAGE.TICK_FIRST_SECONDS, interval) * targets, perk ? perkNumber(perk, 'val1') : 1);
    }
    case MAGE.BLIZZARD: {
      // 첫 판정 0.02초, 간격 I, 지속 D
      const duration = value1 + (optionValue(options, MAGE.BLIZZARD_DURATION_OPTION) ?? 0);
      const interval = value2 / percentFactor(optionValue(options, MAGE.BLIZZARD_INTERVAL_OPTION) ?? 0);
      return found(repeatedTicks(duration, MAGE.TICK_FIRST_SECONDS, interval) * targets, perkFactor(MAGE.BLIZZARD_PERK, 'val2'));
    }
    case MAGE.ICE_SPEAR: {
      // 큰 창 판정 1번 (옵션 4002 이면 없음) + 작은 유도 창 n 개 × value2 배 × 관통 (value3 + 옵션 4002)
      const noBig = optionValue(options, MAGE.ICE_SPEAR_NO_BIG_OPTION);
      const small = Math.floor(value1) + MAGE.ICE_SPEAR_EXTRA_COUNT * chanceOf(optionValue(options, MAGE.ICE_SPEAR_EXTRA_OPTION) ?? 0);
      const big = noBig === undefined ? targets : 0;
      return found(big + small * value2 * pierceTargets(Math.floor(value3) + Math.floor(noBig ?? 0)), perkFactor(MAGE.ICE_SPEAR_PERK, 'val2'));
    }
    default:
      return UNSUPPORTED;
  }
}
