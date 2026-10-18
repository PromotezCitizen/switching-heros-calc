/**
 * 히어로 표 · 전용 무기 표: 보유 히어로 (등급·성·캐릭터 각성) 와 보유 전용 무기 (초월 ★).
 * 여기서 넣은 값으로 1슬롯 히어로의 등급·성·각성, 유물 연동 수치 (SS·SSS 이상 히어로 수, ★10 전용 무기 수) 를 자동으로 읽는다
 */
import { CONSTS } from '@/CONSTS';
import { tableRows, type StatTables } from '@/data/statTables';
import type { CalcValues } from '@/calc/types';
import { characterRows } from '@/calc/sources/hero/character';
import { exclusiveOwnedLevelField, exclusiveOwnedStarField, rosterGradeField } from '@/calc/sources/hero/rosterFields';

const { STAR10_WEAPON_STAR } = CONSTS.hero.roster;

export interface RosterHero {
  charId: string;
  name: string;
}

/** 히어로 목록 (표 순서, 히어로마다 한 번) */
export function rosterHeroes(tables: StatTables): RosterHero[] {
  const seen = new Set<string>();
  const heroes: RosterHero[] = [];
  for (const row of characterRows(tables)) {
    if (seen.has(row.charId)) continue;
    seen.add(row.charId);
    heroes.push({ charId: row.charId, name: row.name });
  }
  return heroes;
}

/** 히어로 등급 순서 (표에 나오는 순서 = 낮은 등급부터) */
export function heroGradeOrder(tables: StatTables): string[] {
  return [...new Set(characterRows(tables).map((row) => row.grade))];
}

/**
 * 히어로 표에서 지금 등급이 minGrade 이상인 히어로 수 (유물 "SS 등급 이상 히어로 수" 등).
 * 지금 등급 기준 = 앱 코드 확인 (보유 히어로 전부의 현재 등급 행, claude-docs/react-port/hero-grade-count-basis.md)
 */
export function heroCountAtLeast(values: CalcValues, tables: StatTables, minGrade: string): number {
  const order = heroGradeOrder(tables);
  const minIndex = order.indexOf(minGrade);
  if (minIndex < 0) return 0;
  return rosterHeroes(tables).filter((hero) => order.indexOf(values[rosterGradeField(hero.charId)] ?? '') >= minIndex).length;
}

export interface ExclusiveWeapon {
  weaponId: string;
  charId: string;
  maxStar: number;
}

/** 전용 무기 목록 (표 WeaponChar 순서, 무기마다 한 번) */
export function exclusiveWeapons(tables: StatTables): ExclusiveWeapon[] {
  const table = tables.WeaponChar;
  if (!table) return [];
  const weapons = new Map<string, ExclusiveWeapon>();
  for (const row of tableRows(table)) {
    const current = weapons.get(row.weaponId);
    const star = Number(row.star);
    if (!current) weapons.set(row.weaponId, { weaponId: row.weaponId, charId: row.charId, maxStar: star });
    else current.maxStar = Math.max(current.maxStar, star);
  }
  return [...weapons.values()];
}

/** 히어로의 전용 무기 초월 ★ (전용 무기 표에서). 무기가 없거나 비었으면 undefined */
export function ownedExclusiveStar(values: CalcValues, tables: StatTables, charId: string): string | undefined {
  const weapon = exclusiveWeapons(tables).find((candidate) => candidate.charId === charId);
  const text = weapon ? values[exclusiveOwnedStarField(weapon.weaponId)] : undefined;
  return text ? text : undefined;
}

/** 히어로의 전용 무기 강화 레벨 (전용 무기 표에서). 무기가 없거나 비었으면 undefined */
export function ownedExclusiveLevel(values: CalcValues, tables: StatTables, charId: string): string | undefined {
  const weapon = exclusiveWeapons(tables).find((candidate) => candidate.charId === charId);
  const text = weapon ? values[exclusiveOwnedLevelField(weapon.weaponId)] : undefined;
  return text ? text : undefined;
}

/** ★10 이상 전용 무기 수 (유물 연동 "★10 전용 무기 수") */
export function star10WeaponCount(values: CalcValues, tables: StatTables): number {
  return exclusiveWeapons(tables).filter(
    (weapon) => Number(values[exclusiveOwnedStarField(weapon.weaponId)]) >= STAR10_WEAPON_STAR,
  ).length;
}
