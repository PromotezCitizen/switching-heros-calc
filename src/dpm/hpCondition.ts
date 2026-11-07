/**
 * 대상 체력 조건 피해 (체력 70% 이상 / 30% 이하) 가 켜지는 적중 비율. 큰 수라 대미지 · 체력은 log10.
 * 조건 배수를 뺀 대미지로 깎이는 흐름을 한 번만 센다 (조건 배수가 깎이는 속도를 바꾸는 몫은 무시, 추정).
 * 몬스터 체력: 스테이지 = monHp (보스 × bossHp), 속성 던전 히어로 층 = Stage[dungeonVal1] monHp × bossHp × dungeonVal2
 * (hero-dungeon-monster.md), 각성 던전 = 무한 (늘 70% 이상)
 */
import { CONSTS } from '@/CONSTS';

const { HP_CONDITION } = CONSTS.dpm;

export interface MonsterHpData {
  stage: { count: number; monHp: number[]; bossHp: number[] };
  attributeDungeon: { count: number; stage: number[]; hpMultiplier: number[]; kind: number[] };
}

export interface HpFractions {
  /** 남은 체력 70% 이상에서 들어간 적중 비율 */
  high: number;
  /** 남은 체력 30% 이하에서 들어간 적중 비율 */
  low: number;
}

/** 스테이지 층 몬스터 체력 log10 (보스면 × bossHp). 층이 표 밖이면 null */
export function stageMonsterHpLog(data: MonsterHpData, floor: number, boss: boolean): number | null {
  if (!Number.isInteger(floor) || floor < 1 || floor > data.stage.count) return null;
  return data.stage.monHp[floor - 1] + (boss ? data.stage.bossHp[floor - 1] : 0);
}

/** 속성 던전 층 몬스터 체력 log10 (일반 층 = monHp × val2, 보스 · 히어로 층 = monHp × bossHp × val2). 표 밖이거나 층 종류가 다르면 null */
export function attributeFloorHpLog(data: MonsterHpData, floor: number, kind: number): number | null {
  const dungeon = data.attributeDungeon;
  if (!Number.isInteger(floor) || floor < 1 || floor > dungeon.count) return null;
  if (dungeon.kind[floor - 1] !== kind) return null;
  const stageHp = stageMonsterHpLog(data, dungeon.stage[floor - 1], kind !== HP_CONDITION.ATTRIBUTE_NORMAL_KIND);
  return stageHp === null ? null : stageHp + dungeon.hpMultiplier[floor - 1];
}

/** 속성 던전 히어로 층 체력 log10. 표 밖이거나 히어로 층이 아니면 null */
export function attributeHeroHpLog(data: MonsterHpData, floor: number): number | null {
  const dungeon = data.attributeDungeon;
  if (!Number.isInteger(floor) || floor < 1 || floor > dungeon.count) return null;
  if (dungeon.kind[floor - 1] !== HP_CONDITION.ATTRIBUTE_HERO_KIND) return null;
  const stageHp = stageMonsterHpLog(data, dungeon.stage[floor - 1], true);
  return stageHp === null ? null : stageHp + dungeon.hpMultiplier[floor - 1];
}

/**
 * 한 마리를 같은 대미지로 죽일 때 조건이 켜지는 적중 비율. r = 체력 / 한 대 대미지, 적중 k = ceil(r),
 * 적중 i 의 남은 비율 = 1 − (i − 1) / r. r 이 아주 크면 극한값 (0.3, 0.3)
 */
export function killFractions(hitLog: number, hpLog: number): HpFractions {
  const hitsPerKill = Math.pow(10, hpLog - hitLog);
  if (!(hitsPerKill > 1)) return { high: 1, low: 0 };
  const highShare = 1 - HP_CONDITION.HIGH_FROM;
  if (hitsPerKill >= HP_CONDITION.CONTINUOUS_FROM_HITS) return { high: highShare, low: HP_CONDITION.LOW_UNTIL };
  const hits = Math.ceil(hitsPerKill);
  const highCount = Math.min(hits, Math.floor(highShare * hitsPerKill) + 1);
  const lowFirst = Math.ceil((1 - HP_CONDITION.LOW_UNTIL) * hitsPerKill + 1);
  const lowCount = Math.max(0, hits - lowFirst + 1);
  return { high: highCount / hits, low: lowCount / hits };
}

export type HpPhase = 'high' | 'mid' | 'low' | 'dead';

/**
 * 시간 순서로 늘어놓은 적중 (대미지 log10) 마다 맞는 순간의 체력 구간. 체력이 0 이 되면 그 뒤는 'dead' (세지 않음).
 * 체력이 무한 (hpLog = Infinity) 이면 모두 'high'
 */
export function timelinePhases(hitLogs: number[], hpLog: number): HpPhase[] {
  let dealtShare = 0;
  return hitLogs.map((hitLog) => {
    if (dealtShare >= 1 - HP_CONDITION.BOUNDARY_EPSILON) return 'dead';
    const remaining = 1 - dealtShare;
    dealtShare += Math.pow(10, hitLog - hpLog);
    if (remaining >= HP_CONDITION.HIGH_FROM - HP_CONDITION.BOUNDARY_EPSILON) return 'high';
    if (remaining <= HP_CONDITION.LOW_UNTIL + HP_CONDITION.BOUNDARY_EPSILON) return 'low';
    return 'mid';
  });
}
