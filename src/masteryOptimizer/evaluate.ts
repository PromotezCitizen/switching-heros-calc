/**
 * 배분 → 효율. 특성 레벨 칸 `mastery_<rNo>` 를 배분으로 덮어쓰고 공격 한 번씩 대미지 합 (targetDamage, log10, 클수록 좋음, 계산 불가는 −Infinity) 을 낸다.
 */
import { masteryLevel, masteryLevelKey, type MasteryTrait } from '@/calc/sources/masteryRuneBuff/mastery';
import type { CalcValues } from '@/calc/types';
import type { StatTables } from '@/data/statTables';
import { CONSTS } from '@/CONSTS';
import { targetDamageWithSwap } from '@/dpm/swapDamage';
import type { DamageInputs, DamageTarget } from '@/dpm/targetDamage';
import type { Allocation } from '@/masteryOptimizer/rules';
import { chancesFromLines, type Chances } from '@/calc/sources/masteryRuneBuff/chances';
import { attackStats } from '@/dpm/attackStats';

/** 입력값의 특성 레벨 칸 → 배분 (레벨 0 은 뺀다) */
export function allocationFromValues(values: CalcValues, traits: MasteryTrait[]): Allocation {
  const allocation: Allocation = {};
  for (const trait of traits) {
    const level = masteryLevel(values, trait);
    if (level > 0) allocation[trait.rNo] = level;
  }
  return allocation;
}

/** 모든 특성 레벨 칸을 배분으로 바꾼 입력값 (배분에 없는 특성은 칸을 비운다) */
export function valuesWithAllocation(values: CalcValues, traits: MasteryTrait[], allocation: Allocation): CalcValues {
  const next = { ...values };
  for (const trait of traits) {
    const key = masteryLevelKey(trait.rNo);
    const level = allocation[trait.rNo] ?? 0;
    if (level > 0) next[key] = String(level);
    else delete next[key];
  }
  return next;
}

/**
 * 한 번씩 대미지 합 (log10): 평타 1번 + 장착 직업 스킬 1번씩 + 전용 스킬 1번 + 교체 스킬 1번 (교체가 켜져 있으면 두 히어로 모두).
 * 쿨타임 · 시전 횟수는 보지 않는다. 계산할 수 없으면 −Infinity
 */
export function oneCastEachLog(
  values: CalcValues,
  tables: StatTables,
  target: DamageTarget,
  inputs: DamageInputs,
): number {
  return targetDamageWithSwap(values, tables, target, inputs).totalLog;
}

/**
 * 특성 추천의 비교 값 (oneCastEachLog). 초과분 10% 마다 붙는 특성은 확률이 OPTIMIZER_RULES.RUSH_MIN_CHANCE 를 넘어야 센다
 */
export function evaluateOneCastEach(
  values: CalcValues,
  traits: MasteryTrait[],
  tables: StatTables,
  allocation: Allocation,
  target: DamageTarget,
  inputs: DamageInputs,
): number {
  const { RUSH_MIN_CHANCE, RUSH_MIN_CHANCE_FIELD } = CONSTS.dpm.OPTIMIZER_RULES;
  const allocated = {
    ...valuesWithAllocation(values, traits, allocation),
    [RUSH_MIN_CHANCE_FIELD]: String(RUSH_MIN_CHANCE),
  };
  return oneCastEachLog(allocated, tables, target, inputs);
}

/** 배분을 넣은 1슬롯 히어로의 확률 (연타, 슈퍼 치명타, 관통, 스위칭 부스트, 스킬 콤보, 무자비, 매직 가드) */
export function chancesOfAllocation(
  values: CalcValues,
  traits: MasteryTrait[],
  tables: StatTables,
  allocation: Allocation,
  target: DamageTarget,
  inputs: DamageInputs,
): Chances {
  const { TARGETS, MAX_TARGETS, DAMAGE_TARGET_FIELD, TARGETS_PER_SKILL_FIELD } = CONSTS.dpm;
  const unit = TARGETS[target].UNIT;
  const targets =
    unit === 'normal' ? Math.min(Math.max(inputs.targetsPerSkill, 1), MAX_TARGETS[target] ?? Infinity) : 1;
  const battleValues = {
    ...valuesWithAllocation(values, traits, allocation),
    [DAMAGE_TARGET_FIELD]: target,
    [TARGETS_PER_SKILL_FIELD]: String(targets),
  };
  return chancesFromLines(attackStats(battleValues, tables, unit).lines, battleValues, tables);
}

/**
 * 확률 바닥 검사 (from → trial 이동이 받아들여지는가). 확률 특성 (OPTIMIZER_RULES.CHANCE_FIRST) 레벨이 줄어드는 이동만 본다:
 * - 100% 이상이던 확률은 100% 미만으로 내리지 않는다 (100% 미만이면 옵션 발동 0)
 * - trial 에서 켜진 확률 문턱 얼티밋 (150% · 200%) 이 넘고 있던 확률은 그 문턱 이하로 내리지 않는다
 * - trial 에서 켜진 확률 초과 개수 얼티밋 (80% · 120%) 이 세고 있던 확률은 그 문턱 이하로 내리지 않는다
 */
export function makeChanceGuard(
  values: CalcValues,
  traits: MasteryTrait[],
  tables: StatTables,
  target: DamageTarget,
  inputs: DamageInputs,
): (from: Allocation, trial: Allocation) => boolean {
  const { CHANCE_FIRST } = CONSTS.dpm.OPTIMIZER_RULES;
  const { CHANCE_ULTIMATES, CHANCE_COUNT_ULTIMATES, CHANCE_COUNT_NAMES } = CONSTS.masteryRuneBuff;
  const { PROBABILITY_MAX } = CONSTS.dpm;
  const chanceTraits = traits.filter((trait) => CHANCE_FIRST.includes(trait.rNo));
  const ultimates = traits.filter(
    (trait) =>
      trait.ultimate && (CHANCE_ULTIMATES[trait.statName] || CHANCE_COUNT_ULTIMATES[trait.statName] !== undefined),
  );
  const cache = new Map<string, Chances>();
  const chancesOf = (allocation: Allocation): Chances => {
    const key = JSON.stringify(Object.entries(allocation).sort(([left], [right]) => left.localeCompare(right)));
    let chances = cache.get(key);
    if (!chances) {
      chances = chancesOfAllocation(values, traits, tables, allocation, target, inputs);
      cache.set(key, chances);
    }
    return chances;
  };
  return (from, trial) => {
    if (!chanceTraits.some((trait) => (trial[trait.rNo] ?? 0) < (from[trait.rNo] ?? 0))) return true;
    const before = chancesOf(from);
    const after = chancesOf(trial);
    for (const name of CHANCE_COUNT_NAMES) {
      if ((before[name] ?? 0) >= PROBABILITY_MAX && (after[name] ?? 0) < PROBABILITY_MAX) return false;
    }
    for (const trait of ultimates) {
      if (!((trial[trait.rNo] ?? 0) > 0)) continue;
      const rule = CHANCE_ULTIMATES[trait.statName];
      if (rule) {
        if ((before[rule.chance] ?? 0) > rule.threshold && !((after[rule.chance] ?? 0) > rule.threshold)) return false;
        continue;
      }
      const threshold = CHANCE_COUNT_ULTIMATES[trait.statName];
      for (const name of CHANCE_COUNT_NAMES) {
        if ((before[name] ?? 0) > threshold && !((after[name] ?? 0) > threshold)) return false;
      }
    }
    return true;
  };
}

/** 확률 특성 statName → 그 특성이 올리는 확률 이름 (값이 확률 % 에 그대로 더해지는 특성만) */
const CHANCE_OF_STAT: Record<string, string> = {
  doubleAttackAddPer: 'doubleAttack',
  superCriticalAddPer: 'superCritical',
  spearAttackAddPer: 'spearAttack',
  switchingBoostAddPer: 'switchingBoost',
  equipHeroToSwitchingBoostUp1: 'switchingBoost',
  equipHeroToSwitchingBoostUp2: 'switchingBoost',
  skillComboAddPer: 'skillCombo',
  smiteAddPer: 'smite',
  barrierAddVal: 'barrier',
};

/**
 * 확률 특성을 한 번에 몇 레벨 올려야 그 확률이 다음 계단을 넘는지 (1레벨씩으로는 계단을 넘기 전까지 이득이 0 이라 못 찾는 이동).
 * 계단 = 100%, 100% 넘은 뒤 10% 마다, 120 · 150 · 200 문턱 중 지금 확률보다 큰 가장 가까운 것. 확률 특성이 아니거나 최대면 null
 */
export function makeJumpLevels(
  values: CalcValues,
  traits: MasteryTrait[],
  tables: StatTables,
  target: DamageTarget,
  inputs: DamageInputs,
): (allocation: Allocation, trait: MasteryTrait) => number | null {
  const { PROBABILITY_MAX } = CONSTS.dpm;
  const STEP = CONSTS.masteryRuneBuff.BATTLE.RUSH_STEP;
  const THRESHOLDS = [120, 150, 200];
  const EPSILON = 1e-6;
  const cache = new Map<string, Chances>();
  return (allocation, trait) => {
    const chanceName = CHANCE_OF_STAT[trait.statName];
    const level = allocation[trait.rNo] ?? 0;
    if (!chanceName || level >= trait.maxLevel) return null;
    const key = JSON.stringify(Object.entries(allocation).sort(([left], [right]) => left.localeCompare(right)));
    let chances = cache.get(key);
    if (!chances) {
      chances = chancesOfAllocation(values, traits, tables, allocation, target, inputs);
      cache.set(key, chances);
    }
    const chance = chances[chanceName] ?? 0;
    const stepBoundary =
      chance < PROBABILITY_MAX
        ? PROBABILITY_MAX
        : PROBABILITY_MAX + (Math.floor((chance - PROBABILITY_MAX) / STEP) + 1) * STEP;
    const boundary = Math.min(stepBoundary, ...THRESHOLDS.filter((threshold) => threshold > chance));
    const valueAt = (lv: number) => (lv > 0 ? trait.statValue + trait.statUpValue * (lv - 1) : 0);
    for (let next = level + 1; next <= trait.maxLevel; next += 1) {
      if (chance + valueAt(next) - valueAt(level) >= boundary + EPSILON) return next - level;
    }
    return null;
  };
}

/** 확률의 바탕 특성 statName → 확률 이름 (최대 1 특성) */
const CHANCE_BASE_STAT: Record<string, string> = {
  doubleAttack: 'doubleAttack',
  superCritical: 'superCritical',
  spearAttack: 'spearAttack',
  switchingBoost: 'switchingBoost',
  skillCombo: 'skillCombo',
  smite: 'smite',
  barrier: 'barrier',
};

/**
 * 확률 특성 (candidates) 중 그 확률이 확률 특성을 모두 최대로 찍어도 100% 에 닿지 않는 것 (100% 미만이면 효과 0 이라 먼저 찍을 이유가 없음).
 * 예: 매직 가드 10 + 마나 전도체 20 + 마나 전도체 2 20 = 50%
 */
export function unreachableChanceTraits(
  values: CalcValues,
  traits: MasteryTrait[],
  tables: StatTables,
  target: DamageTarget,
  inputs: DamageInputs,
  candidates: ReadonlySet<string>,
  base: Allocation = {},
): Set<string> {
  // 계정 배분 (base) 위에 확률 특성만 최대로 올린다 (공격속도 특성 등 다른 특성이 확률에 주는 몫을 지우지 않게)
  const maxed: Allocation = { ...base };
  for (const trait of traits) if (candidates.has(trait.rNo)) maxed[trait.rNo] = trait.maxLevel;
  const chances = chancesOfAllocation(values, traits, tables, maxed, target, inputs);
  const unreachable = new Set<string>();
  for (const trait of traits) {
    if (!candidates.has(trait.rNo)) continue;
    const chanceName = CHANCE_OF_STAT[trait.statName] ?? CHANCE_BASE_STAT[trait.statName];
    if (chanceName && (chances[chanceName] ?? 0) < CONSTS.dpm.PROBABILITY_MAX) unreachable.add(trait.rNo);
  }
  return unreachable;
}
