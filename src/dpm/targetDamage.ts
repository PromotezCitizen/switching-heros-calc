/**
 * 대상 넷 (스테이지 · 스테이지 보스 · 각성 던전 · 속성 던전 히어로 층) 의 대미지 합계와 내역.
 * 스테이지 = 분당 대미지 (DPM), 나머지 = 정해진 시간 동안 시간 순서로 들어간 시전의 누적 대미지 (첫 시전은 전투 시작 직후).
 * 한 적중 = 대상 기준 최종 공격력 × 공격 종류 추가 곱 × (스킬이면 한 발 계수 × 적중 수) × 치명 · 관통 · 무자비 기대 배수 × 체력 조건 배수.
 * 계획: claude-docs/plans/2026-10-19-hit-damage.md 9절. 큰 수라 대미지는 모두 log10
 */
import { CONSTS } from '@/CONSTS';
import { ACCOUNT_KEYS } from '@/account/accountKeys';
import { rowsOf } from '@/calc/sources/heroWeaponCardPet/shared';
import { SKILL_EQUIP_SLOT_NUMBERS, chosenSkillOptions, skillEquipField, skillLevel, skillRows, skillRuneValue } from '@/calc/sources/skill/skill';
import type { SummaryTarget } from '@/calc/sources/summary/summary';
import type { CalcValues } from '@/calc/types';
import type { StatTables, TableRow } from '@/data/statTables';
import { activeSkillGameSeconds } from '@/dpm/activeSkillCycle';
import { jobSkillHits } from '@/dpm/jobSkillHits';
import { kindModifiers, type AttackKind } from '@/dpm/attackKind';
import { attackStats, lineValueSum, type AttackStats } from '@/dpm/attackStats';
import { charSkillHits, heroOptionMultiplier } from '@/dpm/charSkillDamage';
import { changeSkillHits } from '@/dpm/changeSkillHits';
import { changeSkillRow } from '@/dpm/charSkillCycle';
import { rosterAwakenField } from '@/calc/sources/hero/rosterFields';
import { chanceOf, expectedSmite, expectedSpear, expectedSuperCritical } from '@/dpm/hitMultipliers';
import { attributeFloorHpLog, killFractions, stageMonsterHpLog, timelinePhases, type HpPhase, type MonsterHpData } from '@/dpm/hpCondition';
import { skillCoefficient } from '@/dpm/skillCoefficient';
import { swapCycle } from '@/dpm/swapCycle';
import {
  devilWinkSource,
  petLeaderStatusSource,
  statusProbabilities,
  statusSourceOf,
  swapSkillFreezeSources,
  typicalStatusCount,
  weaponFreezeSource,
  weaponStatus,
} from '@/dpm/statusEffects';
import { dpmTiming } from '@/dpm/timing';

const {
  PERCENT_DIVISOR,
  TARGETS,
  OPTION_TABLE,
  BOSS_TIMER_KEY,
  AWAKEN_TIME_KEY,
  ATTRIBUTE_DUNGEON_SECONDS,
  SECONDS_PER_MINUTE,
  BOSS_TIME_SHORT,
  UNCOUNTED_CONDITION_STATS,
  STAGE_STATUS_COUNT,
  DAMAGE_TARGET_FIELD,
  TARGETS_PER_SKILL_FIELD,
  BURN_OPTION_TYPES,
  BUFF_SKILL_TYPE,
  SUPER_CRITICAL,
  SPEAR,
  SMITE,
  HP_CONDITION,
  CHANGE_SKILL,
  DEVIL_WINK,
} = CONSTS.dpm;
const { ACTIVE_SKILL_TYPE } = CONSTS.skill;
const { TARGET_FIELD } = CONSTS.summary;
/** 속성 던전 대상 → 층 종류 (dungeonVal3) */
const ATTRIBUTE_FLOOR_KINDS: Partial<Record<string, number>> = {
  attributeNormal: HP_CONDITION.ATTRIBUTE_NORMAL_KIND,
  attributeBoss: HP_CONDITION.ATTRIBUTE_BOSS_KIND,
  attributeHero: HP_CONDITION.ATTRIBUTE_HERO_KIND,
};

export type DamageTarget =
  | 'stage'
  | 'stageBoss'
  | 'awaken'
  | 'attributeHero'
  | 'nightmare'
  | 'pvp'
  | 'attributeNormal'
  | 'attributeBoss'
  | 'guildRaid'
  | 'globalRaidNormal'
  | 'globalRaidBoss'
  | 'globalRaidHero';
export const DAMAGE_TARGETS: DamageTarget[] = [
  'stage',
  'attributeNormal',
  'globalRaidNormal',
  'stageBoss',
  'awaken',
  'attributeBoss',
  'guildRaid',
  'globalRaidBoss',
  'attributeHero',
  'nightmare',
  'pvp',
  'globalRaidHero',
];

export interface DamageInputs {
  /** 스테이지에서 스킬 한 번에 맞는 적 수 (나머지 대상은 늘 1) */
  targetsPerSkill: number;
  /** 대상별 보주 파편이 맞는 수 (빈칸 = 0) */
  orbShardHits: Partial<Record<DamageTarget, number>>;
  /** 대상별 대상 상태이상 수 (빈칸 = 0, 무자비) */
  targetStatusCount: Partial<Record<DamageTarget, number>>;
  /** 스테이지 · 스테이지 보스 층 (빈칸이면 체력 조건 피해는 빠진 몫) */
  stageFloor: number | null;
  /** 속성 던전 층 (히어로 층만 체력이 나옴) */
  attributeDungeonFloor: number | null;
  /** public/data/monsterHp.json (없으면 체력 조건 피해는 빠진 몫) */
  monsterHp: MonsterHpData | null;
  /** 자동 교체: 1슬롯 · 2슬롯 히어로가 번갈아 필드에 선다고 보고 두 히어로의 평균을 낸다 (`targetDamageWithSwap`, 비어 있으면 1슬롯만) */
  swap?: boolean;
}

export interface DamagePart {
  kind: AttackKind;
  skillId?: string;
  /** 교체 계산에서 이 몫을 내는 히어로 이름 (1슬롯만 계산하면 비어 있음) */
  hero?: string;
  /** 실제 시간 1분에 시전 · 공격하는 횟수 */
  castsPerMinute: number;
  /** 시전 · 공격 1번 대미지 (log10, 체력 조건 배수 전) */
  damagePerCastLog: number;
  /** 분당 대미지 (log10, 스테이지는 체력 조건 배수 포함) */
  perMinuteLog: number;
}

export interface TargetDamage {
  target: DamageTarget;
  /** 분당 대미지 합 (log10). 계산할 수 없으면 -Infinity */
  perMinuteLog: number;
  /** 누적 시간 (실제 초). 스테이지는 null */
  windowSeconds: number | null;
  /** 시간 동안 누적 대미지 (log10). 스테이지는 null */
  windowTotalLog: number | null;
  parts: DamagePart[];
  /** 계산에 못 넣은 몫 (코드: 이유 + 대상 번호) */
  missing: string[];
}

/** log10(Σ 10^값) */
export function logSum(logs: number[]): number {
  const finite = logs.filter((log) => log > -Infinity);
  if (finite.length === 0) return -Infinity;
  const top = Math.max(...finite);
  return top + Math.log10(finite.reduce((sum, log) => sum + Math.pow(10, log - top), 0));
}

/** log10((1 − q) + q × 10^successLog): 확률 q 로 성공 배수가 붙는 기대값 */
function expectedLog(chance: number, successLog: number): number {
  if (chance <= 0) return 0;
  if (chance >= 1) return successLog;
  return logSum([Math.log10(1 - chance), Math.log10(chance) + successLog]);
}

/** 대상 칸 값을 바꾼 입력값 */
function withTarget(values: CalcValues, unit: SummaryTarget): CalcValues {
  return { ...values, [TARGET_FIELD]: unit };
}

/** 설정표 정수 값 (없으면 0) */
function optionInt(tables: StatTables, key: string): number {
  return Number(rowsOf(tables, OPTION_TABLE).find((row) => row.key === key)?.valueInt1) || 0;
}

/** 대상의 누적 시간 (실제 초). 스테이지 보스 = 제한 시간 + VIP 보스 전투 시간 (그 레벨 이하 행 합) */
export function fightSeconds(values: CalcValues, tables: StatTables, target: DamageTarget): number | null {
  if (target === 'stage') return null;
  if (target === 'awaken') return optionInt(tables, AWAKEN_TIME_KEY);
  if (target === 'attributeHero' || target === 'attributeNormal' || target === 'attributeBoss') return ATTRIBUTE_DUNGEON_SECONDS;
  if (target === 'guildRaid') return optionInt(tables, CONSTS.dpm.GUILD_RAID_TIME_KEY);
  if (target === 'globalRaidNormal' || target === 'globalRaidBoss' || target === 'globalRaidHero') return optionInt(tables, CONSTS.dpm.GLOBAL_RAID_TIME_KEY);
  if (target === 'nightmare') return optionInt(tables, CONSTS.dpm.NIGHTMARE_TIME_KEY);
  if (target === 'pvp') return optionInt(tables, CONSTS.dpm.PVP_TIME_KEY);
  const vipLevel = Number(values[ACCOUNT_KEYS.vipLevel]) || 0;
  const vipBonus = rowsOf(tables, 'Vip')
    .filter((row) => Number(row.lv) <= vipLevel)
    .reduce((sum, row) => sum + (Number(row.bossTimeUp) || 0), 0);
  return optionInt(tables, BOSS_TIMER_KEY) + vipBonus;
}

/** 공격 종류 하나의 한 적중 log (스킬 계수 · 적중 수 제외): 최종 공격력 × 종류 추가 곱 × 치명 · 관통 · 무자비 */
function kindHitLog(stats: AttackStats, kind: AttackKind, statusCount: number): number {
  const { read } = stats;
  const modifiers = kindModifiers(stats, kind);
  const superCritical = expectedSuperCritical(
    {
      base: read.sum(SUPER_CRITICAL.STATS.BASE),
      add: read.sum(SUPER_CRITICAL.STATS.ADD),
      over: read.sum(SUPER_CRITICAL.STATS.OVER),
      damage: lineValueSum(stats.lines, SUPER_CRITICAL.STATS.DAMAGE),
      supremeChance: read.sum(SUPER_CRITICAL.SUPREME.CHANCE),
      supremeDamage: lineValueSum(stats.lines, SUPER_CRITICAL.SUPREME.DAMAGE),
      supremeOverToDamage: read.sum(SUPER_CRITICAL.SUPREME.OVER_TO_DAMAGE),
    },
    modifiers.criticalRate,
  );
  const critical = expectedLog(chanceOf(modifiers.criticalRate), modifiers.criticalMultiplierLog + Math.log10(superCritical));
  const spear = expectedSpear(read.sum(SPEAR.STATS.BASE) + read.sum(SPEAR.STATS.ADD), read.sum(SPEAR.STATS.DAMAGE));
  const smite = expectedSmite(read.sum(SMITE.STATS.BASE) + read.sum(SMITE.STATS.ADD), read.sum(SMITE.STATS.DAMAGE), read.sum(SMITE.STATS.CC), statusCount);
  return (stats.targetFinalAttackLog ?? -Infinity) + modifiers.extraAttackLog + critical + Math.log10(spear) + Math.log10(smite);
}

/** 체력 70% 이상 / 30% 이하 배수 (log10): 묶음 A _per_hp70UpDamage / _per_hp30DownDamage × 그 스킬의 옵션 종류 10 / 11 */
function hpConditionLogs(stats: AttackStats, options: TableRow[]): { high: number; low: number } {
  const optionLog = (type: string) =>
    options.filter((option) => option.type === type).reduce((sum, option) => sum + Math.log10(1 + skillRuneValue(option) / PERCENT_DIVISOR), 0);
  return {
    high: stats.read.log(HP_CONDITION.HIGH_STAT) + optionLog(HP_CONDITION.HIGH_OPTION_TYPE),
    low: stats.read.log(HP_CONDITION.LOW_STAT) + optionLog(HP_CONDITION.LOW_OPTION_TYPE),
  };
}

interface PartPlan {
  part: DamagePart;
  /** 한 적중 log (체력 조건 판정용, 스테이지) */
  hitLog: number;
  /** 시전 · 공격 간격 (실제 초) 과 첫 시각 */
  intervalSeconds: number;
  firstSeconds: number;
  hpLogs: { high: number; low: number };
  isSkill: boolean;
}

export function targetDamage(values: CalcValues, tables: StatTables, target: DamageTarget, inputs: DamageInputs): TargetDamage {
  const unit = TARGETS[target].UNIT;
  const targetValues = withTarget(values, unit);
  // 한 번에 맞는 적 수: 일반 묶음 대상 (스테이지 · 속성 일반 층 · 글로벌 일반 주) 은 입력 (글로벌은 5기라 최대 5), 보스 · 히어로는 1
  const maxTargets = CONSTS.dpm.MAX_TARGETS[target] ?? Infinity;
  const targets = unit === 'normal' ? Math.min(Math.max(inputs.targetsPerSkill, 1), maxTargets) : 1;
  // 카드 전투 조건 (주위 적 수 · 스테이지 보스전 …) 판정용: 대미지 대상과 스킬 한 번에 맞는 적 수
  const battleValues = { ...values, [DAMAGE_TARGET_FIELD]: target, [TARGETS_PER_SKILL_FIELD]: String(targets) };
  const stats = attackStats(battleValues, tables, unit);
  const windowSeconds = fightSeconds(values, tables, target);
  const missing: string[] = [];
  if (stats.targetFinalAttackLog === null) {
    return { target, perMinuteLog: -Infinity, windowSeconds, windowTotalLog: windowSeconds === null ? null : -Infinity, parts: [], missing: ['noHero'] };
  }
  const timing = dpmTiming(targetValues, tables);
  // 직업 스킬 (장착 5칸) 과 시전 간격: 버프는 A 계획 주기, 액티브는 쿨타임 계산
  const rows = skillRows(tables);
  const equipped = [...new Set(SKILL_EQUIP_SLOT_NUMBERS.map((slot) => values[skillEquipField(slot)]).filter(Boolean))];
  const castSecondsOf = (skillId: string): number | null => {
    const row = rows.find((candidate) => candidate.skillId === skillId);
    if (!row) return null;
    return row.skillType === BUFF_SKILL_TYPE
      ? timing.buffSkills.find((skill) => skill.skillId === skillId)?.gameSeconds ?? null
      : row.skillType === ACTIVE_SKILL_TYPE
        ? activeSkillGameSeconds(values, tables, stats.read, skillId, unit)
        : null;
  };
  // 피규어 데빌윙크: 전용 스킬 적중으로 대상에 걸리는 받는 피해 증가 (consts DEVIL_WINK). 걸려 있는 비율 p 만큼 모든 공격에 ×(1 + p × 값/100)
  const charHits = charSkillHits(values, tables, targets, inputs.orbShardHits[target] ?? 0);
  const devilWinkValue = stats.read.sum(DEVIL_WINK.STAT);
  const devilWink = devilWinkSource(
    charHits.supported ? timing.charSkill?.gameSeconds ?? null : null,
    charHits.supported ? charHits.hits / targets : 0,
    devilWinkValue,
  );
  const devilWinkShare = devilWink ? statusProbabilities([devilWink])[DEVIL_WINK.KIND] ?? 0 : 0;
  const devilWinkLog = Math.log10(1 + (devilWinkShare * devilWinkValue) / PERCENT_DIVISOR);
  const hitLogOf = (kind: AttackKind, count: number) => kindHitLog(stats, kind, count) + devilWinkLog;
  // 대상 상태이상 수: 입력으로 정한 값이 없으면 계산 (스테이지 3중첩 가정 · 그 밖 장착 스킬 옵션이 시전 간격 · 확률 · 지속시간으로 걸려 있을 확률, statusEffects.ts)
  let statusCount = inputs.targetStatusCount[target] ?? STAGE_STATUS_COUNT;
  if (inputs.targetStatusCount[target] === undefined) {
    missing.push('statusCountEstimated');
    // 일반몹 대상은 3중첩 가정 (사용자 결정), 보스 · 히어로 대상만 계산
    if (TARGETS[target].UNIT !== 'normal') {
      const skillSeconds = equipped.flatMap((skillId) => (skillLevel(values, skillId) > 0 ? [castSecondsOf(skillId)] : [])).filter((seconds): seconds is number => seconds !== null);
      const sources = equipped.flatMap((skillId) => {
        const seconds = skillLevel(values, skillId) > 0 ? castSecondsOf(skillId) : null;
        if (seconds === null) return [];
        return chosenSkillOptions(values, tables, skillId).flatMap((option) => statusSourceOf(option, seconds) ?? []);
      });
      const freeze = weaponFreezeSource(values, tables, timing.charSkill?.gameSeconds ?? null);
      const swapSeconds = inputs.swap === true ? swapCycle(tables)?.fullSeconds ?? null : null;
      const petLeader = petLeaderStatusSource(values, tables, timing.normalAttackGameSeconds, skillSeconds, swapSeconds);
      const tyr = weaponStatus(values, tables, swapSeconds);
      statusCount = typicalStatusCount(
        [
          ...sources,
          ...(freeze ? [freeze] : []),
          ...(petLeader ? [petLeader] : []),
          ...tyr.sources,
          ...swapSkillFreezeSources(values, tables, swapSeconds),
          ...(devilWink ? [devilWink] : []),
        ],
        tyr.alwaysKinds,
        tyr.fractions,
      );
    }
  }
  const plans: PartPlan[] = [];
  // 시간은 모두 게임 시간 (쿨타임 · 지속 · 보스 제한 시간이 게임 시간 기준이라 배속은 곱하지 않는다)
  const toMinute = (seconds: number) => (seconds > 0 ? SECONDS_PER_MINUTE / seconds : 0);

  // 평타: 대상 1, 한 번 = 한 적중
  const normalSeconds = timing.normalAttackGameSeconds;
  const normalHit = hitLogOf('normal', statusCount);
  plans.push({
    part: { kind: 'normal', castsPerMinute: toMinute(normalSeconds), damagePerCastLog: normalHit, perMinuteLog: -Infinity },
    hitLog: normalHit,
    intervalSeconds: normalSeconds,
    firstSeconds: normalSeconds,
    hpLogs: hpConditionLogs(stats, []),
    isSkill: false,
  });

  // 직업 스킬 (장착 5칸)
  for (const skillId of equipped) {
    const row = rows.find((candidate) => candidate.skillId === skillId);
    if (!row || skillLevel(values, skillId) <= 0) continue;
    const isBuff = row.skillType === BUFF_SKILL_TYPE;
    const kind: AttackKind = isBuff ? 'buff' : 'active';
    const options = chosenSkillOptions(values, tables, skillId);
    if (options.some((option) => (BURN_OPTION_TYPES as readonly string[]).includes(option.type))) missing.push(`burnOption:${skillId}`);
    const hits = jobSkillHits(values, tables, skillId, targets);
    if (!hits.supported) {
      missing.push(`unsupportedSkill:${skillId}`);
      continue;
    }
    missing.push(...(hits.estimates ?? []).map((estimate) => `${estimate}:${skillId}`));
    const gameSeconds = castSecondsOf(skillId);
    if (gameSeconds === null) continue;
    const coefficient = skillCoefficient(values, tables, { skillId, target: unit, targets, heroAttribute: stats.hero?.attribute });
    const hitLog = hitLogOf(kind, statusCount) + coefficient.coefficientLog + Math.log10(hits.coefficientFactor);
    plans.push({
      part: { kind, skillId, castsPerMinute: toMinute(gameSeconds), damagePerCastLog: hitLog + Math.log10(hits.hits), perMinuteLog: -Infinity },
      hitLog,
      intervalSeconds: gameSeconds,
      firstSeconds: 0,
      hpLogs: hpConditionLogs(stats, options),
      isSkill: true,
    });
  }

  // 전용 스킬 (적중 수 charHits 는 위 데빌윙크에서 구함)
  if (timing.charSkill && charHits.supported) {
    missing.push(...(charHits.estimates ?? []).map((estimate) => `${estimate}:${charHits.skillId}`));
    const hitLog = hitLogOf('char', statusCount) + charHits.coefficientLog;
    plans.push({
      part: { kind: 'char', skillId: charHits.skillId ?? undefined, castsPerMinute: toMinute(timing.charSkill.gameSeconds), damagePerCastLog: hitLog + Math.log10(charHits.hits), perMinuteLog: -Infinity },
      hitLog,
      intervalSeconds: timing.charSkill.gameSeconds,
      firstSeconds: timing.charSkill.gameSeconds,
      hpLogs: hpConditionLogs(stats, []),
      isSkill: true,
    });
  } else if (charHits.skillId) {
    missing.push(`unsupportedCharSkill:${charHits.skillId}`);
  }

  // 교체 스킬 (공격 종류 3): 자동 교체를 켰을 때만, 교체로 들어올 때 1번 (필드에 서는 한 번 = 교체 간격마다 1번)
  const swapStintSeconds = inputs.swap === true ? swapCycle(tables)?.fullSeconds ?? null : null;
  if (swapStintSeconds && stats.hero) {
    const awakenLevel = Number(values[rosterAwakenField(stats.hero.charId)]) || 0;
    const swapRow = changeSkillRow(tables.CharacterAwaken, tables.ChangeSkill, stats.hero.charId, awakenLevel, stats.hero.changeSkillId);
    const swapHits = changeSkillHits(swapRow, targets);
    if (swapRow && swapHits.supported && swapHits.hits > 0) {
      missing.push(...(swapHits.estimates ?? []).map((estimate) => `${estimate}:${swapRow.skillId}`));
      // 대미지 한 번 = 공격력 × damage / 100 × 영웅 옵션 곱 (전용 스킬과 같은 정보 만들기, damage-pipeline.md 3-4)
      const hitLog = hitLogOf('swap', statusCount) + Math.log10((Number(swapRow.damage) || 0) / PERCENT_DIVISOR) + Math.log10(heroOptionMultiplier(values, tables));
      plans.push({
        part: { kind: 'swap', skillId: swapRow.skillId, castsPerMinute: toMinute(swapStintSeconds), damagePerCastLog: hitLog + Math.log10(swapHits.hits), perMinuteLog: -Infinity },
        hitLog,
        intervalSeconds: swapStintSeconds,
        firstSeconds: 0,
        hpLogs: hpConditionLogs(stats, []),
        isSkill: true,
      });
    } else {
      missing.push(`${CHANGE_SKILL.UNSUPPORTED_CODE}:${swapRow?.skillId ?? stats.hero.changeSkillId ?? ''}`);
    }
  }

  // 대상 체력 (log10): 각성 · 악몽 = 무한, PvP = 모름 (상대 스탯), 나머지 = 층 입력
  const hp = inputs.monsterHp;
  const hpLog =
    CONSTS.dpm.INFINITE_HP_TARGETS.includes(target)
      ? Infinity
      : target === 'pvp' || !hp
        ? null
        : target === 'attributeHero' || target === 'attributeNormal' || target === 'attributeBoss'
          ? inputs.attributeDungeonFloor === null
            ? null
            : attributeFloorHpLog(hp, inputs.attributeDungeonFloor, ATTRIBUTE_FLOOR_KINDS[target] ?? HP_CONDITION.ATTRIBUTE_HERO_KIND)
          : inputs.stageFloor === null
            ? null
            : stageMonsterHpLog(hp, inputs.stageFloor, target === 'stageBoss');
  const usesHpCondition = plans.some((plan) => plan.hpLogs.high !== 0 || plan.hpLogs.low !== 0);
  if (hpLog === null && usesHpCondition) missing.push(target === 'pvp' ? 'pvpOpponentHpUnknown' : 'hpConditionNoFloor');
  if (target === 'attributeHero' || target === 'attributeNormal' || target === 'attributeBoss') missing.push('attributeDungeonTableVersion');
  if (target === 'attributeNormal') missing.push('attributeNormalKillCapIgnored');
  if (target === 'guildRaid') missing.push('guildRaidLevelTimeIgnored');
  if (target === 'stageBoss' && stats.read.sum(BOSS_TIME_SHORT.CRITICAL_RATE_STAT) > 0) missing.push('bossTimeShortCriticalRate');
  const uncountedConditions = UNCOUNTED_CONDITION_STATS.filter((stat) =>
    stats.lines.some((line) => line.stat.toLowerCase() === stat.toLowerCase() && line.value),
  );
  if (uncountedConditions.length) missing.push(`conditionStatsNotCounted:${uncountedConditions.join(',')}`);

  for (const plan of plans) plan.part.perMinuteLog = plan.part.damagePerCastLog + Math.log10(plan.part.castsPerMinute);

  if (windowSeconds === null || target === 'attributeNormal') {
    // 스테이지 · 속성 일반 층 (여러 마리를 계속 잡는다): 한 마리를 죽이는 동안의 체력 조건 비율을 공격 종류마다
    for (const plan of plans) {
      if (hpLog === null) continue;
      const fractions = killFractions(plan.hitLog, hpLog);
      plan.part.perMinuteLog += logSum([
        Math.log10(Math.max(1 - fractions.high - fractions.low, 0)),
        Math.log10(fractions.high) + plan.hpLogs.high,
        Math.log10(fractions.low) + plan.hpLogs.low,
      ]);
    }
    const parts = plans.map((plan) => plan.part);
    const perMinuteLog = logSum(parts.map((part) => part.perMinuteLog));
    // 속성 일반 층: 분당 대미지 × 제한 시간 (80마리를 다 잡아 일찍 끝나는 것은 반영 안 함)
    const windowTotalLog = windowSeconds === null ? null : perMinuteLog + Math.log10(windowSeconds / SECONDS_PER_MINUTE);
    return { target, perMinuteLog, windowSeconds, windowTotalLog, parts, missing };
  }

  // 누적 대상: 시전을 시간 순서로 늘어놓고 체력이 깎이는 흐름에서 구간을 정한다
  const events: { seconds: number; plan: PartPlan }[] = [];
  for (const plan of plans) {
    if (!(plan.intervalSeconds > 0)) continue;
    for (let seconds = plan.firstSeconds; seconds < windowSeconds; seconds += plan.intervalSeconds) events.push({ seconds, plan });
  }
  events.sort((left, right) => left.seconds - right.seconds);
  const bossTimeShortFrom = windowSeconds * BOSS_TIME_SHORT.SHARE;
  const eventLogs = events.map(({ seconds, plan }) => {
    let log = plan.part.damagePerCastLog;
    if (target === 'stageBoss' && seconds >= bossTimeShortFrom) {
      log += stats.read.log(BOSS_TIME_SHORT.ATTACK_STAT) + (plan.isSkill ? stats.read.log(BOSS_TIME_SHORT.SKILL_STAT) : 0);
    }
    return log;
  });
  const phases: HpPhase[] = hpLog === null ? events.map(() => 'mid') : timelinePhases(eventLogs, hpLog);
  const dealtLogs = events.map(({ plan }, index) => {
    const phase = phases[index];
    if (phase === 'dead') return -Infinity;
    return eventLogs[index] + (phase === 'high' ? plan.hpLogs.high : phase === 'low' ? plan.hpLogs.low : 0);
  });
  const parts = plans.map((plan) => plan.part);
  return {
    target,
    perMinuteLog: logSum(parts.map((part) => part.perMinuteLog)),
    windowSeconds,
    windowTotalLog: logSum(dealtLogs),
    parts,
    missing,
  };
}

/** 대상 넷을 한 번에 */
export function allTargetDamages(values: CalcValues, tables: StatTables, inputs: DamageInputs): Record<DamageTarget, TargetDamage> {
  return Object.fromEntries(DAMAGE_TARGETS.map((target) => [target, targetDamage(values, tables, target, inputs)])) as Record<DamageTarget, TargetDamage>;
}
