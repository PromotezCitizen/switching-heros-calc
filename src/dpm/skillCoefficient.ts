/**
 * 직업 스킬 한 발 계수 (1 = 공격력 100%). damage-pipeline.md 3-3 (m5436):
 * 레벨 식 (damage + damageUp × (레벨 − 1)) / 100 × 고른 옵션 곱 × SS 세트 배수 × 고른 문양 대미지 곱.
 * 레벨 = 입력 레벨 + 문양 "레벨 +N". 옵션 값은 최고 등급, 문양 대미지가 계수에 곱해지는 것은 문구 기준 (퍽 키 대응 미확인)
 */
import { CONSTS } from '@/CONSTS';
import { chosenSkillOptions, chosenSkillPerks, skillLevel, skillRows, skillRuneValue } from '@/calc/sources/skill/skill';
import type { SummaryTarget } from '@/calc/sources/summary/summary';
import type { CalcValues } from '@/calc/types';
import type { StatTables, TableRow } from '@/data/statTables';

const { PERCENT_DIVISOR, SKILL_COEFFICIENT: COEFFICIENT } = CONSTS.dpm;

export interface SkillCoefficientInput {
  skillId: string;
  target: SummaryTarget;
  /** 이 스킬 한 번에 맞는 적 수 (보스 · 히어로는 1) */
  targets: number;
  /** 1슬롯 히어로 속성 (Character.attribute: Fire / Water / Earth) */
  heroAttribute: string | undefined;
}

export interface SkillCoefficient {
  /** 한 발 계수 log10. 스킬 행이 없거나 레벨 0 이면 -Infinity */
  coefficientLog: number;
  /** 계산에 쓴 레벨 (입력 + 문양) */
  level: number;
  /** 고른 옵션 수 (모두 최고 등급 SS 로 보므로 SS 옵션 수) */
  ssOptionCount: number;
}

const perkValue = (row: TableRow, column: 'val1' | 'val2') => Number(row[column]) || 0;
const isOneOf = (names: readonly string[], name: string) => names.includes(name);

/** SS 세트 배수: 옵션 n 개 ≥ 2 이면 all_ss_stats_value 의 값[n − 2] (칸이 모자라면 마지막 값) × (1 + 문양 세트 효과 % / 100) */
export function ssSetMultiplier(ssValues: string, optionCount: number, setValuePercent: number): number {
  if (optionCount < COEFFICIENT.SS_SET_FROM_COUNT) return 1;
  const values = ssValues.split(COEFFICIENT.SS_SET_SEPARATOR).map(Number).filter((value) => value > 0);
  if (values.length === 0) return 1;
  const value = values[Math.min(optionCount - COEFFICIENT.SS_SET_FROM_COUNT, values.length - 1)];
  return value * (1 + setValuePercent / PERCENT_DIVISOR);
}

export function skillCoefficient(values: CalcValues, tables: StatTables, input: SkillCoefficientInput): SkillCoefficient {
  const row = skillRows(tables).find((candidate) => candidate.skillId === input.skillId);
  const inputLevel = skillLevel(values, input.skillId);
  if (!row || inputLevel <= 0) return { coefficientLog: -Infinity, level: inputLevel, ssOptionCount: 0 };

  const perks = chosenSkillPerks(values, tables, input.skillId);
  const level = inputLevel + perks.filter((perk) => perk.perkType === COEFFICIENT.PERK_SKILL_LEVEL).reduce((sum, perk) => sum + perkValue(perk, 'val1'), 0);
  const options = chosenSkillOptions(values, tables, input.skillId);
  const ssOptionCount = options.length;

  let log = Math.log10((Number(row.damage) + Number(row.damageUp) * (level - 1)) / PERCENT_DIVISOR);
  const multiply = (factor: number) => {
    log += Math.log10(factor);
  };

  for (const option of options) {
    const value = skillRuneValue(option);
    if (option.type === COEFFICIENT.OPTION_SKILL_DAMAGE) multiply(1 + value / PERCENT_DIVISOR);
    else if (COEFFICIENT.OPTION_ATTRIBUTE_DAMAGE[option.type] && COEFFICIENT.OPTION_ATTRIBUTE_DAMAGE[option.type] === input.heroAttribute) {
      multiply(1 + value / PERCENT_DIVISOR);
    } else if (COEFFICIENT.OPTION_TARGET_DAMAGE[option.type] && COEFFICIENT.OPTION_TARGET_DAMAGE[option.type] === input.target) {
      multiply(1 + value / PERCENT_DIVISOR);
    } else if (option.type === COEFFICIENT.OPTION_SINGLE_TARGET && input.targets === COEFFICIENT.SINGLE_TARGET_COUNT) {
      multiply(value);
    }
  }

  const setValuePercent = perks.filter((perk) => perk.perkType === COEFFICIENT.PERK_SET_VALUE).reduce((sum, perk) => sum + perkValue(perk, 'val1'), 0);
  multiply(ssSetMultiplier(row.all_ss_stats_value ?? '', ssOptionCount, setValuePercent));

  for (const perk of perks) {
    if (isOneOf(COEFFICIENT.PERK_DAMAGE_VAL1, perk.perkType)) multiply(1 + perkValue(perk, 'val1') / PERCENT_DIVISOR);
    else if (isOneOf(COEFFICIENT.PERK_DAMAGE_VAL2, perk.perkType)) multiply(1 + perkValue(perk, 'val2') / PERCENT_DIVISOR);
    else if (isOneOf(COEFFICIENT.PERK_DAMAGE_PER_LEVEL, perk.perkType)) multiply(1 + (level * perkValue(perk, 'val1')) / PERCENT_DIVISOR);
    else if (perk.perkType === COEFFICIENT.PERK_DAMAGE_PER_SS_OPTION) multiply(1 + (ssOptionCount * perkValue(perk, 'val1')) / PERCENT_DIVISOR);
  }

  return { coefficientLog: log, level, ssOptionCount };
}
