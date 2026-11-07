/**
 * 궁수 스킬 5개 (멀티샷 · 유도 샷 · 화살비 · 레이저 샷 · 다발 화살) 의 시전 1번 적중 구조 (스킬 · 옵션 · 문양 문구 기준, 유력).
 * hits = 한 발 계수가 곱해지는 횟수의 기대값 (발 수 × 맞는 적 수), coefficientFactor = 이 스킬 전용 옵션 · 문양이 계수에 더 곱하는 배수.
 * 확률 옵션은 기대값 (최고 등급 값 / 100). 관통 대상 = min(맞는 적 수, 관통 횟수 + PIERCE_EXTRA_TARGETS)
 */
import { CONSTS } from '@/CONSTS';
import { chosenSkillOptions, chosenSkillPerks, skillRows, skillRuneValue } from '@/calc/sources/skill/skill';
import type { CalcValues } from '@/calc/types';
import type { StatTables, TableRow } from '@/data/statTables';
import { chanceOf } from '@/dpm/hitMultipliers';

const { ARCHER_SKILLS: ARCHER, PIERCE_EXTRA_TARGETS, PERCENT_DIVISOR } = CONSTS.dpm;

export interface SkillHits {
  /** 이 스킬의 적중 구조를 넣었나 (넣은 스킬만, 나머지는 false · hits 0) */
  supported: boolean;
  hits: number;
  coefficientFactor: number;
  /** 값을 추정했거나 넣지 못한 몫이 있으면 그 표시 (결과의 missing 에 스킬 번호와 함께 남는다) */
  estimates?: string[];
}

const UNSUPPORTED: SkillHits = { supported: false, hits: 0, coefficientFactor: 1 };

/** 고른 옵션 중 그 종류의 최고 등급 값 (없으면 undefined) */
export function optionValue(options: TableRow[], type: string): number | undefined {
  const row = options.find((option) => option.type === type);
  return row ? skillRuneValue(row) : undefined;
}

/** 고른 문양 중 그 종류 (없으면 undefined) */
export function perkOf(perks: TableRow[], perkType: string): TableRow | undefined {
  return perks.find((perk) => perk.perkType === perkType);
}

export const perkNumber = (perk: TableRow, column: 'val1' | 'val2' | 'val3') => Number(perk[column]) || 0;
export const percentFactor = (percent: number) => 1 + percent / PERCENT_DIVISOR;

export function archerSkillHits(values: CalcValues, tables: StatTables, skillId: string, targets: number): SkillHits {
  const row = skillRows(tables).find((candidate) => candidate.skillId === skillId);
  if (!row) return UNSUPPORTED;
  const value1 = Number(row.value1) || 0;
  const value2 = Number(row.value2) || 0;
  const options = chosenSkillOptions(values, tables, skillId);
  const perks = chosenSkillPerks(values, tables, skillId);
  const pierceTargets = (pierce: number) => Math.min(targets, pierce + PIERCE_EXTRA_TARGETS);

  switch (skillId) {
    case ARCHER.MULTI_SHOT: {
      // 화살 value1 개, 관통 value2
      const twice = optionValue(options, ARCHER.MULTI_SHOT_TWICE);
      const extraArrows = optionValue(options, ARCHER.MULTI_SHOT_EXTRA_ARROWS);
      const halfArrows = optionValue(options, ARCHER.MULTI_SHOT_HALF_ARROWS);
      const noPierce = optionValue(options, ARCHER.MULTI_SHOT_NO_PIERCE);
      const stackPerk = perkOf(perks, ARCHER.MULTI_SHOT_PERK);
      let arrows = value1 + (extraArrows === undefined ? 0 : ARCHER.MULTI_SHOT_EXTRA_ARROW_COUNT * chanceOf(extraArrows));
      let factor = 1;
      if (halfArrows !== undefined) {
        arrows *= ARCHER.HALF_ARROWS_FACTOR;
        factor *= percentFactor(halfArrows);
      }
      if (noPierce !== undefined) factor *= percentFactor(noPierce);
      if (stackPerk) factor *= percentFactor(perkNumber(stackPerk, 'val1') * perkNumber(stackPerk, 'val3'));
      const casts = 1 + (twice === undefined ? 0 : chanceOf(twice));
      return { supported: true, hits: casts * arrows * (noPierce === undefined ? pierceTargets(value2) : 1), coefficientFactor: factor };
    }
    case ARCHER.GUIDED_SHOT: {
      const noPierce = optionValue(options, ARCHER.GUIDED_SHOT_NO_PIERCE);
      const double = optionValue(options, ARCHER.GUIDED_SHOT_DOUBLE);
      const perk = perkOf(perks, ARCHER.GUIDED_SHOT_PERK);
      let factor = 1;
      if (noPierce !== undefined) factor *= percentFactor(noPierce);
      if (double !== undefined) factor *= 1 + (ARCHER.DOUBLE_FACTOR - 1) * chanceOf(double);
      if (perk) factor *= percentFactor(perkNumber(perk, 'val1'));
      return { supported: true, hits: value1 * (noPierce === undefined ? pierceTargets(value2) : 1), coefficientFactor: factor };
    }
    case ARCHER.ARROW_RAIN: {
      // 범위의 적에게 value1 번
      const perk = perkOf(perks, ARCHER.ARROW_RAIN_PERK);
      const times = value1 + (perk ? perkNumber(perk, 'val2') : 0);
      return { supported: true, hits: times * targets, coefficientFactor: perk ? percentFactor(perkNumber(perk, 'val1')) : 1 };
    }
    case ARCHER.LASER_SHOT: {
      // 작은 레이저 value2 개 × 계수 + 큰 레이저 value1 배
      const extra = optionValue(options, ARCHER.LASER_SHOT_EXTRA);
      const small = value2 + (extra === undefined ? 0 : ARCHER.LASER_SHOT_EXTRA_COUNT * chanceOf(extra));
      return { supported: true, hits: (small + value1) * targets, coefficientFactor: 1 };
    }
    case ARCHER.SUMMON_ARROWS: {
      // 화살 value1 개 (+ 옵션), 관통 value2
      const extraArrows = optionValue(options, ARCHER.SUMMON_ARROWS_EXTRA) ?? 0;
      const noPierce = optionValue(options, ARCHER.SUMMON_ARROWS_NO_PIERCE);
      const perk = perkOf(perks, ARCHER.SUMMON_ARROWS_PERK);
      const arrows = (value1 + extraArrows) * (perk ? percentFactor(perkNumber(perk, 'val1')) : 1);
      let factor = 1;
      if (noPierce !== undefined) factor *= percentFactor(noPierce);
      if (perk) factor *= percentFactor(perkNumber(perk, 'val2'));
      return { supported: true, hits: arrows * (noPierce === undefined ? pierceTargets(value2) : 1), coefficientFactor: factor };
    }
    case ARCHER.ARROW_BARRAGE: {
      const perk = perkOf(perks, ARCHER.ARROW_BARRAGE_PERK);
      const arrows = perk ? ARCHER.ARROW_BARRAGE_FOCUS_ARROWS : ARCHER.ARROW_BARRAGE_ARROWS;
      return {
        supported: true,
        hits: Math.floor(value1) * arrows * Math.min(targets, ARCHER.ARROW_BARRAGE_MAX_TARGETS),
        coefficientFactor: perk ? percentFactor(perkNumber(perk, 'val2')) : 1,
      };
    }
    default:
      return UNSUPPORTED;
  }
}
