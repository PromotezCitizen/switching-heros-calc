/**
 * 대상 상태이상 수 (무자비 · 굳센 정신 · 후벼파기 · 약점 사냥이 반응) 를 입력으로 받지 않고 계산한다 (사용자 결정 2026-11-01:
 * "시뮬레이션 돌려서 일반적으로 이정도면 이런 디버프가 걸리겠다 계산"). 스테이지 (일반몹) 는 3중첩 가정 (consts/dpm.ts STAGE_STATUS_COUNT).
 * 그 밖은 장착 스킬의 상태이상 옵션마다 시전 간격 T · 걸릴 확률 p · 지속시간 D 로 "대상에 걸려 있을 확률" 을 구한다:
 * 시전이 반복되면 임의 시점 직전 D 초 안의 시전 횟수는 floor(D / T) 또는 한 번 더 (소수부의 확률), 그중 한 번이라도 걸렸으면 걸려 있다 →
 * P = Σ_N P(N) × (1 − (1 − p)^N). 시뮬레이션을 무한 번 돌린 기댓값과 같은 식이다 (추천이 평가를 수천 번 해서 식으로 푼다).
 * 같은 종류가 여러 옵션에서 걸리면 합집합, 종류별 확률을 더해 반올림한 정수가 "일반적인" 상태이상 수다.
 * 추정: 시전 하나에 적 하나에 한 번 판정 (적중 수는 안 봄), 같은 종류가 다시 걸리면 갱신, 보스 · 히어로 몬스터도 걸린다 (면역 규칙 못 찾음)
 */
import { CONSTS } from '@/CONSTS';
import { exclusiveWeapons, ownedExclusiveStar } from '@/calc/sources/hero/roster';
import { rosterAwakenField } from '@/calc/sources/hero/rosterFields';
import { equippedExclusiveStar } from '@/calc/sources/heroWeaponCardPet/weapon';
import { isAilmentLeader, ownedPetRow, PET_LEADER_FIELD, petSlotField } from '@/calc/sources/heroWeaponCardPet/pet';
import { heroByName, rowsOf } from '@/calc/sources/heroWeaponCardPet/shared';
import { skillRuneValue } from '@/calc/sources/skill/skill';
import type { CalcValues } from '@/calc/types';
import type { StatTables, TableRow } from '@/data/statTables';

const { STATUS_OPTIONS, TYR_WEAPON, AEIKA_WEAPON, PET_LEADER_STATUS, SWAP, SWAP_SKILL_FREEZE, SWAP_ARROW_INTERVAL, DEVIL_WINK } = CONSTS.dpm;
const [, SECOND_HERO_FIELD] = SWAP.HERO_FIELDS;
const [, SECOND_EQUIPPED_FIELD] = SWAP.EQUIPPED_FIELDS;
const PERCENT = 100;

/** 상태이상을 거는 스킬 옵션 하나 (한 스킬의 시전 간격과 함께) */
export interface StatusSource {
  kind: string;
  /** 한 시전에 걸릴 확률 (0 ~ 1) */
  chance: number;
  durationSeconds: number;
  /** 그 스킬의 시전 간격 (게임초) */
  intervalSeconds: number;
}

/** 스킬 옵션 행 → 상태이상 출처. 상태이상을 안 거는 옵션이거나 값이 없으면 null */
export function statusSourceOf(option: TableRow, intervalSeconds: number): StatusSource | null {
  const spec = STATUS_OPTIONS[option.type];
  const value = skillRuneValue(option);
  if (!spec || !(value > 0) || !(intervalSeconds > 0)) return null;
  return {
    kind: spec.kind,
    chance: spec.chancePercent ? Math.min(value / PERCENT, 1) : 1,
    durationSeconds: spec.durationSeconds ?? value,
    intervalSeconds,
  };
}

/** 임의 시점에 대상에 이 출처의 상태이상이 걸려 있을 확률 (시전 간격 T, 확률 p, 지속시간 D) */
export function activeProbability(source: StatusSource): number {
  const casts = source.durationSeconds / source.intervalSeconds;
  const whole = Math.floor(casts);
  const fraction = casts - whole;
  const none = 1 - source.chance;
  return (1 - fraction) * (1 - Math.pow(none, whole)) + fraction * (1 - Math.pow(none, whole + 1));
}

/** 종류별로 걸려 있을 확률 (같은 종류 출처는 합집합) */
export function statusProbabilities(sources: StatusSource[]): Record<string, number> {
  const absent: Record<string, number> = {};
  for (const source of sources) absent[source.kind] = (absent[source.kind] ?? 1) * (1 - activeProbability(source));
  return Object.fromEntries(Object.entries(absent).map(([kind, none]) => [kind, 1 - none]));
}

/**
 * 피규어 데빌윙크 (consts DEVIL_WINK): 전용 스킬 적중마다 10% 로 6초. 한 시전에 대상 하나가 hitsPerTarget 번 맞으면
 * 그 시전에 걸릴 확률 = 1 − 0.9^hitsPerTarget. 데빌윙크 피규어가 없거나 전용 스킬이 없으면 null
 */
export function devilWinkSource(charSkillSeconds: number | null, hitsPerTarget: number, devilWinkValue: number): StatusSource | null {
  if (!(devilWinkValue > 0) || !charSkillSeconds || !(hitsPerTarget > 0)) return null;
  return {
    kind: DEVIL_WINK.KIND,
    chance: 1 - Math.pow(1 - DEVIL_WINK.HIT_CHANCE, hitsPerTarget),
    durationSeconds: DEVIL_WINK.SECONDS,
    intervalSeconds: charSkillSeconds,
  };
}

/**
 * 에이카 전용 무기 ★4 빙결: 1슬롯이 에이카 전용 무기를 장착하고 ★4 이상이면, 전용 스킬 (얼음 유성) 이 시전 간격마다
 * val1 % 확률로 val2 초 빙결을 건다. 전용 스킬이 없거나 표 행이 없으면 null
 */
export function weaponFreezeSource(values: CalcValues, tables: StatTables, charSkillSeconds: number | null): StatusSource | null {
  if (!charSkillSeconds || equippedExclusiveStar(values, tables, AEIKA_WEAPON.WEAPON_ID) < AEIKA_WEAPON.FREEZE_STAR) return null;
  const row = rowsOf(tables, 'WeaponTranscend').find((record) => record.weaponType === AEIKA_WEAPON.WEAPON_ID && record.statType === AEIKA_WEAPON.STAT_TYPE);
  if (!row) return null;
  return { kind: 'freeze', chance: Math.min(Number(row.val1) / PERCENT, 1), durationSeconds: Number(row.val2), intervalSeconds: charSkillSeconds };
}

/**
 * 리더 펫의 상태이상 효과 (Pet 표 leaderStatType): 평타 N회마다 (attack) 또는 스킬 N회 시전마다 (skill) 주위 적에게 D 초 상태이상.
 * 간격 = 평타 N회 × 평타 간격, 또는 스킬 N회 ÷ (장착 스킬 시전 횟수 합 / 초). 확정으로 건다. 리더가 상태이상 효과가 아니거나 슬롯이 없으면 null.
 * 카운터는 히어로마다 따로이고 등장할 때마다 0 (m2310 @33d00fc, status-effect-rules-2026-11-05.md 6.5): 자동 교체면 필드에 서는 S 초 안에
 * floor(S / 간격) 번만 걸리므로 평균 간격 = S / 그 수 (0 번이면 null)
 */
export function petLeaderStatusSource(
  values: CalcValues,
  tables: StatTables,
  normalAttackSeconds: number,
  skillSeconds: number[],
  swapSeconds: number | null = null,
): StatusSource | null {
  const petId = values[petSlotField(Number(values[PET_LEADER_FIELD]))] ?? '';
  const row = ownedPetRow(values, tables, petId);
  const match = row && isAilmentLeader(row.leaderStatType) ? PET_LEADER_STATUS.PATTERN.exec(row.leaderStatType) : null;
  const kind = match ? PET_LEADER_STATUS.KINDS[match[2]] : undefined;
  if (!row || !match || !kind) return null;
  const count = Number(row.leaderStatValue1);
  const durationSeconds = Number(row.leaderStatValue2);
  const castsPerSecond = skillSeconds.reduce((sum, seconds) => sum + (seconds > 0 ? 1 / seconds : 0), 0);
  let intervalSeconds = match[1] === 'attack' ? count * normalAttackSeconds : castsPerSecond > 0 ? count / castsPerSecond : 0;
  if (!(count > 0) || !(durationSeconds > 0) || !(intervalSeconds > 0)) return null;
  if (swapSeconds !== null && swapSeconds > 0) {
    const perStint = Math.floor(swapSeconds / intervalSeconds);
    if (perStint === 0) return null;
    intervalSeconds = swapSeconds / perStint;
  }
  return { kind, chance: 1, durationSeconds, intervalSeconds };
}

/** 2슬롯 히어로가 전용 무기 weaponId 를 장착했을 때 그 무기의 초월 ★ (다른 무기이거나 장착 안 했으면 0) */
function secondHeroWeaponStar(values: CalcValues, tables: StatTables, weaponId: string): number {
  const hero = heroByName(tables, values[SECOND_HERO_FIELD]);
  if (!hero || values[SECOND_EQUIPPED_FIELD] !== 'true') return 0;
  if (exclusiveWeapons(tables).find((weapon) => weapon.charId === hero.charId)?.weaponId !== weaponId) return 0;
  return Number(ownedExclusiveStar(values, tables, hero.charId)) || 0;
}

/** 전용 무기 초월 표 행의 수치 (없으면 null) */
function transcendValue(tables: StatTables, weaponId: string, statType: string, column: 'val1' | 'val2' | 'val3'): number | null {
  const row = rowsOf(tables, 'WeaponTranscend').find((record) => record.weaponType === weaponId && record.statType === statType);
  const value = Number(row?.[column]);
  return row && Number.isFinite(value) ? value : null;
}

export interface WeaponStatus {
  sources: StatusSource[];
  /** 늘 걸려 있는 종류 (확률 1) */
  alwaysKinds: string[];
  /** 걸려 있는 시간 비율을 따로 구한 종류 (0 ~ 1) */
  fractions: Record<string, number>;
}

/** 구간들의 합집합이 [from, to) 를 덮는 비율 */
function coverage(intervals: [number, number][], from: number, to: number): number {
  const clipped = intervals
    .map(([start, end]): [number, number] => [Math.max(start, from), Math.min(end, to)])
    .filter(([start, end]) => end > start)
    .sort((left, right) => left[0] - right[0]);
  let covered = 0;
  let reach = from;
  for (const [start, end] of clipped) {
    if (end <= reach) continue;
    covered += end - Math.max(start, reach);
    reach = end;
  }
  return to > from ? covered / (to - from) : 0;
}

/**
 * 티르 ★7: 티르가 필드에서 때릴 때 연장 출혈이 없으면 건다 (연장 출혈 ext 초, 빈혈은 건 시각 + after 초부터 dur 초). 교체 간격 S 면 2S 주기의 앞 S 초만 필드.
 * 공격 간격은 무시하고 (0.14초) 필드에 있는 동안 연장 출혈이 끝나는 순간 다시 건다고 본다
 */
function tyrSevenFractions(swapSeconds: number | null, ext: number, after: number, dur: number): { extendedBleed: number; anemia: number } {
  if (!(ext > 0)) return { extendedBleed: 0, anemia: 0 };
  const period = swapSeconds === null ? ext : swapSeconds * 2;
  const onField = (time: number) => swapSeconds === null || time % period < swapSeconds - 1e-9;
  const horizon = period * TYR_WEAPON.SIMULATE_PERIODS;
  const applies: number[] = [];
  let time = 0;
  while (time < horizon) {
    if (onField(time)) {
      applies.push(time);
      time += ext;
    } else {
      time = (Math.floor(time / period) + 1) * period;
    }
  }
  const from = period * TYR_WEAPON.SETTLE_PERIODS;
  return {
    extendedBleed: coverage(applies.map((at): [number, number] => [at, at + ext]), from, horizon),
    anemia: coverage(applies.map((at): [number, number] => [at + after, at + after + dur]), from, horizon),
  };
}

/**
 * 티르 전용 무기 (1030) 가 거는 상태이상. 별 = 1슬롯 장착 별과 (자동 교체를 켰으면) 2슬롯 티르 별 중 큰 값.
 * - ★7 이상 (status-effect-rules-2026-11-05.md 6.6, 앞 모델 "출혈 · 빈혈 늘" 정정): 출혈을 지우고 연장 출혈 (출혈 + 10초) 로 바꾸며,
 *   연장 출혈이 있는 동안은 다시 걸리지 않는다. 빈혈은 건 시각 + 10초부터 8초. 출혈 (0x4e27) 자체는 바뀌는 순간뿐이라 세지 않는다.
 *   셀 수 있는 종류 = 연장 출혈 · 빈혈 (+ ★4 흉터), 걸려 있는 비율은 tyrSevenFractions.
 * - ★4 이상: 흉터 10초를 교체 스킬 (발할라 게이트) 을 쓸 때 건다 → 교체할 때마다 (2S 주기) 10초. 교체를 안 쓰면 없다
 * - ★1 ~ ★6: 출혈은 티르가 필드에 있는 동안과 그 뒤 6초 (교체 간격마다 한 번)
 * 교체를 안 쓰면 (swapSeconds null) 1슬롯 티르가 늘 필드에 있다
 */
export function weaponStatus(values: CalcValues, tables: StatTables, swapSeconds: number | null): WeaponStatus {
  const firstStar = equippedExclusiveStar(values, tables, TYR_WEAPON.WEAPON_ID);
  const secondStar = swapSeconds === null ? 0 : secondHeroWeaponStar(values, tables, TYR_WEAPON.WEAPON_ID);
  const star = Math.max(firstStar, secondStar);
  if (star < TYR_WEAPON.BLEED_STAR) return { sources: [], alwaysKinds: [], fractions: {} };
  const bleedSeconds = transcendValue(tables, TYR_WEAPON.WEAPON_ID, TYR_WEAPON.BLEED_STAT_TYPE, 'val2') ?? TYR_WEAPON.DEFAULT_BLEED_SECONDS;
  const scar: Record<string, number> = {};
  if (star >= TYR_WEAPON.SCAR_STAR && swapSeconds !== null) {
    const scarSeconds = transcendValue(tables, TYR_WEAPON.WEAPON_ID, TYR_WEAPON.SCAR_STAT_TYPE, 'val2') ?? TYR_WEAPON.DEFAULT_SCAR_SECONDS;
    scar.scar = Math.min(scarSeconds / (swapSeconds * 2), 1);
  }
  if (star >= TYR_WEAPON.ANEMIA_STAR) {
    const extend = transcendValue(tables, TYR_WEAPON.WEAPON_ID, TYR_WEAPON.ANEMIA_STAT_TYPE, 'val1') ?? TYR_WEAPON.DEFAULT_EXTEND_SECONDS;
    const after = transcendValue(tables, TYR_WEAPON.WEAPON_ID, TYR_WEAPON.ANEMIA_STAT_TYPE, 'val2') ?? TYR_WEAPON.DEFAULT_ANEMIA_AFTER_SECONDS;
    const anemia = transcendValue(tables, TYR_WEAPON.WEAPON_ID, TYR_WEAPON.ANEMIA_STAT_TYPE, 'val3') ?? TYR_WEAPON.DEFAULT_ANEMIA_SECONDS;
    return { sources: [], alwaysKinds: [], fractions: { ...tyrSevenFractions(swapSeconds, bleedSeconds + extend, after, anemia), ...scar } };
  }
  if (swapSeconds === null) return { sources: [], alwaysKinds: ['bleed'], fractions: {} };
  return { sources: [{ kind: 'bleed', chance: 1, durationSeconds: swapSeconds + bleedSeconds, intervalSeconds: swapSeconds * 2 }], alwaysKinds: [], fractions: scar };
}

/** 이 히어로의 교체 스킬 번호: 각성 표 changeSkillId (레벨 이하 마지막 값), 없으면 Character 표 값 */
export function changeSkillIdOf(values: CalcValues, tables: StatTables, heroName: string | undefined): string | undefined {
  const hero = heroByName(tables, heroName);
  if (!hero) return undefined;
  const level = Number(values[rosterAwakenField(hero.charId)]) || 0;
  const awakened = rowsOf(tables, 'CharacterAwaken')
    .filter((row) => row.charId === hero.charId && Number(row.lv) <= level && row.changeSkillId)
    .sort((left, right) => Number(left.lv) - Number(right.lv))
    .at(-1)?.changeSkillId;
  return awakened || hero.changeSkillId || undefined;
}

/** 교체 스킬이 거는 빙결 지속 구간 (교체해 들어온 때부터, 게임초) 과 걸리는 총 길이: 화살형은 발사 시간 + 빙결, 각성형은 지속 + 빙결 */
export function swapSkillFreezeSpan(skillId: string | undefined): number | null {
  const spec = skillId ? SWAP_SKILL_FREEZE[skillId] : undefined;
  if (!spec) return null;
  return (spec.shots > 0 ? spec.shots * SWAP_ARROW_INTERVAL : spec.activeSeconds) + spec.freezeSeconds;
}

/**
 * 교체 스킬 빙결 출처 (자동 교체를 켰을 때만): 두 히어로 각각 교체해 들어올 때마다 빙결이 시작된다.
 * 한 히어로는 교체 두 번에 한 번 들어오므로 간격 = 2 × 교체 간격. 빙결이 없는 교체 스킬은 건너뛴다
 */
export function heroSwapFreezeSpan(values: CalcValues, tables: StatTables, heroName: string | undefined): number | null {
  return swapSkillFreezeSpan(changeSkillIdOf(values, tables, heroName));
}

export function swapSkillFreezeSources(values: CalcValues, tables: StatTables, swapSeconds: number | null): StatusSource[] {
  if (swapSeconds === null) return [];
  return SWAP.HERO_FIELDS.flatMap((field) => {
    const span = heroSwapFreezeSpan(values, tables, values[field]);
    return span === null ? [] : [{ kind: 'freeze', chance: 1, durationSeconds: span, intervalSeconds: swapSeconds * 2 }];
  });
}

/** "일반적인" 대상 상태이상 수: 종류별 걸려 있을 확률의 합을 반올림. alwaysKinds 는 늘 걸려 있는 종류 (확률 1) */
export function typicalStatusCount(sources: StatusSource[], alwaysKinds: string[] = [], fractions: Record<string, number> = {}): number {
  const probabilities = statusProbabilities(sources);
  // 따로 구한 비율: 같은 종류가 출처에도 있으면 합집합 (서로 독립으로 봄)
  for (const [kind, fraction] of Object.entries(fractions)) probabilities[kind] = 1 - (1 - (probabilities[kind] ?? 0)) * (1 - fraction);
  for (const kind of alwaysKinds) probabilities[kind] = 1;
  return Math.round(Object.values(probabilities).reduce((sum, probability) => sum + probability, 0));
}
