/**
 * 몬스터 카드 (기존 stat-calc-sources.js cardGradeChoice / cardPairs / setLines / renderCard, stat-calc.html sssCardCount /
 * countExpandedLines) → 효과 줄. 등급·성 선택지는 저장 순서와 상관없이 고른 카드로 매번 다시 계산한다
 */
import { CONSTS } from '@/CONSTS';
import type { StatTables, TableRow } from '@/data/statTables';
import type { Line } from '@/calc/combine';
import type { CalcValues } from '@/calc/types';
import { gradeStarValue, groupBy, numberValue, rowsOf, unique, type SourceLabel } from '@/calc/sources/heroWeaponCardPet/shared';

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
  MY_HP_70_SUFFIX,
  MY_HP_70_STATS,
  CONDITION_SUFFIXES,
  DAMAGE_INCREASE_HERO_STAT,
  ENEMY_COUNT_BY_TARGET,
  STAGE_BOSS_TARGET,
  HERO_TARGETS,
  BASE_STAT_ALIASES,
  USE_SKILL_SKILL_STAT,
  USE_SKILL_SKILL_TARGET_STAT,
  KILL_STAT,
  KILL_MAX_STACKS,
  KILL_STACK_TARGET,
  USE_SKILL_STAT,
  USE_SKILL_MAX_STACKS,
  BUFF_ATTACK_STAT,
  BUFF_ATTACK_MAX_STACKS,
  BUFF_ATTACK_TARGET_STAT,
  ATTACK_PERCENT_STAT,
} = CONSTS.heroWeaponCardPet.card;
const PERCENT_DIVISOR = CONSTS.common.PERCENT_DIVISOR;
/** 교체 등장 후 지속 효과 스탯 (`_per_<스탯>_HeroSwap`): 앞부분이 기본 스탯 이름 (특성의 mastery.ts 와 같은 규칙) */
const HERO_SWAP_STAT_PATTERN = new RegExp(`^(_per_.+)_${CONSTS.masteryRuneBuff.ULTIMATE_HERO_SWAP_KEY}$`);

export const CARD_SET_BONUS_FIELD = 'relicLink_cardSetBonus';
/** 추천 계산 전용 칸: 안 열린 마크 묶음을 "열렸다면" 으로 볼 때 세트 개수에 더하는 몫 (JSON {세트: 개수}) */
export const CARD_EXTRA_MARKS_FIELD = 'cardExtraSetMarks';
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
  // 추천 계산 전용: 아직 안 열린 마크 묶음을 "열렸다면" 으로 볼 때 더하는 세트 개수 (JSON {세트: 개수}, 보통은 비어 있음)
  const extraText = values[CARD_EXTRA_MARKS_FIELD];
  if (extraText) {
    try {
      for (const [setId, count] of Object.entries(JSON.parse(extraText) as Record<string, number>)) {
        if (count > 0) counts[setId] = (counts[setId] ?? 0) + count;
      }
    } catch {
      // 잘못된 글이면 더하지 않는다
    }
  }
  return counts;
}

export interface CardSetTier {
  setCount: number;
  stat: string;
  value: number;
  reached: boolean;
  /** 계산식 표시용: 값 = base + perLevel × level (CardSet 표 val1 · valUp1, 세트 레벨) */
  base: number;
  perLevel: number;
  level: number;
}
export interface CardSetState {
  setId: string;
  markCount: number;
  tiers: CardSetTier[];
  /** 계산식 표시용: 편성 칸마다 카드의 세트 점수 (Card 표 setPoint, 카드가 없는 칸은 뺌). 세트 레벨은 보통 이 합 */
  levelParts: number[];
}

/** 세트마다 단계 효과: 값 = 기본 + 레벨당 × 세트 보너스 합계 (모든 세트 같은 레벨), 마크 수 이하 단계만 적용 */
export function cardSetStates(values: CalcValues, tables: StatTables): CardSetState[] {
  const level = numberValue(values, CARD_SET_BONUS_FIELD);
  const marks = cardSetMarkCounts(values, tables);
  const levelParts = CARD_SLOT_NUMBERS.flatMap((slot) => {
    const point = Number(selectedCardRow(values, tables, slot)?.setPoint);
    return point > 0 ? [point] : [];
  });
  return groupBy(rowsOf(tables, 'CardSet'), 'setId').map((group) => {
    const markCount = marks[group.key] ?? 0;
    return {
      setId: group.key,
      markCount,
      levelParts,
      tiers: group.rows.map((row) => ({
        setCount: Number(row.setCnt),
        stat: row.statName,
        value: Number(row.val1) + Number(row.valUp1) * level,
        reached: Number(row.setCnt) <= markCount,
        base: Number(row.val1),
        perLevel: Number(row.valUp1),
        level,
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

/** 전투 상황: 대미지 계산이 넣는 대미지 대상 (DamageTarget) 과 스킬 한 번에 맞는 적 수 */
export interface BattleContext {
  damageTarget: string;
  targetsPerSkill: number;
}

/** 꼬리말을 뗀 스탯을 계산에서 읽는 이름으로 (`_per_DamageIncrease` → 공격력 증가) */
function aliasedStat(stat: string): string {
  return BASE_STAT_ALIASES[stat] ?? stat;
}

/** 전투 조건 꼬리말이 붙은 스탯이면 꼬리말을 뗀 이름과 조건 종류 (CONDITION_SUFFIXES) */
function stripCondition(stat: string): { base: string; kind: string } | undefined {
  const found = CONDITION_SUFFIXES.find(([suffix]) => stat.endsWith(suffix));
  if (found) return { base: stat.slice(0, -found[0].length), kind: found[1] };
  if (stat === DAMAGE_INCREASE_HERO_STAT) return { base: stat.slice(0, stat.lastIndexOf('_')), kind: 'nearHero' };
  return undefined;
}

/** 이 전투 상황에서 조건이 맞는가 (스테이지는 적 수 가정이 입력에 달려 있고, 나머지 대상은 적 1마리) */
function conditionMet(kind: string, battle: BattleContext): boolean {
  // 주위 적 수: 대상별 표 (없는 대상은 적 1마리 이하 → 5 이하만 켜짐)
  const enemyCount = ENEMY_COUNT_BY_TARGET[battle.damageTarget];
  switch (kind) {
    case 'enemyShort':
      return enemyCount ? enemyCount.short : true;
    case 'enemyLong':
      return enemyCount ? enemyCount.long : false;
    case 'single':
      // 스테이지 · 무리 대상은 한 번에 맞는 적 수 입력, 나머지는 1
      return battle.targetsPerSkill <= 1;
    case 'stageBoss':
      return battle.damageTarget === STAGE_BOSS_TARGET;
    case 'nearHero':
      return HERO_TARGETS.includes(battle.damageTarget);
    default:
      return false;
  }
}

/**
 * 몬스터 카드 "N 등급 이상 카드 장착 수 × n%" (꼬리말 _SSSMonsterCardCnt·_RMonsterCardCnt·_URMonsterCardCnt …) → 기본 스탯 + n × 그 등급 이상 장수.
 * SSS 장수는 sssCards, 그 밖 등급 장수는 gradeCounts (등급 → 장수, cardCountsByGrade) 로 받는다.
 * 주위 적 수 (_MonsterCntLong)·그 밖 전투 조건 줄은 스탯 이름만 skippedStats 에 모은다 (줄은 그대로 돌려줌).
 * 단 enemyCountReached (적 수 5 이상 칸 켜짐, 처음 꺼짐) 면 _MonsterCntLong 줄은 꼬리말을 뗀 일반 스탯 줄로 바꿔 합산한다.
 * 처치 중첩 (_per_attackDamage_Kill) 줄도 여기서는 그대로 두고 이름만 모은다 (전투 중 중첩이라 버프 탭이 cardStackLines 로 따로 넣는다).
 * 교체 등장 후 지속 효과 (`_per_<스탯>_HeroSwap`) 는 특성과 같이 기본 스탯 줄로 바꾸고 켜진 시간 비율 (swapUptimePercent) 만큼의 평균 값을 넣는다.
 * 비율이 0 (교체 없음) 이면 줄을 그대로 둔다 (합산에서 읽는 곳이 없어 적용되지 않는다).
 * 전투 조건 꼬리말 (주위 적 5마리 이하 · 적 1마리 · 스테이지 보스전 · 주위 히어로 몬스터, CONDITION_SUFFIXES) 은 전투 상황 (battle) 이 있고
 * 조건이 맞으면 꼬리말을 뗀 일반 스탯으로 합산하고, 아니거나 전투 상황이 없으면 줄을 그대로 둔다 (효과 0)
 */
export function countExpandedLines(
  lines: Line[],
  sssCards: number,
  label: SourceLabel,
  enemyCountReached = false,
  gradeCounts: Record<string, number> = {},
  swapUptimePercent = 0,
  battle?: BattleContext,
): ExpandedLines {
  const skipped = new Set<string>();
  const expanded = lines.map((item): Line => {
    const stat = item.stat || '';
    const heroSwap = HERO_SWAP_STAT_PATTERN.exec(stat);
    if (heroSwap && swapUptimePercent > 0 && item.value) {
      return {
        source: label('calc.ultimate.heroSwapSource', { name: item.source, percent: swapUptimePercent }),
        stat: heroSwap[1],
        value: (item.value * swapUptimePercent) / 100,
      };
    }
    const myHp70Base = stat.endsWith(MY_HP_70_SUFFIX) ? stat.slice(0, -MY_HP_70_SUFFIX.length) : '';
    if (MY_HP_70_STATS.includes(myHp70Base)) {
      return { ...item, source: label('calc.card.sources.myHp70', { source: item.source }), stat: myHp70Base };
    }
    const condition = battle ? stripCondition(stat) : undefined;
    if (battle && condition && conditionMet(condition.kind, battle)) {
      return { ...item, source: label('calc.card.sources.battleCondition', { source: item.source }), stat: aliasedStat(condition.base) };
    }
    // 전투 상황이 없을 때만 종합 탭 "적 수 5 이상" 칸을 따른다 (대미지 계산은 대상별 표)
    if (!battle && enemyCountReached && stat.endsWith(ENEMY_COUNT_SUFFIX)) {
      return {
        ...item,
        source: label('calc.card.sources.enemyCountReached', { source: item.source }),
        stat: aliasedStat(stat.slice(0, -ENEMY_COUNT_SUFFIX.length)),
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
export function cardStackLines(otherLines: Line[], label: SourceLabel, target: string = KILL_STACK_TARGET): Line[] {
  const stackLines: Line[] = [];
  // 처치 중첩은 일반 몬스터를 계속 잡는 대상에서만 쌓인다 (보스 · 히어로 몬스터는 잡으면 전투가 끝난다)
  const killLines = target === KILL_STACK_TARGET ? otherLines.filter((item) => item.stat === KILL_STAT && item.value) : [];
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
  const useSkillSkillSum = otherLines
    .filter((item) => item.stat === USE_SKILL_SKILL_STAT)
    .reduce((sum, item) => sum + Number(item.value || 0), 0);
  if (useSkillSkillSum) {
    stackLines.push({
      source: label('calc.card.sources.useSkillSkillStacks', { stacks: USE_SKILL_MAX_STACKS }),
      stat: USE_SKILL_SKILL_TARGET_STAT,
      value: useSkillSkillSum * USE_SKILL_MAX_STACKS,
    });
  }
  const buffAttackSum = otherLines
    .filter((item) => item.stat === BUFF_ATTACK_STAT)
    .reduce((sum, item) => sum + Number(item.value || 0), 0);
  if (buffAttackSum) {
    stackLines.push({
      source: label('calc.card.sources.buffAttackStacks', { stacks: BUFF_ATTACK_MAX_STACKS }),
      stat: BUFF_ATTACK_TARGET_STAT,
      value: buffAttackSum * BUFF_ATTACK_MAX_STACKS,
    });
  }
  return stackLines;
}
