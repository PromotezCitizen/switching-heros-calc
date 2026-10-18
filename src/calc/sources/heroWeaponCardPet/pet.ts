/**
 * 펫 (기존 stat-calc-sources.js ownedPetRow / petOptionChoices / leaderEffectText / renderPet) → 효과 줄.
 * 앱 코드 확정: 보유 효과 = 보유 펫 전부, 리더 = leaderStatValue1, 옵션 = 장착 칸만.
 * 옵션 선택지는 저장 순서와 상관없이 장착한 펫으로 매번 다시 계산한다
 */
import { CONSTS } from '@/CONSTS';
import type { StatTables, TableRow } from '@/data/statTables';
import type { Line } from '@/calc/combine';
import type { CalcValues } from '@/calc/types';
import { gradeStarValue, groupBy, rowsOf, screenLog, unique, type RowGroup, type SourceLabel } from '@/calc/sources/heroWeaponCardPet/shared';

const { SLOTS, OPTIONS, EXCLUDED_OPTION_STAT, AILMENT_LEADER_PREFIX, REGION: PET_REGION } = CONSTS.heroWeaponCardPet.pet;
const PERCENT_DIVISOR = CONSTS.common.PERCENT_DIVISOR;

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

/** 펫 지역 레벨 칸 (속성마다 하나, 비어 있음·0 = 입력 전이라 그 지역은 계산하지 않음) */
export function petRegionLevelField(attribute: string): string {
  return `petRegionLevel_${attribute}`;
}

/** 속성별 "마지막 단계" 보유 펫 수 (고른 등급·성이 그 펫 표 행의 마지막인 펫, 게임 m5997 의 "다음 레벨 행이 없는 펫") */
export function maxStagePetCounts(values: CalcValues, tables: StatTables): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const group of petGroups(tables)) {
    const row = ownedPetRow(values, tables, group.key);
    const lastRow = group.rows[group.rows.length - 1];
    if (row && gradeStarValue(row) === gradeStarValue(lastRow)) {
      counts[row.attribute] = (counts[row.attribute] ?? 0) + 1;
    }
  }
  return counts;
}

/** 펫 지역이 열렸는가 = 마지막 단계 펫 수 합이 해금 조건 이상 (게임 문구 "2성 SSS등급 펫 1마리 이상 보유 시 해금") */
export function petRegionUnlocked(values: CalcValues, tables: StatTables): boolean {
  const total = Object.values(maxStagePetCounts(values, tables)).reduce((sum, count) => sum + count, 0);
  return total >= PET_REGION.UNLOCK_PET_COUNT;
}

/** 지역 특성 배율 f = Option 표 PET_PLACEMENT_PER_<마지막 단계 펫 수> ÷ 100 (수 0 이면 0, 6 초과면 6번째) */
function petRegionPlacementFactor(tables: StatTables, count: number): number {
  if (count <= 0) return 0;
  const key = `${PET_REGION.PLACEMENT_KEY_PREFIX}${Math.min(count, PET_REGION.PLACEMENT_MAX_COUNT)}`;
  const row = rowsOf(tables, PET_REGION.PLACEMENT_TABLE).find((record) => record[PET_REGION.PLACEMENT_KEY_COLUMN] === key);
  return row ? Number(row[PET_REGION.PLACEMENT_VALUE_COLUMN]) / PERCENT_DIVISOR : 0;
}

/** 지역 레벨 → 표 PetRegion 의 행 (없으면 undefined) */
export function petRegionRow(tables: StatTables, level: number): TableRow | undefined {
  return level > 0 ? rowsOf(tables, PET_REGION.TABLE).find((row) => Number(row[PET_REGION.LEVEL_COLUMN]) === level) : undefined;
}

/**
 * 펫 지역 줄: 해금되었고 지역 레벨을 넣은 지역마다 공격력 % · 체력 % 한 줄씩 (표 값 × (1 + f)).
 * 지역은 속성 상관없이 3개 모두 합산한다 (활성 영웅 속성 검사 없음)
 */
export function petRegionLines(values: CalcValues, tables: StatTables, label: SourceLabel): Line[] {
  if (!petRegionUnlocked(values, tables)) return [];
  const counts = maxStagePetCounts(values, tables);
  const lines: Line[] = [];
  for (const attribute of PET_REGION.ATTRIBUTES) {
    const level = Math.floor(Number(values[petRegionLevelField(attribute)]) || 0);
    const row = petRegionRow(tables, level);
    if (!row) continue;
    const factor = 1 + petRegionPlacementFactor(tables, counts[attribute] ?? 0);
    const source = label('calc.pet.sources.region', { attribute: label(`calc.pet.attributes.${attribute}`), level });
    lines.push({ source, stat: PET_REGION.ATTACK_STAT, value: Number(row[PET_REGION.ATTACK_COLUMN]) * factor });
    lines.push({ source, stat: PET_REGION.HP_STAT, value: Number(row[PET_REGION.HP_COLUMN]) * factor });
  }
  return lines;
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
  lines.push(...petRegionLines(values, tables, label));
  return lines;
}
