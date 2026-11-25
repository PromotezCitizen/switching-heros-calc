/**
 * 대상 하나의 공격 한 번씩 대미지 (시간 · 쿨타임 · 시전 횟수는 보지 않는다).
 * 평타 1번 + 장착 직업 스킬 1번씩 + 전용 스킬 1번 + 교체 스킬 1번 (자동 교체를 켰을 때) 의 대미지와 그 합.
 * 한 적중 = 대상 기준 최종 공격력 × 공격 종류 추가 곱 × (스킬이면 한 발 계수 × 적중 수) × 치명 · 관통 · 무자비 기대 배수.
 * 조건 효과는 최대 상태로 둔다: 대상 상태이상 수는 OPTIMIZER_RULES, 체력이 늘 100% 인 대상은 체력 70% 이상 배수,
 * 스테이지 보스는 남은 시간 50% 이하 줄, 데빌윙크는 늘 걸림. 큰 수라 대미지는 모두 log10
 */
import { CONSTS } from '@/CONSTS';
import {
  SKILL_EQUIP_SLOT_NUMBERS,
  chosenSkillOptions,
  skillEquipField,
  skillLevel,
  skillRows,
  skillRuneValue,
} from '@/calc/sources/skill/skill';
import type { CalcValues } from '@/calc/types';
import type { StatTables, TableRow } from '@/data/statTables';
import { jobSkillHits } from '@/dpm/jobSkillHits';
import { kindModifiers, type AttackKind } from '@/dpm/attackKind';
import { attackStats, lineValueSum, type AttackStats } from '@/dpm/attackStats';
import { charSkillHits, heroOptionMultiplier } from '@/dpm/charSkillDamage';
import { changeSkillHits } from '@/dpm/changeSkillHits';
import { changeSkillRow } from '@/dpm/charSkillCycle';
import { rosterAwakenField } from '@/calc/sources/hero/rosterFields';
import { chanceOf, expectedSmite, expectedSpear, expectedSuperCritical } from '@/dpm/hitMultipliers';
import type { MonsterHpData } from '@/dpm/hpCondition';
import { skillCoefficient } from '@/dpm/skillCoefficient';

const {
  PERCENT_DIVISOR,
  TARGETS,
  BOSS_TIME_SHORT,
  UNCOUNTED_CONDITION_STATS,
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
  INFINITE_HP_TARGETS,
  OPTIMIZER_RULES,
} = CONSTS.dpm;

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
  /** 시전 · 공격 1번 대미지 (log10, 조건 배수 포함) */
  damagePerCastLog: number;
}

export interface TargetDamage {
  target: DamageTarget;
  /** 공격 한 번씩 대미지 합 (log10). 계산할 수 없으면 −Infinity */
  totalLog: number;
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
  const critical = expectedLog(
    chanceOf(modifiers.criticalRate),
    modifiers.criticalMultiplierLog + Math.log10(superCritical),
  );
  const spear = expectedSpear(read.sum(SPEAR.STATS.BASE) + read.sum(SPEAR.STATS.ADD), read.sum(SPEAR.STATS.DAMAGE));
  const smite = expectedSmite(
    read.sum(SMITE.STATS.BASE) + read.sum(SMITE.STATS.ADD),
    read.sum(SMITE.STATS.DAMAGE),
    read.sum(SMITE.STATS.CC),
    statusCount,
  );
  return (
    (stats.targetFinalAttackLog ?? -Infinity) +
    modifiers.extraAttackLog +
    critical +
    Math.log10(spear) +
    Math.log10(smite)
  );
}

/** 체력 70% 이상 배수 (log10): 묶음 A _per_hp70UpDamage × 그 스킬의 옵션 종류 10 */
function hpHighLog(stats: AttackStats, options: TableRow[]): number {
  const optionLog = options
    .filter((option) => option.type === HP_CONDITION.HIGH_OPTION_TYPE)
    .reduce((sum, option) => sum + Math.log10(1 + skillRuneValue(option) / PERCENT_DIVISOR), 0);
  return stats.read.log(HP_CONDITION.HIGH_STAT) + optionLog;
}

/** 대상 상태이상 수: 입력이 있으면 그 값, 없으면 OPTIMIZER_RULES (대상별 값이 있으면 그 값) */
function statusCountOf(target: DamageTarget, inputs: DamageInputs): number {
  return (
    inputs.targetStatusCount[target] ?? OPTIMIZER_RULES.STATUS_COUNT_BY_TARGET[target] ?? OPTIMIZER_RULES.STATUS_COUNT
  );
}

export function targetDamage(
  values: CalcValues,
  tables: StatTables,
  target: DamageTarget,
  inputs: DamageInputs,
): TargetDamage {
  const unit = TARGETS[target].UNIT;
  // 한 번에 맞는 적 수: 일반 묶음 대상 (스테이지 · 속성 일반 층 · 글로벌 일반 주) 은 입력 (글로벌은 5기라 최대 5), 보스 · 히어로는 1
  const maxTargets = CONSTS.dpm.MAX_TARGETS[target] ?? Infinity;
  const targets = unit === 'normal' ? Math.min(Math.max(inputs.targetsPerSkill, 1), maxTargets) : 1;
  // 카드 전투 조건 (주위 적 수 · 스테이지 보스전 …) 판정용: 대미지 대상과 스킬 한 번에 맞는 적 수
  const battleValues = { ...values, [DAMAGE_TARGET_FIELD]: target, [TARGETS_PER_SKILL_FIELD]: String(targets) };
  const stats = attackStats(battleValues, tables, unit);
  const missing: string[] = [];
  if (stats.targetFinalAttackLog === null) return { target, totalLog: -Infinity, parts: [], missing: ['noHero'] };

  const statusCount = statusCountOf(target, inputs);
  const fullHp = INFINITE_HP_TARGETS.includes(target) || OPTIMIZER_RULES.FULL_HP_EXTRA_TARGETS.includes(target);
  const charHits = charSkillHits(values, tables, targets, inputs.orbShardHits[target] ?? 0);
  // 피규어 데빌윙크 (전용 스킬 적중으로 거는 받는 피해 증가): 최대 상태라 늘 걸려 있다고 둔다
  const devilWinkLog = charHits.supported ? Math.log10(1 + stats.read.sum(DEVIL_WINK.STAT) / PERCENT_DIVISOR) : 0;
  // 스테이지 보스 남은 시간 50% 이하 줄: 최대 상태라 늘 붙는다
  const bossTimeLog = (isSkill: boolean) =>
    target === 'stageBoss'
      ? stats.read.log(BOSS_TIME_SHORT.ATTACK_STAT) + (isSkill ? stats.read.log(BOSS_TIME_SHORT.SKILL_STAT) : 0)
      : 0;
  const conditionLog = (isSkill: boolean, options: TableRow[]) =>
    devilWinkLog + bossTimeLog(isSkill) + (fullHp ? hpHighLog(stats, options) : 0);
  const parts: DamagePart[] = [];

  // 평타: 대상 1, 한 번 = 한 적중
  parts.push({ kind: 'normal', damagePerCastLog: kindHitLog(stats, 'normal', statusCount) + conditionLog(false, []) });

  // 직업 스킬 (장착 5칸)
  const rows = skillRows(tables);
  const equipped = [...new Set(SKILL_EQUIP_SLOT_NUMBERS.map((slot) => values[skillEquipField(slot)]).filter(Boolean))];
  for (const skillId of equipped) {
    const row = rows.find((candidate) => candidate.skillId === skillId);
    if (!row || skillLevel(values, skillId) <= 0) continue;
    const kind: AttackKind = row.skillType === BUFF_SKILL_TYPE ? 'buff' : 'active';
    const options = chosenSkillOptions(values, tables, skillId);
    if (options.some((option) => (BURN_OPTION_TYPES as readonly string[]).includes(option.type)))
      missing.push(`burnOption:${skillId}`);
    const hits = jobSkillHits(values, tables, skillId, targets, statusCount);
    if (!hits.supported) {
      missing.push(`unsupportedSkill:${skillId}`);
      continue;
    }
    missing.push(...(hits.estimates ?? []).map((estimate) => `${estimate}:${skillId}`));
    const coefficient = skillCoefficient(values, tables, {
      skillId,
      target: unit,
      targets,
      heroAttribute: stats.hero?.attribute,
    });
    const hitLog =
      kindHitLog(stats, kind, statusCount) + coefficient.coefficientLog + Math.log10(hits.coefficientFactor);
    parts.push({ kind, skillId, damagePerCastLog: hitLog + Math.log10(hits.hits) + conditionLog(true, options) });
  }

  // 전용 스킬
  if (charHits.supported) {
    missing.push(...(charHits.estimates ?? []).map((estimate) => `${estimate}:${charHits.skillId}`));
    const hitLog = kindHitLog(stats, 'char', statusCount) + charHits.coefficientLog;
    parts.push({
      kind: 'char',
      skillId: charHits.skillId ?? undefined,
      damagePerCastLog: hitLog + Math.log10(charHits.hits) + conditionLog(true, []),
    });
  } else if (charHits.skillId) {
    missing.push(`unsupportedCharSkill:${charHits.skillId}`);
  }

  // 교체 스킬 (공격 종류 3): 자동 교체를 켰을 때만
  if (inputs.swap === true && stats.hero) {
    const awakenLevel = Number(values[rosterAwakenField(stats.hero.charId)]) || 0;
    const swapRow = changeSkillRow(
      tables.CharacterAwaken,
      tables.ChangeSkill,
      stats.hero.charId,
      awakenLevel,
      stats.hero.changeSkillId,
    );
    const swapHits = changeSkillHits(swapRow, targets);
    if (swapRow && swapHits.supported && swapHits.hits > 0) {
      missing.push(...(swapHits.estimates ?? []).map((estimate) => `${estimate}:${swapRow.skillId}`));
      // 대미지 한 번 = 공격력 × damage / 100 × 영웅 옵션 곱 (전용 스킬과 같은 정보 만들기, damage-pipeline.md 3-4)
      const hitLog =
        kindHitLog(stats, 'swap', statusCount) +
        Math.log10((Number(swapRow.damage) || 0) / PERCENT_DIVISOR) +
        Math.log10(heroOptionMultiplier(values, tables));
      parts.push({
        kind: 'swap',
        skillId: swapRow.skillId,
        damagePerCastLog: hitLog + Math.log10(swapHits.hits) + conditionLog(true, []),
      });
    } else {
      missing.push(`${CHANGE_SKILL.UNSUPPORTED_CODE}:${swapRow?.skillId ?? stats.hero.changeSkillId ?? ''}`);
    }
  }

  const uncountedConditions = UNCOUNTED_CONDITION_STATS.filter((stat) =>
    stats.lines.some((line) => line.stat.toLowerCase() === stat.toLowerCase() && line.value),
  );
  if (uncountedConditions.length) missing.push(`conditionStatsNotCounted:${uncountedConditions.join(',')}`);
  return { target, totalLog: logSum(parts.map((part) => part.damagePerCastLog)), parts, missing };
}

export type { MonsterHpData };
