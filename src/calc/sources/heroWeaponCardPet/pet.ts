/**
 * 펫 (기존 stat-calc-sources.js ownedPetRow / petOptionChoices / leaderEffectText / renderPet) → 효과 줄.
 * 앱 코드 확정: 보유 효과 = 보유 펫 전부, 리더 = leaderStatValue1, 옵션 = 장착 칸만.
 * 옵션 선택지는 저장 순서와 상관없이 장착한 펫으로 매번 다시 계산한다
 */
import { CONSTS } from '../../../CONSTS';
import type { StatTables, TableRow } from '../../../data/statTables';
import type { Line } from '../../combine';
import type { CalcValues } from '../../types';
import { gradeStarValue, groupBy, rowsOf, screenLog, unique, type RowGroup, type SourceLabel } from './shared';

const { SLOTS, OPTIONS, EXCLUDED_OPTION_STAT, AILMENT_LEADER_PREFIX } = CONSTS.heroWeaponCardPet.pet;

export const PET_LEADER_FIELD = 'petLeader';
export const PET_SLOT_NUMBERS = Array.from({ length: SLOTS }, (_, index) => index + 1);
export const PET_OPTION_NUMBERS = Array.from({ length: OPTIONS }, (_, index) => index + 1);

/** 보유 펫 "등급_성" 칸 */
export function ownedPetField(petId: string): string {
  return `pet_${petId}`;
}
export function petSlotField(slot: number): string {
  return `petSlot${slot}`;
}
export function petOptionStatField(slot: number, number: number): string {
  return `petOption${slot}_${number}Stat`;
}
export function petOptionValueField(slot: number, number: number): string {
  return `petOption${slot}_${number}Value`;
}

/** 펫마다 행 묶음 (Pet 표 순서) */
export function petGroups(tables: StatTables): RowGroup[] {
  return groupBy(rowsOf(tables, 'Pet'), 'petId');
}

/** 펫 첫 행 (속성·옵션 묶음 확인용) */
export function petFirstRow(tables: StatTables, petId: string): TableRow | undefined {
  return petId ? rowsOf(tables, 'Pet').find((row) => row.petId === petId) : undefined;
}

/** 보유 펫 칸에 고른 등급·성의 행 (없으면 미보유) */
export function ownedPetRow(values: CalcValues, tables: StatTables, petId: string): TableRow | undefined {
  if (!petId) return undefined;
  const choice = values[ownedPetField(petId)] ?? '';
  return rowsOf(tables, 'Pet').find((row) => row.petId === petId && gradeStarValue(row) === choice);
}

/**
 * 장착 옵션 능력치 = 그 펫 속성의 옵션 묶음만 (Pet optionId → DiceOption diceId, 불 3 / 물 4 / 땅 5). 명중은 계산에 안 써서 뺌.
 * 펫이 없으면 고를 수 없음
 */
export function petOptionStats(tables: StatTables, petId: string): string[] {
  const petRow = petFirstRow(tables, petId);
  if (!petRow) return [];
  return unique(
    rowsOf(tables, 'DiceOption')
      .filter((row) => row.diceId === petRow.optionId && row.statType !== EXCLUDED_OPTION_STAT)
      .map((row) => row.statType),
  );
}

/** 장착 칸마다 고른 펫 id (빈칸은 '') — 다른 묶음의 얼티밋 특성 (장착 펫 속성 개수) 이 쓴다 */
export function equippedPetIds(values: CalcValues): string[] {
  return PET_SLOT_NUMBERS.map((slot) => values[petSlotField(slot)] ?? '');
}

/** 상태이상 리더 효과인가 (스탯이 아니라 문구만, 계산 제외) */
export function isAilmentLeader(leaderStatType: string): boolean {
  return leaderStatType.startsWith(AILMENT_LEADER_PREFIX);
}

/** 장착 옵션 칸 수 = 그 펫 보유 등급·성의 optionCnt (보유 등급이 없으면 0) */
export function petOptionCount(values: CalcValues, tables: StatTables, petId: string): number {
  const row = ownedPetRow(values, tables, petId);
  return row ? Number(row.optionCnt) : 0;
}

export function petLines(values: CalcValues, tables: StatTables, label: SourceLabel): Line[] {
  const lines: Line[] = [];
  const petName = (petId: string) => label(`calc.pet.petNames.${petId}`);
  for (const group of petGroups(tables)) {
    const row = ownedPetRow(values, tables, group.key);
    if (row) {
      lines.push({
        source: label('calc.pet.sources.owned', { pet: petName(group.key), grade: row.grade, star: row.star }),
        stat: row.passiveStatType,
        value: Number(row.passiveStatValue),
      });
    }
  }
  const leaderSlot = values[PET_LEADER_FIELD] ?? '';
  for (const slot of PET_SLOT_NUMBERS) {
    const petId = values[petSlotField(slot)] ?? '';
    if (!petId) continue;
    const row = ownedPetRow(values, tables, petId);
    if (String(slot) === leaderSlot && row && !isAilmentLeader(row.leaderStatType)) {
      lines.push({ source: label('calc.pet.sources.leader', { pet: petName(petId) }), stat: row.leaderStatType, value: Number(row.leaderStatValue1) });
    }
    const optionCount = row ? Number(row.optionCnt) : 0;
    const choices = petOptionStats(tables, petId);
    for (let number = 1; number <= optionCount; number++) {
      const stat = values[petOptionStatField(slot, number)] ?? '';
      const log = screenLog(values, petOptionValueField(slot, number));
      // 기존 화면은 펫을 바꾸면 그 펫에 없는 능력치를 지웠다 → 선택지에 없는 능력치는 계산에서 뺌
      if (stat && choices.includes(stat) && log !== null) {
        lines.push({ source: label('calc.pet.sources.option', { pet: petName(petId), number }), stat, log });
      }
    }
  }
  return lines;
}
