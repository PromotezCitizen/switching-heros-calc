/**
 * 전용 스킬 시전 1번 (에이카 유성 + 보주 파편). 한 발 계수 = 행 damage / 100 × 영웅 옵션 곱 (meteor-hit-area.md 11~12절, damage-pipeline.md 3-4).
 * 영웅 옵션이 1슬롯 히어로에 장착한 직업 스킬의 문양 (전용/교체 스킬 데미지) 에서 온다는 것은 문구 기준 (코드의 출처 표는 확인 못 함).
 * 에이카 밖의 전용 스킬은 적중 구조를 안 넣어 supported false
 */
import { CONSTS } from '@/CONSTS';
import { heroFirstRow, slotHeroName } from '@/calc/sources/hero/character';
import { rosterAwakenField } from '@/calc/sources/hero/rosterFields';
import { equippedExclusiveStar } from '@/calc/sources/heroWeaponCardPet/weapon';
import { SKILL_EQUIP_SLOT_NUMBERS, chosenSkillPerks, skillEquipField, skillLevel } from '@/calc/sources/skill/skill';
import type { CalcValues } from '@/calc/types';
import { tableRows, type StatTables, type TableRow } from '@/data/statTables';
import { charSkillRow } from '@/dpm/charSkillCycle';

const { PERCENT_DIVISOR, CHAR_SKILL } = CONSTS.dpm;
const TRANSCEND_TABLE = 'WeaponTranscend';

export interface CharSkillHits {
  supported: boolean;
  skillId: string | null;
  /** 한 발 계수 log10 (행 damage / 100 × 영웅 옵션) */
  coefficientLog: number;
  /** 한 발 계수가 곱해지는 횟수: 유성 수 × 맞는 적 수 + 보주 파편 배율 × 파편 맞는 수 */
  hits: number;
  /** 값을 추정한 몫의 표시 (결과의 missing 에 스킬 번호와 함께 남는다) */
  estimates?: string[];
}

const perkNumber = (perk: TableRow, column: 'val1' | 'val2' | 'val3') => Number(perk[column]) || 0;
const isOneOf = (names: readonly string[], name: string) => names.includes(name);

/** 영웅 옵션 곱: 1슬롯 히어로 장착 5칸 스킬의 고른 문양 중 전용/교체 스킬 데미지 */
export function heroOptionMultiplier(values: CalcValues, tables: StatTables): number {
  const equipped = new Set(SKILL_EQUIP_SLOT_NUMBERS.map((slot) => values[skillEquipField(slot)]).filter(Boolean));
  let multiplier = 1;
  for (const skillId of equipped) {
    const level = skillLevel(values, skillId);
    for (const perk of chosenSkillPerks(values, tables, skillId)) {
      if (isOneOf(CHAR_SKILL.PERK_DAMAGE_VAL1, perk.perkType)) multiplier *= 1 + perkNumber(perk, 'val1') / PERCENT_DIVISOR;
      else if (isOneOf(CHAR_SKILL.PERK_DAMAGE_PER_LEVEL, perk.perkType)) multiplier *= 1 + (level * perkNumber(perk, 'val1')) / PERCENT_DIVISOR;
      else if (perk.perkType === CHAR_SKILL.PERK_DAMAGE_STACK) multiplier *= 1 + (perkNumber(perk, 'val2') * perkNumber(perk, 'val3')) / PERCENT_DIVISOR;
    }
  }
  return multiplier;
}

/** 에이카 유성 수: 행 value1 (0 이면 8) + 장착한 전용 무기 1021 ★4 이상이면 초월 행 val3 */
function meteorCount(values: CalcValues, tables: StatTables, row: TableRow): number {
  const base = Number(row.value1) || CHAR_SKILL.DEFAULT_METEORS;
  const weapon = CHAR_SKILL.METEOR_WEAPON;
  if (equippedExclusiveStar(values, tables, weapon.WEAPON_ID) < weapon.STAR || !tables[TRANSCEND_TABLE]) return base;
  const transcend = tableRows(tables[TRANSCEND_TABLE]).find((candidate) => candidate.weaponType === weapon.WEAPON_ID && Number(candidate.star) === weapon.STAR);
  return base + (Number(transcend?.[weapon.VALUE]) || 0);
}

export function charSkillHits(values: CalcValues, tables: StatTables, targets: number, orbShardHits: number): CharSkillHits {
  const hero = heroFirstRow(tables, slotHeroName(values, tables));
  const awakenLevel = hero ? Number(values[rosterAwakenField(hero.charId)]) || 0 : 0;
  const row = hero ? charSkillRow(tables.CharacterAwaken, tables.CharSkill, hero.charId, awakenLevel) : undefined;
  if (!hero || !row) return { supported: false, skillId: null, coefficientLog: -Infinity, hits: 0 };
  const coefficientLog = Math.log10((Number(row.damage) || 0) / PERCENT_DIVISOR) + Math.log10(heroOptionMultiplier(values, tables));
  if (hero.charId === CHAR_SKILL.LIN_CHAR_ID && row.skillId === CHAR_SKILL.LIN_DRAGON_WAVE_SKILL) {
    // 용의 파동 value1 개 × 맞는 적 수 (관통 99)
    return {
      supported: true,
      skillId: row.skillId,
      coefficientLog,
      hits: (Number(row.value1) || 0) * Math.min(targets, CHAR_SKILL.LIN_WAVE_PIERCE),
    };
  }
  if (hero.charId !== CHAR_SKILL.EIKA_CHAR_ID) return { supported: false, skillId: row.skillId, coefficientLog, hits: 0 };
  const orbShardFactor = Number(row.coolTime) >= CHAR_SKILL.ORB_FROM_STAGE ? (Number(row.value3) || 0) / PERCENT_DIVISOR : 0;
  return {
    supported: true,
    skillId: row.skillId,
    coefficientLog,
    hits: meteorCount(values, tables, row) * targets + orbShardFactor * orbShardHits,
  };
}
