/**
 * 사냥 계산기 계산 함수 (화면과 분리). 기존 switching-heroes-calc.html 의 식을 그대로 옮김.
 * 값이 10^308 을 넘는 층이 있어 보상은 전부 log10 값으로 다룬다.
 */
import { CONSTS } from '@/CONSTS';

export type Resource = 'exp' | 'gold' | 'ess';
export const RESOURCES: Resource[] = ['exp', 'gold', 'ess'];

/** 층별 1마리 기본 보상의 log10 값 (인덱스 0 = 1층). EXP 와 골드는 같은 값 */
export interface StageRewards {
  count: number;
  gold: number[];
  ess: number[];
}

const { PERCENT_DIVISOR, SECONDS_PER_MINUTE } = CONSTS.common;
const { offline, fairy, guild, onlineBonus } = CONSTS;

export interface HuntingInputs {
  vipLevel: number;
  fairyLevel: number;
  /** 광고 제거 구매: 요정의 축복이 경험치·골드 둘 다 영구 상시 켜짐 (hunting-always-bonus.md 4절) */
  adRemoved: boolean;
  /** 자원별 요정의 축복 켜짐 (광고 제거가 아닐 때 광고를 봐서 경험치·골드 칸을 따로 켬. 정수는 요정 값이 없음) */
  fairyOn: Record<Resource, boolean>;
  guildLevel: number;
  /** 자원별 길드 스킬 1~5 레벨 */
  guildSkillLevels: Record<Resource, number[]>;
  /** 자원별 요리 % (0 = 없음) */
  foodPercent: Record<Resource, number>;
  eventOn: Record<Resource, boolean>;
  packageOn: Record<Resource, boolean>;
  adOn: boolean;
  /** 오프라인 보상 증가 패키지 */
  offlinePackageOn: boolean;
  /** 오프라인 보상을 받는 층 */
  offlineFloor: number;
}

export function clampFloor(rewards: StageRewards, floor: number): number {
  return Math.min(Math.max(Math.floor(floor), 1), rewards.count);
}

/** 1마리 기본 보상 (보너스 전) */
export function baseRewardLog(rewards: StageRewards, floor: number): Record<Resource, number> {
  const index = clampFloor(rewards, floor) - 1;
  return { exp: rewards.gold[index], gold: rewards.gold[index], ess: rewards.ess[index] };
}

export function vipOfflineEffect(vipLevel: number): { timeSeconds: number; adPercent: number } {
  const timeDown = offline.VIP_TIME_DOWN.find((step) => vipLevel >= step.level);
  const adUp = offline.VIP_AD_UP.find((step) => vipLevel >= step.level);
  return {
    timeSeconds: offline.BASE_TIME_SECONDS - (timeDown?.seconds ?? 0),
    adPercent: adUp?.percent ?? 0,
  };
}

export function vipOnlineBonus(vipLevel: number, resource: Resource): number {
  const [firstLevel, firstValue, secondLevel, secondValue] = CONSTS.vipOnline[resource];
  return vipLevel >= secondLevel ? secondValue : vipLevel >= firstLevel ? firstValue : 0;
}

export function fairyBonus(fairyLevel: number): number {
  const level = Math.max(Math.floor(fairyLevel), 0);
  return level ? Math.min(fairy.MAX_PERCENT, fairy.BASE_PERCENT + fairy.PER_LEVEL_PERCENT * (level - 1)) : 0;
}

/**
 * 요정의 축복 보너스 % = 표 값 × 2 (경험치·골드만, 정수 0).
 * 게임 보상 배율 함수가 요정 값을 제공자 컨테이너와 최종 컨테이너에서 두 번 읽어 더한다 (hunting-always-bonus.md 결론).
 * 켜진 칸만 적용하고, 켜진 칸은 온라인·오프라인 모두 들어간다 (온라인 효율 계산기 floor-calc/calc.js bonusPercent 와 같은 규칙)
 */
function alwaysBonus(inputs: HuntingInputs, resource: Resource): number {
  if (resource === 'ess') return 0;
  const fairyOn = inputs.adRemoved || inputs.fairyOn[resource];
  return fairyOn ? fairyBonus(inputs.fairyLevel) * fairy.TIMES : 0;
}

export function guildBonus(inputs: HuntingInputs, resource: Resource): number {
  return guild.SKILLS.reduce(
    (sum, skill, index) =>
      inputs.guildLevel >= skill.unlock ? sum + skill.perLevel * (inputs.guildSkillLevels[resource][index] ?? 0) : sum,
    0,
  );
}

/** 직접 사냥 보너스 합 % (합연산): 상시 + VIP + 요리 + 이벤트 + 패키지 + 길드 스킬 */
export function onlineBonusPercent(inputs: HuntingInputs, resource: Resource): number {
  return (
    alwaysBonus(inputs, resource) +
    vipOnlineBonus(inputs.vipLevel, resource) +
    inputs.foodPercent[resource] +
    (inputs.eventOn[resource] ? onlineBonus.EVENT_PERCENT : 0) +
    (inputs.packageOn[resource] ? onlineBonus.PACKAGE_PERCENT : 0) +
    guildBonus(inputs, resource)
  );
}

/**
 * 오프라인 보너스 합 %: 상시 + VIP + 길드 스킬 + 상점 효과 패키지 (요리·이벤트는 온라인 전용).
 * 효과 패키지는 보상 배율 함수의 켜짐 블록 밖에서 읽혀 오프라인에도 들어간다 (hunting-always-bonus.md 2절 5번)
 */
export function offlineBonusPercent(inputs: HuntingInputs, resource: Resource): number {
  return (
    alwaysBonus(inputs, resource) +
    vipOnlineBonus(inputs.vipLevel, resource) +
    guildBonus(inputs, resource) +
    (inputs.packageOn[resource] ? onlineBonus.PACKAGE_PERCENT : 0)
  );
}

/** 오프라인 효율 = 초당 처치 수 × 광고 배수 (alwaysAd = 광고 칸과 상관없이 광고 배수를 넣음, 도시락용) */
export function offlineEfficiency(inputs: HuntingInputs, alwaysAd = false): number {
  const vip = vipOfflineEffect(inputs.vipLevel);
  const packageOn = inputs.offlinePackageOn;
  const kills = offline.BASE_KILLS + (packageOn ? offline.PACKAGE.kills : 0);
  const timeSeconds = vip.timeSeconds - (packageOn ? offline.PACKAGE.timeSeconds : 0);
  const adMultiplier = inputs.adOn || alwaysAd
    ? 1 + (offline.AD_BASE_PERCENT + vip.adPercent + (packageOn ? offline.PACKAGE.adPercent : 0)) / PERCENT_DIVISOR
    : 1;
  return (kills / timeSeconds) * adMultiplier;
}

/** 오프라인 1마리 보상 log10 + log10(오프라인 보너스 배수) */
function offlineRewardPerKillLog(inputs: HuntingInputs, rewards: StageRewards, resource: Resource): number {
  const multiplier = 1 + offlineBonusPercent(inputs, resource) / PERCENT_DIVISOR;
  return baseRewardLog(rewards, inputs.offlineFloor)[resource] + Math.log10(multiplier);
}

/**
 * 직접 사냥 층에서 오프라인(현재 층)보다 이득이 되려면 필요한 분당 처치 수.
 * 같은 시간 보상이 같아지는 처치 속도 (손익분기).
 */
export function requiredKillsPerMinute(
  inputs: HuntingInputs,
  rewards: StageRewards,
  onlineFloor: number,
  resource: Resource,
): number {
  const onlineMultiplier = 1 + onlineBonusPercent(inputs, resource) / PERCENT_DIVISOR;
  const onlineBaseLog = baseRewardLog(rewards, onlineFloor)[resource];
  const needKillsPerSecond =
    (offlineEfficiency(inputs) / onlineMultiplier) *
    Math.pow(10, offlineRewardPerKillLog(inputs, rewards, resource) - onlineBaseLog);
  return needKillsPerSecond * SECONDS_PER_MINUTE;
}

/** 목록에 넣는 층 종류: 현재 층, 벽 직후 (25n+1, 보상이 뛰는 층), 벽 (25n, 몬스터가 세지는 층), 벽 직전 (25n−1) */
export type FloorKind = 'current' | 'afterWall' | 'wall' | 'beforeWall';

export interface FloorScanRow {
  floor: number;
  kind: FloorKind;
  /** 자원별 필요 분당 처치 수 */
  required: Record<Resource, number>;
}

const { WALL_STEP, CUT_KILLS, MAX_ROWS, LUNCHBOX_MINUTES, MAX_SHOWN_DAYS, MAX_SHOWN_LUNCHBOXES, MINUTES_PER_HOUR, HOURS_PER_DAY } =
  CONSTS.hunting;

/**
 * 오프라인 층부터 아래로: 현재 층 (25n+1 이 아니면), 그리고 25층 구간마다 벽 직후 · 벽 · 벽 직전 (floor-calc 와 같은 목록)
 */
export function wallFloors(offlineFloor: number): { floor: number; kind: FloorKind }[] {
  const floors: { floor: number; kind: FloorKind }[] = [];
  if (offlineFloor % WALL_STEP !== 1) floors.push({ floor: offlineFloor, kind: 'current' });
  for (let wall = Math.floor(offlineFloor / WALL_STEP) * WALL_STEP; wall >= WALL_STEP; wall -= WALL_STEP) {
    if (wall + 1 <= offlineFloor) floors.push({ floor: wall + 1, kind: 'afterWall' });
    if (wall < offlineFloor) floors.push({ floor: wall, kind: 'wall' });
    floors.push({ floor: wall - 1, kind: 'beforeWall' });
  }
  return floors;
}

/**
 * 벽 목록 층마다 필요 분당 처치 수. 경험치 필요 수가 max(내 처치 수, CUT_KILLS) 를 넘는 층까지 넣고 끊는다 (그 아래는 오프라인이 낫다)
 */
export function floorRows(inputs: HuntingInputs, rewards: StageRewards, myKills: number): { rows: FloorScanRow[]; cut: boolean } {
  const rows: FloorScanRow[] = [];
  for (const { floor, kind } of wallFloors(inputs.offlineFloor)) {
    if (rows.length >= MAX_ROWS) break;
    const required = Object.fromEntries(
      RESOURCES.map((resource) => [resource, requiredKillsPerMinute(inputs, rewards, floor, resource)]),
    ) as Record<Resource, number>;
    rows.push({ floor, kind, required });
    if (required.exp > Math.max(myKills, CUT_KILLS)) return { rows, cut: true };
  }
  return { rows, cut: false };
}

/** 그 층에서 경험치를 1분에 모으는 양 (log10): 온라인 = 내 처치 수, 오프라인 = 오프라인 처치 수 (그 층에서 오프라인을 받는다고 볼 때) */
export function expPerMinuteLog(inputs: HuntingInputs, rewards: StageRewards, floor: number, myKills: number) {
  const reward = baseRewardLog(rewards, floor).exp;
  return {
    online: Math.log10(myKills) + reward + Math.log10(1 + onlineBonusPercent(inputs, 'exp') / PERCENT_DIVISOR),
    offline:
      Math.log10(offlineEfficiency(inputs) * SECONDS_PER_MINUTE) + reward + Math.log10(1 + offlineBonusPercent(inputs, 'exp') / PERCENT_DIVISOR),
  };
}

/**
 * 도시락 (먹으면 오프라인 보상을 그 시간만큼 바로 받음) 1분치 경험치 (log10). 먹은 층이 아니라 최고 층 기준이고 광고 배수가 항상 들어간다.
 * 최고 층은 오프라인 층으로 본다
 */
export function lunchboxExpPerMinuteLog(inputs: HuntingInputs, rewards: StageRewards): number {
  return (
    Math.log10(offlineEfficiency(inputs, true) * SECONDS_PER_MINUTE) +
    baseRewardLog(rewards, inputs.offlineFloor).exp +
    Math.log10(1 + offlineBonusPercent(inputs, 'exp') / PERCENT_DIVISOR)
  );
}

/** 목표까지 도시락 개수 (중급 1시간). 상한을 넘으면 over */
export function lunchboxCount(targetLog: number, inputs: HuntingInputs, rewards: StageRewards): { count: number; over: boolean } {
  const count = Math.ceil(Math.pow(10, targetLog - lunchboxExpPerMinuteLog(inputs, rewards)) / LUNCHBOX_MINUTES);
  return count > MAX_SHOWN_LUNCHBOXES ? { count: MAX_SHOWN_LUNCHBOXES, over: true } : { count, over: false };
}

/**
 * 걸리는 시간 나누기: 전체 분을 올림한 뒤 시간 · 분 (60분은 시간으로 넘어감), 하루 이상은 시간 (일), 999일 넘으면 over
 */
export type DurationParts =
  | { kind: 'over'; days: number }
  | { kind: 'unknown' }
  | { kind: 'minutes'; minutes: number }
  | { kind: 'hours'; hours: number; minutes: number }
  | { kind: 'days'; hours: number; days: number };

export function durationParts(minutes: number): DurationParts {
  if (minutes > MAX_SHOWN_DAYS * HOURS_PER_DAY * MINUTES_PER_HOUR) return { kind: 'over', days: MAX_SHOWN_DAYS };
  if (!Number.isFinite(minutes)) return { kind: 'unknown' };
  const totalMinutes = Math.max(1, Math.ceil(minutes));
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  if (hours === 0) return { kind: 'minutes', minutes: totalMinutes };
  if (hours >= HOURS_PER_DAY) {
    const roundedHours = Math.ceil(totalMinutes / MINUTES_PER_HOUR);
    return { kind: 'days', hours: roundedHours, days: roundedHours / HOURS_PER_DAY };
  }
  return { kind: 'hours', hours, minutes: totalMinutes % MINUTES_PER_HOUR };
}

const { LEVEL, PERCENT, OFFLINE_FLOOR } = CONSTS.emptyInput;

function perResource<T>(value: () => T): Record<Resource, T> {
  return { exp: value(), gold: value(), ess: value() };
}

export const EMPTY_INPUTS: HuntingInputs = {
  vipLevel: LEVEL,
  fairyLevel: LEVEL,
  adRemoved: false,
  fairyOn: perResource(() => false),
  guildLevel: LEVEL,
  guildSkillLevels: perResource(() => guild.SKILLS.map(() => LEVEL)),
  foodPercent: perResource(() => PERCENT),
  eventOn: perResource(() => false),
  packageOn: perResource(() => false),
  adOn: false,
  offlinePackageOn: false,
  offlineFloor: OFFLINE_FLOOR,
};
