/**
 * 몬스터 카드 (기존 stat-calc-sources.js cardGradeChoice / cardPairs / setLines / renderCard, stat-calc.html sssCardCount /
 * countExpandedLines) → 효과 줄. 등급·성 선택지는 저장 순서와 상관없이 고른 카드로 매번 다시 계산한다
 */
import { CONSTS } from '../../../CONSTS';
import type { StatTables, TableRow } from '../../../data/statTables';
import type { Line } from '../../combine';
import type { CalcValues } from '../../types';
import { gradeStarValue, groupBy, numberValue, rowsOf, unique, type SourceLabel } from './shared';

const { EMPTY_STAT } = CONSTS.heroWeaponCardPet;
const {
  SLOTS,
  SET_MARKS,
  UNIQUE_ABILITY_SUFFIXES,
  SSS_GRADE,
  GRADE_ORDER,
  SSS_CARD_COUNT_SUFFIX,
  CARD_COUNT_SUFFIX_GRADES,
  BATTLE_CONDITION_SUFFIXES,
  ENEMY_COUNT_SUFFIX,
  KILL_STAT,
  KILL_MAX_STACKS,
  USE_SKILL_STAT,
  USE_SKILL_MAX_STACKS,
  ATTACK_PERCENT_STAT,
} = CONSTS.heroWeaponCardPet.card;
const PERCENT_DIVISOR = CONSTS.common.PERCENT_DIVISOR;

export const CARD_SET_BONUS_FIELD = 'relicLink_cardSetBonus';
export const CARD_SLOT_NUMBERS = Array.from({ length: SLOTS }, (_, index) => index + 1);
export const CARD_MARK_NUMBERS = Array.from({ length: SET_MARKS }, (_, index) => index + 1);

export function cardSlotField(slot: number): string {
  return `cardSlot${slot}`;
}
/** 저장 칸 "등급_성" */
export function cardGradeField(slot: number): string {
  return `cardSlotGrade${slot}`;
}
export function cardSetPickField(slot: number, mark: number): string {
  return `cardSetPick${slot}_${mark}`;
}
export function stickerCountField(stickerId: string): string {
  return `stickerSetCount_${stickerId}`;
}
export function stickerLevelField(stickerId: string): string {
  return `stickerSetLevel_${stickerId}`;
}

/**
 * N 번째 세트 마크 칸에서 고를 수 있는 세트 번호: 표 CardSet 의 slot 열이 N 인 세트만
 * (세트는 slot 1~5 카테고리로 나뉘고 카테고리마다 5개, 마크 칸 N = 카테고리 N)
 */
export function setIdsForMark(tables: StatTables, mark: number): string[] {
  return unique(
    rowsOf(tables, 'CardSet')
      .filter((row) => Number(row.slot) === mark)
      .map((row) => row.setId),
  );
}

const starBaseCache = new WeakMap<TableRow[], Record<string, number>>();

/** 표의 성 번호는 등급을 이어서 센다 (B~SSS 1~10, R 11~20 …) → 등급마다 가장 작은 성 번호 */
export function cardStarBases(tables: StatTables): Record<string, number> {
  const rows = rowsOf(tables, 'Card');
  let bases = starBaseCache.get(rows);
  if (!bases) {
    bases = {};
    for (const row of rows) bases[row.grade] = Math.min(bases[row.grade] ?? Infinity, Number(row.star));
    starBaseCache.set(rows, bases);
  }
  return bases;
}

/** 화면 표시 성 (등급마다 1성부터) */
export function cardDisplayStar(tables: StatTables, row: TableRow): number {
  return Number(row.star) - cardStarBases(tables)[row.grade] + 1;
}

/** 고른 카드의 행 목록 (등급·성 선택지) */
export function cardRowsOf(tables: StatTables, cardId: string): TableRow[] {
  return cardId ? rowsOf(tables, 'Card').filter((row) => row.cardId === cardId) : [];
}

/** 카드 번호 목록 (Card 표 순서) */
export function cardIds(tables: StatTables): string[] {
  return unique(rowsOf(tables, 'Card').map((row) => row.cardId));
}

/** 칸의 카드·등급·성이 맞는 행 (고른 카드에 없는 "등급_성" 이면 없음) */
export function selectedCardRow(values: CalcValues, tables: StatTables, slot: number): TableRow | undefined {
  const choice = values[cardGradeField(slot)] ?? '';
  return cardRowsOf(tables, values[cardSlotField(slot)] ?? '').find((row) => gradeStarValue(row) === choice);
}

/** 고유 효과 [스탯, 값] (등급마다 한 줄 해금) */
export function cardPairs(row: TableRow): Array<[string, number]> {
  return UNIQUE_ABILITY_SUFFIXES.map((suffix): [string, string] => [row[`uniqAbilType${suffix}`], row[`uniqAbilVal${suffix}`]])
    .filter(([stat, value]) => stat && stat !== EMPTY_STAT && Number(value) > 0)
    .map(([stat, value]) => [stat, Number(value)]);
}

/** 쓸 수 있는 세트 마크 칸 수 = 고른 등급·성의 slotCnt. 등급·성을 아직 안 골랐거나 카드가 없으면 0 (몇 칸 열리는지 모름) */
export function usableMarkCount(values: CalcValues, tables: StatTables, slot: number): number {
  const row = selectedCardRow(values, tables, slot);
  return row ? Number(row.slotCnt) : 0;
}

/** 카드의 등급 목록 (표 순서). 하나뿐이면 등급을 고를 필요 없음 */
export function cardGrades(tables: StatTables, cardId: string): string[] {
  return unique(cardRowsOf(tables, cardId).map((row) => row.grade));
}

/** 다른 칸에 이미 편성한 카드 번호 → 그 칸 번호 (같은 카드를 두 칸에 넣지 않게) */
export function slotUsingCard(values: CalcValues, slot: number, cardId: string): number | undefined {
  return CARD_SLOT_NUMBERS.find((other) => other !== slot && cardId !== '' && values[cardSlotField(other)] === cardId);
}

/** 세트 id → 편성 카드 마크 수 (쓸 수 있는 칸만) */
export function cardSetMarkCounts(values: CalcValues, tables: StatTables): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const slot of CARD_SLOT_NUMBERS) {
    const usable = usableMarkCount(values, tables, slot);
    for (const mark of CARD_MARK_NUMBERS) {
      const pick = values[cardSetPickField(slot, mark)];
      if (mark <= usable && pick) counts[pick] = (counts[pick] ?? 0) + 1;
    }
  }
  return counts;
}

export interface CardSetTier {
  setCount: number;
  stat: string;
  value: number;
  reached: boolean;
}
export interface CardSetState {
  setId: string;
  markCount: number;
  tiers: CardSetTier[];
}

/** 세트마다 단계 효과: 값 = 기본 + 레벨당 × 세트 보너스 합계 (모든 세트 같은 레벨), 마크 수 이하 단계만 적용 */
export function cardSetStates(values: CalcValues, tables: StatTables): CardSetState[] {
  const level = numberValue(values, CARD_SET_BONUS_FIELD);
  const marks = cardSetMarkCounts(values, tables);
  return groupBy(rowsOf(tables, 'CardSet'), 'setId').map((group) => {
    const markCount = marks[group.key] ?? 0;
    return {
      setId: group.key,
      markCount,
      tiers: group.rows.map((row) => ({
        setCount: Number(row.setCnt),
        stat: row.statName,
        value: Number(row.val1) + Number(row.valUp1) * level,
        reached: Number(row.setCnt) <= markCount,
      })),
    };
  });
}

export function cardLines(values: CalcValues, tables: StatTables, label: SourceLabel): Line[] {
  const lines: Line[] = [];
  const cardName = (cardId: string) => label(`calc.card.cardNames.${cardId}`, { defaultValue: label('calc.card.cardFallback', { id: cardId }) });
  for (const slot of CARD_SLOT_NUMBERS) {
    const row = selectedCardRow(values, tables, slot);
    if (!row) continue;
    for (const [stat, value] of cardPairs(row)) {
      lines.push({
        source: label('calc.card.sources.slot', {
          slot,
          card: cardName(row.cardId),
          grade: row.grade,
          star: cardDisplayStar(tables, row),
        }),
        stat,
        value,
      });
    }
  }
  for (const set of cardSetStates(values, tables)) {
    const name = label(`calc.card.setNames.${set.setId}`, { defaultValue: label('calc.card.setFallback', { id: set.setId }) });
    for (const tier of set.tiers) {
      if (tier.reached) lines.push({ source: label('calc.card.sources.set', { name, count: tier.setCount }), stat: tier.stat, value: tier.value });
    }
  }
  for (const group of groupBy(rowsOf(tables, 'CardStickerSet'), 'stickerId')) {
    const count = Number(values[stickerCountField(group.key)]) || 0;
    const level = numberValue(values, stickerLevelField(group.key));
    const name = label('calc.card.stickerName', { id: group.key });
    for (const row of group.rows) {
      if (Number(row.setCnt) <= count) {
        lines.push({
          source: label('calc.card.sources.set', { name, count: row.setCnt }),
          stat: row.statName,
          value: Number(row.val1) + Number(row.valUp1) * level,
        });
      }
    }
  }
  return lines;
}

/** 편성 칸 하나의 등급·화면 성 (칸이 비었거나 맞는 행이 없으면 등급 빈 글, 성 0) */
export interface CardSlotGradeStar {
  grade: string;
  star: number;
}

/** 편성 칸마다 고른 등급·화면 성 (카드·등급·성이 맞는 칸만, 출처 합산 단계의 SSS 장수 세기용) */
export function cardSlotGradeStars(values: CalcValues, tables: StatTables): CardSlotGradeStar[] {
  return CARD_SLOT_NUMBERS.map((slot) => {
    const row = selectedCardRow(values, tables, slot);
    return row ? { grade: row.grade, star: cardDisplayStar(tables, row) } : { grade: '', star: 0 };
  });
}

/**
 * 장착 SSS 카드 장수 = 등급이 SSS 이상 (SSS · R · SR … 전부) 인 칸 수. 별 (성) 은 보지 않는다.
 * 근거: 게임 코드 m2688 @33ec108 이 장착 카드마다 카드 표 행의 등급 번호가 6 초과 (SSS = 7) 이면 장수를 1 올린다
 * (@33ec39c~33ec3cc, 별 비교 없음). 등급 번호 대응 (SSS = 7, R = 8 …) 은 유력 (같은 함수의 다음 문턱 > 7, > 10 … 이 R · UR … 와 맞음)
 * — claude-docs/app_dump/il2cpp_analysis/work_collect/README.md 1-1
 */
export function sssCardCount(slotGradeStars: CardSlotGradeStar[]): number {
  return cardCountAtLeast(slotGradeStars, SSS_GRADE);
}

/** 장착 카드 중 등급이 grade 이상인 칸 수 (별 무관, 편성 칸이 비었거나 맞는 행이 없으면 세지 않음) */
export function cardCountAtLeast(slotGradeStars: CardSlotGradeStar[], grade: string): number {
  const rank = GRADE_ORDER.indexOf(grade);
  return slotGradeStars.filter((slot) => GRADE_ORDER.indexOf(slot.grade) >= rank).length;
}

/** "…MonsterCardCnt" 이름마다 쓰는 등급별 장착 수 (등급 → 그 등급 이상 장수) */
export function cardCountsByGrade(slotGradeStars: CardSlotGradeStar[]): Record<string, number> {
  return Object.fromEntries(
    Object.values(CARD_COUNT_SUFFIX_GRADES).map((grade) => [grade, cardCountAtLeast(slotGradeStars, grade)]),
  );
}

export interface ExpandedLines {
  lines: Line[];
  /** 전투 조건 효과라 합산에서 빼야 하는 스탯 (줄은 그대로 두고 알림만, 기존 HTML 과 같음) */
  skippedStats: string[];
}

/**
 * 몬스터 카드 "N 등급 이상 카드 장착 수 × n%" (꼬리말 _SSSMonsterCardCnt·_RMonsterCardCnt·_URMonsterCardCnt …) → 기본 스탯 + n × 그 등급 이상 장수.
 * SSS 장수는 sssCards, 그 밖 등급 장수는 gradeCounts (등급 → 장수, cardCountsByGrade) 로 받는다.
 * 주위 적 수 (_MonsterCntLong)·그 밖 전투 조건 줄은 스탯 이름만 skippedStats 에 모은다 (줄은 그대로 돌려줌).
 * 단 enemyCountReached (적 수 5 이상 칸 켜짐, 처음 꺼짐) 면 _MonsterCntLong 줄은 꼬리말을 뗀 일반 스탯 줄로 바꿔 합산한다.
 * 처치 중첩 (_per_attackDamage_Kill) 줄도 여기서는 그대로 두고 이름만 모은다 (전투 중 중첩이라 버프 탭이 cardStackLines 로 따로 넣는다)
 */
export function countExpandedLines(
  lines: Line[],
  sssCards: number,
  label: SourceLabel,
  enemyCountReached = false,
  gradeCounts: Record<string, number> = {},
): ExpandedLines {
  const skipped = new Set<string>();
  const expanded = lines.map((item): Line => {
    const stat = item.stat || '';
    if (enemyCountReached && stat.endsWith(ENEMY_COUNT_SUFFIX)) {
      return {
        ...item,
        source: label('calc.card.sources.enemyCountReached', { source: item.source }),
        stat: stat.slice(0, -ENEMY_COUNT_SUFFIX.length),
      };
    }
    const countSuffix = Object.keys(CARD_COUNT_SUFFIX_GRADES).find((suffix) => stat.endsWith(suffix));
    if (countSuffix && item.value) {
      const grade = CARD_COUNT_SUFFIX_GRADES[countSuffix];
      const count = countSuffix === SSS_CARD_COUNT_SUFFIX ? sssCards : (gradeCounts[grade] ?? 0);
      return {
        source:
          countSuffix === SSS_CARD_COUNT_SUFFIX
            ? label('calc.card.sources.sssExpanded', { source: item.source, count })
            : label('calc.card.sources.gradeExpanded', { source: item.source, grade, count }),
        stat: stat.slice(0, -countSuffix.length),
        value: item.value * count,
      };
    }
    if (BATTLE_CONDITION_SUFFIXES.some((suffix) => stat.endsWith(suffix))) skipped.add(stat);
    return item;
  });
  return { lines: expanded, skippedStats: [...skipped] };
}

/**
 * 카드 전투 중 중첩 줄 (버프 탭이 다른 탭 줄 otherLines 에서 읽어 넣음, 사용자 결정: 최대 상태):
 * - 카드 2번 처치 중첩 `_per_attackDamage_Kill` (T410 m2276 @33d1320): 컨테이너 값 v (같은 이름 줄은 먼저 곱해 합침) 를 5중첩 선형으로 공격력 % 에 → 1 + (v − 1) × 5. 값 140 → ×8
 * - 카드 3번 스킬 사용 중첩 `attackDamage_useSkill` (T410 m2308 @33ce078): 합 계열 값 합 % 를 5중첩 선형으로 공격력 % 에 → 1 + 값 / 100 × 5. 값 160 → ×9
 */
export function cardStackLines(otherLines: Line[], label: SourceLabel): Line[] {
  const stackLines: Line[] = [];
  const killLines = otherLines.filter((item) => item.stat === KILL_STAT && item.value);
  if (killLines.length) {
    const factor = killLines.reduce((product, item) => product * (1 + (item.value as number) / PERCENT_DIVISOR), 1);
    stackLines.push({
      source: label('calc.card.sources.killStacks', { stacks: KILL_MAX_STACKS }),
      stat: ATTACK_PERCENT_STAT,
      value: (factor - 1) * KILL_MAX_STACKS * PERCENT_DIVISOR,
    });
  }
  const useSkillSum = otherLines
    .filter((item) => item.stat === USE_SKILL_STAT)
    .reduce((sum, item) => sum + Number(item.value || 0), 0);
  if (useSkillSum) {
    stackLines.push({
      source: label('calc.card.sources.useSkillStacks', { stacks: USE_SKILL_MAX_STACKS }),
      stat: ATTACK_PERCENT_STAT,
      value: useSkillSum * USE_SKILL_MAX_STACKS,
    });
  }
  return stackLines;
}
