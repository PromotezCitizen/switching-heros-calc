/**
 * 버프·연타 특성 줄: 광폭화 (특성을 찍었으면 늘 5중첩), 학살자 (켰을 때), 연타 폭주, 음식 (일반 몬스터 피해 3종 중 하나만, 골랐을 때),
 * 공격력 이벤트 버프 (켰을 때, 음식과 같이 켜짐).
 * 기존 stat-calc.html berserkStacks (622~625), overchargeLog·doubleAttackRushPercent (746~753),
 * killerLog·buffLines (788~798), multiplierPercentLog (736~740), stat-calc-core.js berserkMultiplier (151~156).
 * 연타 % 는 프로필 칸 대신 다른 탭 줄의 연타·공격속도 합으로 계산한다.
 */
import { CONSTS } from '@/CONSTS';
import { tableRows, type RawTable, type StatTables, type TableRow } from '@/data/statTables';
import { readFlag } from '@/store/storedValues';
import { combineLines, type CombinedStat, type Line } from '@/calc/combine';
import type { CalcValues } from '@/calc/types';
import { heroFirstRow, slotHeroName } from '@/calc/sources/hero/character';
import { equippedExclusiveStar } from '@/calc/sources/heroWeaponCardPet/weapon';
import { hasEquippedActiveSkill } from '@/calc/sources/skill/skill';
import { learnedTraitValue, masteryLevel, masteryTraits, plainNumber } from '@/calc/sources/masteryRuneBuff/mastery';
import type { SourceLabel } from '@/calc/sources/masteryRuneBuff/sourceLabel';

const {
  BERSERK_MAX_STACKS,
  KILLER_BASE_PERCENT,
  DOUBLE_ATTACK_THRESHOLD,
  DOUBLE_ATTACK_RUSH_STEP,
  DOUBLE_ATTACK_SPEED_THRESHOLD,
  DOUBLE_ATTACK_SPEED_STEP,
  DOUBLE_ATTACK_MAX_STACKS,
  SKILL_COMBO_MAX_STACKS,
  SKILL_COMBO_FINAL_MULTIPLIER,
  LARGE_MULTIPLIER_LOG,
  PERCENT_LOG,
  STATS,
  JOB_ATTACK_SPEED_SUFFIX,
  ATTRIBUTE_ATTACK_SPEED_SUFFIX,
  KILLER_ACTIVE_FIELD,
  NORMAL_MONSTER_FOOD_FIELD,
  NORMAL_MONSTER_FOODS,
  ATTACK_EVENT_BUFF_FIELD,
  ATTACK_EVENT_BUFF,
  SUPER_CRITICAL_STRIKE_THRESHOLD,
  FINAL_ATTACK_MULTIPLIER,
  EXCLUSIVE_STACK_BUFF,
  ON_ATTACK_BUFF_STATS,
} = CONSTS.masteryRuneBuff;
const PERCENT_DIVISOR = CONSTS.common.PERCENT_DIVISOR;

/** 배율 (log10) → "_per_ 줄" 의 % 값 (log10): × M = × (1 + v/100) 이 되는 v. 배율이 크면 1 을 빼도 같은 값 */
export function multiplierPercentLog(multiplierLog: number): number {
  return (
    (multiplierLog > LARGE_MULTIPLIER_LOG ? multiplierLog : Math.log10(Math.pow(10, multiplierLog) - 1)) + PERCENT_LOG
  );
}

/**
 * 광폭화 중첩 = 스킬 광폭화 특성 (berserkSkillUse) 을 찍었으면 늘 최대 5중첩, 안 찍었으면 0
 * (입력 칸 없음, 사용자 말 2026-10-05 "광폭화 5중첩밖에 안될건데", 옛 HTML berserkStacks 와 같음)
 */
export function berserkStacks(masteryTable: RawTable, values: CalcValues): number {
  const skillTrait = masteryTraits(masteryTable).find((trait) => trait.statName === STATS.BERSERK_SKILL);
  return skillTrait && masteryLevel(values, skillTrait) > 0 ? BERSERK_MAX_STACKS : 0;
}

/** 광폭화 중첩 배율 (log10) = log10(1 + 중첩당 % (표 berserk) × 중첩 / 100), 중첩은 0~5 */
export function berserkMultiplierLog(masteryTable: RawTable, stacks: number): number {
  const row = tableRows(masteryTable).find((record) => record.statName === STATS.BERSERK);
  const perStack = row ? Number(row.statValue) : 0;
  const clamped = Math.min(Math.max(Number(stacks) || 0, 0), BERSERK_MAX_STACKS);
  return Math.log10(1 + (perStack * clamped) / PERCENT_DIVISOR);
}

/** 학살자 배율 (log10) = log10(1 + (100 + 학살자 증가량 특성 값) / 100) */
export function killerLog(masteryTable: RawTable, values: CalcValues): number {
  const addPercent = learnedTraitValue(masteryTraits(masteryTable), values, STATS.KILLER_ADD);
  return Math.log10(1 + (KILLER_BASE_PERCENT + addPercent) / PERCENT_DIVISOR);
}

/** 합 계열 스탯의 합 (대소문자만 다른 철자도 같은 스탯, 없으면 0) */
export function combinedSum(combined: Record<string, CombinedStat>, stat: string): number {
  const lowerCase = stat.toLowerCase();
  const key = Object.keys(combined).find((name) => name.toLowerCase() === lowerCase);
  return key ? combined[key].sum : 0;
}

/**
 * 공격속도 % = 공격속도 줄 합 (히어로 탭의 기본 공격속도 포함) + 1슬롯 히어로 직업·속성 공격속도 합.
 * 예: 기본 150 + 481 + 궁수 775 + 물 330 = 1,736 (사망 직후 프로필과 같음).
 * 특성 42 초월적 기량 (notActiveAttackSpeed) 은 장착 스킬에 액티브가 하나도 없을 때만 더한다 (전투 중 조건 아님, 상시).
 * 근거: 게임 코드 m2695 @33f4bdc 가 1슬롯 히어로 장착 스킬 중 종류 2 (액티브) 가 없고 값이 0 이 아니면 공격속도에 더함,
 * 15:28 전투 직전 화면 1,786 = 1,736 + 50 (work_collect/README.md 2-1).
 * 전투 중에만 오르는 공격속도 (관통의 맹공 204 복리 10중첩·추진력 13 +50·야성 강화 9·우격다짐 58, 최대 상태) 는 특성 탭 줄로 이미 합쳐져
 * 이 합에 들어온다 (battleState.ts battleStatLines, 2026-10-12 01:54 화면 2,193.37 과 일치)
 */
export function attackSpeedPercent(
  combined: Record<string, CombinedStat>,
  hero: TableRow | undefined,
  noActiveSkillEquipped: boolean,
): number {
  const stats: string[] = [STATS.ATTACK_SPEED];
  if (hero) stats.push(hero.job + JOB_ATTACK_SPEED_SUFFIX, hero.attribute + ATTRIBUTE_ATTACK_SPEED_SUFFIX);
  if (noActiveSkillEquipped) stats.push(STATS.NOT_ACTIVE_ATTACK_SPEED);
  return stats.reduce((sum, stat) => sum + combinedSum(combined, stat), 0);
}

/**
 * 연타 % = 연타 줄 합 + 연타 추가 특성 합 + 속도 과열 (공격속도 350% 를 넘은 10% 마다 특성 값).
 * 예: 10 + 40 + floor((2,025 − 350) / 10) × 1 = 217
 */
export function doubleAttackPercent(combined: Record<string, CombinedStat>, attackSpeed: number): number {
  const speedSteps = Math.max(Math.floor((attackSpeed - DOUBLE_ATTACK_SPEED_THRESHOLD) / DOUBLE_ATTACK_SPEED_STEP), 0);
  return (
    combinedSum(combined, STATS.DOUBLE_ATTACK) +
    combinedSum(combined, STATS.DOUBLE_ATTACK_ADD) +
    speedSteps * combinedSum(combined, STATS.DOUBLE_ATTACK_SPEED_OVER)
  );
}

/** 다른 탭 줄 전부 → 연타 % (공격속도의 직업·속성 몫은 1슬롯 히어로 기준) */
export function doubleAttackFromLines(lines: Line[], values: CalcValues, tables: StatTables): number {
  const combined = combineLines(lines);
  const hero = heroFirstRow(tables, slotHeroName(values, tables));
  return doubleAttackPercent(combined, attackSpeedPercent(combined, hero, !hasEquippedActiveSkill(values, tables)));
}

/** 과충전 연타 배율 (log10): 연타 > 100% 이고 특성 값이 있으면 log10(1 + 값/100). 최종값 분해용 (줄은 만들지 않음) */
export function overchargeLog(masteryTable: RawTable, values: CalcValues, doubleAttack: number): number {
  const value = learnedTraitValue(masteryTraits(masteryTable), values, STATS.OVERCHARGE);
  return value && doubleAttack > DOUBLE_ATTACK_THRESHOLD ? Math.log10(1 + value / PERCENT_DIVISOR) : 0;
}

/** 연타 폭주 %: 100% 를 넘은 연타의 10% 단위 개수 × 특성 값 */
export function doubleAttackRushPercent(masteryTable: RawTable, values: CalcValues, doubleAttack: number): number {
  const over = doubleAttack - DOUBLE_ATTACK_THRESHOLD;
  return over > 0
    ? Math.floor(over / DOUBLE_ATTACK_RUSH_STEP) *
        learnedTraitValue(masteryTraits(masteryTable), values, STATS.DOUBLE_ATTACK_RUSH)
    : 0;
}

/**
 * 연타·스킬 콤보 중첩 줄 (사용자 결정 "연타, 스킬콤보는 상시 최대중첩": 칸 없이 늘 최대 중첩).
 * - 가속 (doubleAttackDmgUp): 중첩당 공격력 % × 10 (광폭화처럼 중첩끼리 선형 합, combat-buff-sources.md 확정, 2026-10-12 01:54 화면 일치)
 * - 연타의 분노 (doubleAttackToDmgUp3): 10중첩 달성 시 공격력 % → 늘 붙음
 * - 스킬 콤보: 4중첩이면 다음 액티브 스킬 최종 데미지 × 8 → 늘 붙음 (붙는 스탯 추정)
 * 연타·스킬 콤보 확률이 0 이면 중첩이 쌓이지 않으므로 줄 없음
 */
export function stackLines(
  values: CalcValues,
  masteryTable: RawTable,
  sourceLabel: SourceLabel,
  doubleAttack: number,
  skillCombo: number,
): Line[] {
  const lines: Line[] = [];
  const traits = masteryTraits(masteryTable);
  if (doubleAttack > 0) {
    const perStack = learnedTraitValue(traits, values, STATS.DOUBLE_ATTACK_STACK);
    if (perStack) {
      lines.push({
        source: sourceLabel('calc.buff.doubleAttackStackSource', { stacks: DOUBLE_ATTACK_MAX_STACKS }),
        stat: STATS.ATTACK_PERCENT,
        value: perStack * DOUBLE_ATTACK_MAX_STACKS,
      });
    }
    const fullStack = learnedTraitValue(traits, values, STATS.DOUBLE_ATTACK_FULL_STACK);
    if (fullStack) {
      lines.push({
        source: sourceLabel('calc.buff.doubleAttackFullStackSource', { stacks: DOUBLE_ATTACK_MAX_STACKS }),
        stat: STATS.ATTACK_PERCENT,
        value: fullStack,
      });
    }
  }
  if (skillCombo > 0) {
    lines.push({
      source: sourceLabel('calc.buff.skillComboStackSource', {
        stacks: SKILL_COMBO_MAX_STACKS,
        multiplier: SKILL_COMBO_FINAL_MULTIPLIER,
      }),
      stat: STATS.ACTIVE_SKILL_PERCENT,
      log: multiplierPercentLog(Math.log10(SKILL_COMBO_FINAL_MULTIPLIER)),
    });
  }
  return lines;
}

/** 일반 몬스터 피해 음식 하나 (consts NORMAL_MONSTER_FOODS) */
export type NormalMonsterFood = (typeof NORMAL_MONSTER_FOODS)[number];

/** 음식 칸 값 → 고른 음식. 칸 하나에 하나만 담겨 음식끼리 겹치지 않는다. 비었거나 모르는 값이면 없음 (처음 상태 = 꺼짐) */
export function selectedNormalMonsterFood(values: CalcValues): NormalMonsterFood | undefined {
  const chosen = values[NORMAL_MONSTER_FOOD_FIELD];
  return NORMAL_MONSTER_FOODS.find((food) => food.id === chosen);
}

/**
 * 음식 효과 줄: 고른 음식의 일반 몬스터 피해 % (Item 표 double1).
 * 프로필 "일반 몬스터" 줄이 계산보다 ×7 큰 원인이 딸기 타르트 600% 라는 것은 추정 (gap-critdmg-normal.md 2-2:
 * 사용 기록 시각과 02:06 의 ×7.01 이 맞음). 다른 탭 줄을 모을 때는 버프 탭이라 빠진다
 */
export function normalMonsterFoodLines(values: CalcValues, sourceLabel: SourceLabel): Line[] {
  const food = selectedNormalMonsterFood(values);
  if (!food) return [];
  return [
    {
      source: sourceLabel('calc.buff.foodSource', { food: sourceLabel(`calc.buff.foods.${food.id}`) }),
      stat: food.stat,
      value: food.percent,
    },
  ];
}

/**
 * 공격력 이벤트 버프 줄: 칸을 켰을 때 공격력 % (Item 표 15 double1). 음식과 다른 버프라 음식 줄과 함께 들어간다.
 * 처음 상태 = 꺼짐. 다른 탭 줄을 모을 때는 버프 탭이라 빠진다
 */
export function attackEventBuffLines(values: CalcValues, sourceLabel: SourceLabel): Line[] {
  if (!readFlag(values, ATTACK_EVENT_BUFF_FIELD)) return [];
  return [{ source: sourceLabel('calc.buff.attackEventBuffSource'), stat: ATTACK_EVENT_BUFF.stat, value: ATTACK_EVENT_BUFF.percent }];
}

/**
 * "고른 대상 몬스터 공격시" 줄 (카드·스티커) → 버프 탭 줄. 게임은 이 줄을 공격할 때 5초 버프로만 넣고
 * 전투 밖 프로필에는 넣지 않는다 (m2708 · m2042, work_collect/README.md 2-5). 값·log 는 그대로 두고 스탯만 일반 이름으로 바꾼다.
 * otherLines = 버프 탭을 뺀 다른 탭 줄
 */
export function onAttackBuffLines(
  otherLines: Line[],
  target: keyof typeof CONSTS.summary.TARGET_STATS,
  sourceLabel: SourceLabel,
): Line[] {
  const targetStats: Record<string, string | readonly string[]> = CONSTS.summary.TARGET_STATS[target];
  return ON_ATTACK_BUFF_STATS.flatMap(({ group, stat }) => {
    const onAttackStats = new Set([targetStats[group]].flat().map((name) => name.toLowerCase()));
    return otherLines
      .filter((line) => onAttackStats.has(line.stat.toLowerCase()))
      .map((line): Line => ({ ...line, source: sourceLabel('calc.buff.onAttackSource', { source: line.source }), stat }));
  });
}

/**
 * 특성 107 초월의 일격: 슈퍼 치명타 확률 (계산 값) 이 문턱을 넘으면 치명타 데미지 곱 계열에 특성 값 % 를 곱한다
 * (m2710 @33fc5d8, 유력). 이 계정 Lv20 = 200% → ×3. 특성을 안 찍었거나 문턱 이하면 줄 없음
 */
export function superCriticalStrikeLines(
  values: CalcValues,
  masteryTable: RawTable,
  sourceLabel: SourceLabel,
  superCritical: number,
): Line[] {
  const percent = learnedTraitValue(masteryTraits(masteryTable), values, STATS.SUPER_CRITICAL_TO_CRITICAL_DAMAGE);
  if (!percent || !(superCritical > SUPER_CRITICAL_STRIKE_THRESHOLD)) return [];
  return [
    {
      source: sourceLabel('calc.buff.superCriticalStrikeSource', {
        chance: plainNumber(superCritical),
        threshold: SUPER_CRITICAL_STRIKE_THRESHOLD,
      }),
      stat: STATS.CRITICAL_DAMAGE_PERCENT,
      value: percent,
    },
  ];
}

/**
 * 최종 공격력 ×5 (_multiply_AttackDamage 자리, 공격력 증가와 따로 곱함). 출처는 전용 무기 1021 초월 ★10
 * "최대 중첩이면 공격력 ×5" (실측 확인) — 1슬롯 히어로가 그 무기를 장착하고 ★ 이 기준 이상일 때만 줄을 만든다
 * (입력 칸은 새로 두지 않음). 전투 중 버프라 전투 밖 프로필 값에는 원래 들어가지 않음
 */
export function finalAttackMultiplierLines(values: CalcValues, sourceLabel: SourceLabel, tables: StatTables): Line[] {
  const star = equippedExclusiveStar(values, tables, FINAL_ATTACK_MULTIPLIER.WEAPON_ID);
  if (star < FINAL_ATTACK_MULTIPLIER.MIN_STAR) return [];
  return [
    {
      source: sourceLabel('calc.buff.finalAttackMultiplierSource', {
        star: FINAL_ATTACK_MULTIPLIER.MIN_STAR,
        multiplier: FINAL_ATTACK_MULTIPLIER.MULTIPLIER,
      }),
      stat: STATS.FINAL_ATTACK_MULTIPLY,
      value: FINAL_ATTACK_MULTIPLIER.MULTIPLIER,
    },
  ];
}

/**
 * 전용 무기 1021 초월 ★7 (statType 30002): 공격력 % = 중첩당 값 (표 행 val2) × 최대 중첩 (val3), 늘 최대 중첩 (연타 중첩과 같은 결정).
 * 1슬롯 히어로가 그 무기를 장착하고 ★ 이 표 행의 ★ 이상일 때만. 값·중첩은 consts EXCLUSIVE_STACK_BUFF 주석 참고 (문구와 다름, 실측 확인)
 */
export function exclusiveStackBuffLines(values: CalcValues, sourceLabel: SourceLabel, tables: StatTables): Line[] {
  const { TABLE, WEAPON_ID, STAT_TYPE } = EXCLUSIVE_STACK_BUFF;
  const table = tables[TABLE];
  const row = table && tableRows(table).find((record) => record.weaponType === WEAPON_ID && record.statType === STAT_TYPE);
  if (!row || equippedExclusiveStar(values, tables, WEAPON_ID) < Number(row.star)) return [];
  const perStack = Number(row.val2);
  const maxStacks = Number(row.val3);
  return [
    {
      source: sourceLabel('calc.buff.exclusiveStackSource', { star: row.star, stacks: maxStacks }),
      stat: STATS.ATTACK_PERCENT,
      value: perStack * maxStacks,
    },
  ];
}

/** doubleAttack = 연타 % (doubleAttackFromLines) */
export function buffLines(
  values: CalcValues,
  masteryTable: RawTable,
  sourceLabel: SourceLabel,
  doubleAttack: number,
): Line[] {
  const lines: Line[] = [];
  const stacks = berserkStacks(masteryTable, values);
  if (stacks) {
    lines.push({
      source: sourceLabel('calc.buff.berserkSource', { stacks }),
      stat: STATS.ATTACK_PERCENT,
      log: multiplierPercentLog(berserkMultiplierLog(masteryTable, stacks)),
    });
  }
  if (readFlag(values, KILLER_ACTIVE_FIELD)) {
    lines.push({
      source: sourceLabel('calc.buff.killerSource'),
      stat: STATS.ATTACK_PERCENT,
      log: multiplierPercentLog(killerLog(masteryTable, values)),
    });
  }
  const rush = doubleAttackRushPercent(masteryTable, values, doubleAttack);
  if (rush) lines.push({ source: sourceLabel('calc.buff.rushSource'), stat: STATS.ATTACK_PERCENT, value: rush });
  return lines;
}
