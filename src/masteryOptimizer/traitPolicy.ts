/**
 * 특성 추천의 고정 · 무시 규칙 (consts OPTIMIZER_RULES).
 * - fixed: 출발 배분에서 최대 레벨로 찍고, 탐색 중에 빼지 않는다
 * - ignored: 찍지 않는다 (무시 목록 + 대상 종류에 맞지 않는 방어 특성 + 체력을 올리는 얼티밋)
 */
import { CONSTS } from '@/CONSTS';
import type { MasteryTrait } from '@/calc/sources/masteryRuneBuff/mastery';
import type { DamageTarget } from '@/dpm/targetDamage';

const { OPTIMIZER_RULES, TARGETS } = CONSTS.dpm;

export interface TraitPolicy {
  fixed: ReadonlySet<string>;
  ignored: ReadonlySet<string>;
  /** 출발 배분에서 먼저 최대로 찍는 확률 특성 (무시 특성은 뺀 뒤) */
  chanceFirst?: ReadonlySet<string>;
}

/** 체력 스탯 (statName 에 hp 마디가 있는 것: _per_hp_…, _pow_hp_…) */
const HP_STAT = /(^|_)hp(_|$)/i;

/** 1 · 2슬롯 두 히어로의 속성 / 성별 (formationHeroAttributes · formationHeroGenders). 한 명이면 길이 1 */
export interface Formation {
  attributes: readonly string[];
  genders: readonly string[];
  /** 두 히어로의 전투 특화 (formationHeroTargetUnits) */
  targetUnits?: readonly string[];
  /** 장착 펫 속성별 수 (equippedPetCounts) */
  petCounts?: Record<string, number>;
}

/** 장착 펫이 가장 많은 속성이 아닌 지배자 특성 */
function offPetMaster(petCounts: Record<string, number> = {}): readonly string[] {
  const top = Math.max(0, ...Object.values(petCounts));
  return Object.entries(OPTIMIZER_RULES.PET_MASTERS)
    .filter(([attribute]) => !(top > 0 && (petCounts[attribute] ?? 0) === top))
    .flatMap(([, rNos]) => rNos);
}

/** 두 히어로의 전투 특화가 같으면 다른 특화의 공격력 얼티밋 (다르거나 한 명이면 빼지 않음) */
function offTargetUnit(units: readonly string[] = []): readonly string[] {
  if (units.length !== 2 || units[0] !== units[1]) return [];
  return Object.entries(OPTIMIZER_RULES.TARGET_UNIT_ATTACK)
    .filter(([unit]) => unit !== units[0])
    .flatMap(([, rNos]) => rNos);
}

/** 편성 짝 특성 중 편성에 맞지 않는 쪽 (두 명이 아니면 양쪽 다) */
function offFormation(kind: string, formationValues: readonly string[]): readonly string[] {
  const pair = OPTIMIZER_RULES.FORMATION_PAIRS[kind];
  if (formationValues.length !== 2) return [...pair.same, ...pair.different];
  return formationValues[0] === formationValues[1] ? pair.different : pair.same;
}

export function traitPolicyFor(target: DamageTarget, traits: MasteryTrait[] = [], formation?: Formation): TraitPolicy {
  const unit = TARGETS[target].UNIT;
  const otherDefense = Object.entries(OPTIMIZER_RULES.DEFENSE)
    .filter(([kind]) => kind !== unit)
    .flatMap(([, rNos]) => rNos);
  // 체력은 전부 빼고 계산한다: 체력을 올리는 얼티밋은 찍지 않는다
  const hpUltimates = traits
    .filter((trait) => trait.ultimate && HP_STAT.test(trait.statName))
    .map((trait) => trait.rNo);
  const ignored = new Set([
    ...OPTIMIZER_RULES.IGNORED,
    ...(OPTIMIZER_RULES.IGNORED_BY_UNIT[unit] ?? []),
    ...(target === 'pvp' ? [] : OPTIMIZER_RULES.IGNORED_OUTSIDE_PVP),
    ...otherDefense,
    ...Object.entries(OPTIMIZER_RULES.UNIT_DAMAGE)
      .filter(([kind]) => kind !== unit)
      .flatMap(([, rNos]) => rNos),
    ...(formation
      ? [
          ...offFormation('attribute', formation.attributes),
          ...offFormation('gender', formation.genders),
          ...offTargetUnit(formation.targetUnits),
          ...offPetMaster(formation.petCounts),
        ]
      : []),
    ...hpUltimates,
  ]);
  return {
    fixed: new Set(OPTIMIZER_RULES.FIXED),
    ignored,
    chanceFirst: new Set(OPTIMIZER_RULES.CHANCE_FIRST.filter((rNo) => !ignored.has(rNo))),
  };
}
