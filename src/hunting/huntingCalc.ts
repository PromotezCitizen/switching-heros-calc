/**
 * 사냥 계산기 계산 함수 (화면과 분리). 기존 switching-heroes-calc.html 의 식을 그대로 옮김.
 * 값이 10^308 을 넘는 층이 있어 보상은 전부 log10 값으로 다룬다.
 */
import { CONSTS } from '../CONSTS';

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
 * 효과 패키지는 보상 배율 함수의 켜짐 블록 밖에서 읽혀 오프라인에도 들어간다 (hunting-always-bonus.md 2절 5번, 사용자 결정)
 */
export function offlineBonusPercent(inputs: HuntingInputs, resource: Resource): number {
  return (
    alwaysBonus(inputs, resource) +
    vipOnlineBonus(inputs.vipLevel, resource) +
    guildBonus(inputs, resource) +
    (inputs.packageOn[resource] ? onlineBonus.PACKAGE_PERCENT : 0)
  );
}

/** 오프라인 효율 = 초당 처치 수 × 광고 배수 */
export function offlineEfficiency(inputs: HuntingInputs): number {
  const vip = vipOfflineEffect(inputs.vipLevel);
  const packageOn = inputs.offlinePackageOn;
  const kills = offline.BASE_KILLS + (packageOn ? offline.PACKAGE.kills : 0);
  const timeSeconds = vip.timeSeconds - (packageOn ? offline.PACKAGE.timeSeconds : 0);
  const adMultiplier = inputs.adOn
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

export interface FloorScanRow {
  floor: number;
  /** 자원별 필요 분당 처치 수 */
  required: Record<Resource, number>;
}

/**
 * 시작층에서 끝층 쪽으로 step 간격으로 층별 필요 분당 처치 수를 구한다.
 * 끝층이 시작층보다 낮으면 아래로 내려가며 훑는다 (현재 층 위로는 못 가므로 보통 아래 방향)
 */
export function scanFloors(
  inputs: HuntingInputs,
  rewards: StageRewards,
  startFloor: number,
  endFloor: number,
  step: number,
): FloorScanRow[] {
  const safeStep = Math.max(Math.floor(step), 1);
  const first = clampFloor(rewards, startFloor);
  const last = clampFloor(rewards, endFloor);
  const direction = last >= first ? 1 : -1;
  const rows: FloorScanRow[] = [];
  for (let floor = first; direction === 1 ? floor <= last : floor >= last; floor += direction * safeStep) {
    rows.push({
      floor,
      required: {
        exp: requiredKillsPerMinute(inputs, rewards, floor, 'exp'),
        gold: requiredKillsPerMinute(inputs, rewards, floor, 'gold'),
        ess: requiredKillsPerMinute(inputs, rewards, floor, 'ess'),
      },
    });
  }
  return rows;
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
