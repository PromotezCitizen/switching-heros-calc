/**
 * 검사 스킬 10개 (기습 · 회오리 베기 · 가로 베기 · 세로 베기 · 환영검 · 연속 베기 · 회전 베기 · 십자 베기 · 초승달 검기 · 필살 난무) 의
 * 시전 1번 적중 구조. 근거 식과 확신도는 claude-docs/react-port/catalog-skill-hits.md 3절 (코드 · 표 기준).
 * hits = 한 판정의 계수가 곱해지는 횟수의 기대값 (판정 수 × 맞는 적 수), coefficientFactor = 이 스킬 전용 옵션 · 문양이 계수에 더 곱하는 배수.
 * 확률 옵션은 기대값 (최고 등급 값 / 100). 문서가 "못 찾음" 이라 추정하거나 넣지 못한 몫은 estimates 에 표시를 남긴다
 */
import { CONSTS } from '@/CONSTS';
import { SKILL_EQUIP_SLOT_NUMBERS, chosenSkillOptions, chosenSkillPerks, skillEquipField, skillRows } from '@/calc/sources/skill/skill';
import type { CalcValues } from '@/calc/types';
import type { StatTables } from '@/data/statTables';
import { optionValue, perkNumber, perkOf, percentFactor, type SkillHits } from '@/dpm/archerSkillHits';
import { chanceOf } from '@/dpm/hitMultipliers';

const { SWORDSMAN_SKILLS: SWORDSMAN, PIERCE_EXTRA_TARGETS, PERCENT_DIVISOR } = CONSTS.dpm;

const UNSUPPORTED: SkillHits = { supported: false, hits: 0, coefficientFactor: 1 };

export function swordsmanSkillHits(values: CalcValues, tables: StatTables, skillId: string, targets: number): SkillHits {
  const row = skillRows(tables).find((candidate) => candidate.skillId === skillId);
  if (!row) return UNSUPPORTED;
  const value1 = Number(row.value1) || 0;
  const value2 = Number(row.value2) || 0;
  const value3 = Number(row.value3) || 0;
  const options = chosenSkillOptions(values, tables, skillId);
  const perks = chosenSkillPerks(values, tables, skillId);
  const equipped = new Set(SKILL_EQUIP_SLOT_NUMBERS.map((slot) => values[skillEquipField(slot)]).filter(Boolean));
  const hasAnyOption = (types: readonly string[]) => options.some((option) => types.includes(option.type));
  const pierceTargets = (pierce: number) => Math.min(targets, pierce + PIERCE_EXTRA_TARGETS);
  const found = (hits: number, coefficientFactor = 1, estimates: string[] = []): SkillHits => ({ supported: true, hits, coefficientFactor, estimates });

  switch (skillId) {
    case SWORDSMAN.DASH:
    case SWORDSMAN.CROSS_SLASH:
      // 판정 1번 × 겹친 적
      return found(targets);
    case SWORDSMAN.TORNADO: {
      // 회오리 하나는 판정 상자를 "한 번만 모드" ([상자+0x28] = 1, m5678 @2ffd008) 로 켜서 한 적을 최대 1번 친다
      // (claude-docs/react-port/skill-gaps-2026-11-05.md 4절, job-skills-active-2026-11-05.md). 예전 추정 (상자 지름 / 판정 간격 = 4번) 은 폐기.
      // 옵션 202: 확률로 0.25초 뒤 회오리 1개 더 (m5703, 상자 · 맞힌 목록이 따로라 첫 회오리에 맞은 적도 다시 맞음)
      const tornadoes = 1 + chanceOf(optionValue(options, SWORDSMAN.TORNADO_EXTRA_OPTION) ?? 0);
      return found(tornadoes * targets);
    }
    case SWORDSMAN.HORIZONTAL_SLASH:
    case SWORDSMAN.VERTICAL_SLASH: {
      // 판정 1번. 서로를 장착하면 확률로 다른 쪽을 한 번 더 (같은 계수 · 판정 1번으로 본다), 문양은 두 스킬 동시 장착일 때 계수 배수
      const horizontal = skillId === SWORDSMAN.HORIZONTAL_SLASH;
      const otherEquipped = equipped.has(horizontal ? SWORDSMAN.VERTICAL_SLASH : SWORDSMAN.HORIZONTAL_SLASH);
      const extraOption = optionValue(options, horizontal ? SWORDSMAN.HORIZONTAL_EXTRA_OPTION : SWORDSMAN.VERTICAL_EXTRA_OPTION);
      const comboPerk = perkOf(perks, SWORDSMAN.COMBO_PERK);
      return found(targets * (1 + (otherEquipped ? chanceOf(extraOption ?? 0) : 0)), comboPerk && otherEquipped ? percentFactor(perkNumber(comboPerk, 'val1')) : 1);
    }
    case SWORDSMAN.PHANTOM_SWORD: {
      // 환영검 value2 개 × 유도 투사체, 관통 value3 (옵션 500 이면 관통 포기 + 데미지), 옵션 501: 확률로 2배
      const noPierce = optionValue(options, SWORDSMAN.PHANTOM_NO_PIERCE_OPTION);
      const double = optionValue(options, SWORDSMAN.PHANTOM_DOUBLE_OPTION);
      let factor = noPierce === undefined ? 1 : percentFactor(noPierce);
      if (double !== undefined) factor *= 1 + (SWORDSMAN.DOUBLE_FACTOR - 1) * chanceOf(double);
      return found(Math.floor(value2) * pierceTargets(noPierce === undefined ? Math.floor(value3) : 1), factor);
    }
    case SWORDSMAN.MULTI_SLASH: {
      // 판정 n 번 (n = value1, 문양이면 절반), 옵션 600: 확률로 4번 더. 검기 옵션은 넣지 못함
      const perk = perkOf(perks, SWORDSMAN.MULTI_SLASH_PERK);
      const slashes = (perk ? Math.floor(Math.floor(value1) / 2) : Math.floor(value1)) + SWORDSMAN.MULTI_SLASH_EXTRA_COUNT * chanceOf(optionValue(options, SWORDSMAN.MULTI_SLASH_EXTRA_OPTION) ?? 0);
      const estimates = hasAnyOption(SWORDSMAN.MULTI_SLASH_AURA_OPTIONS) ? [SWORDSMAN.ESTIMATE_AURA_NOT_COUNTED] : [];
      return found(slashes * targets, perk ? percentFactor(perkNumber(perk, 'val1')) : 1, estimates);
    }
    case SWORDSMAN.WHEEL_SLASH: {
      // 시전자를 따라 도는 상자: 지속 D 동안 간격 I 마다 판정 (첫 판정 0.02초)
      const half = optionValue(options, SWORDSMAN.WHEEL_HALF_OPTION);
      const perk = perkOf(perks, SWORDSMAN.WHEEL_PERK);
      const duration =
        (value1 + (optionValue(options, SWORDSMAN.WHEEL_DURATION_OPTION) ?? 0)) *
        (half === undefined ? 1 : SWORDSMAN.HALF_FACTOR) *
        (perk ? 1 - perkNumber(perk, 'val1') / PERCENT_DIVISOR : 1);
      const interval = value2 / (1 + (half ?? 0) / PERCENT_DIVISOR);
      const ticks = interval > 0 ? Math.floor((duration - SWORDSMAN.WHEEL_FIRST_TICK_SECONDS) / interval) + 1 : 1;
      return found(Math.max(ticks, 1) * targets, perk ? percentFactor(perkNumber(perk, 'val2')) : 1);
    }
    case SWORDSMAN.CRESCENT: {
      // 초승달 value2 개 (옵션 901: 확률로 2개 더) × 관통 value3 + 옵션 900
      const count = Math.floor(value2) + SWORDSMAN.CRESCENT_EXTRA_COUNT * chanceOf(optionValue(options, SWORDSMAN.CRESCENT_EXTRA_OPTION) ?? 0);
      return found(count * pierceTargets(Math.floor(value3) + (optionValue(options, SWORDSMAN.CRESCENT_PIERCE_OPTION) ?? 0)));
    }
    case SWORDSMAN.LETHAL_SLASH: {
      // 판정 n 번 (n = value1 + 옵션 1000, 문양이면 절반), 옵션 1003: 데미지 (1 + v/100) × 1.45
      const perk = perkOf(perks, SWORDSMAN.LETHAL_PERK);
      const total = Math.floor(value1) + Math.floor(optionValue(options, SWORDSMAN.LETHAL_COUNT_OPTION) ?? 0);
      const damage = optionValue(options, SWORDSMAN.LETHAL_DAMAGE_OPTION);
      let factor = perk ? percentFactor(perkNumber(perk, 'val1')) : 1;
      if (damage !== undefined) factor *= percentFactor(damage) * SWORDSMAN.LETHAL_DAMAGE_BONUS;
      const estimates = hasAnyOption([SWORDSMAN.LETHAL_AURA_OPTION]) ? [SWORDSMAN.ESTIMATE_AURA_NOT_COUNTED] : [];
      return found((perk ? Math.floor(total / 2) : total) * targets, factor, estimates);
    }
    default:
      return UNSUPPORTED;
  }
}
