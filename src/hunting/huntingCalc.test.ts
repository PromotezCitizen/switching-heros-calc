import { describe, expect, it } from 'vitest';
import {
  EMPTY_INPUTS,
  fairyBonus,
  offlineBonusPercent,
  offlineEfficiency,
  onlineBonusPercent,
  requiredKillsPerMinute,
  scanFloors,
  type HuntingInputs,
  type StageRewards,
} from './huntingCalc';

/** 1층 보상 10^1, 한 층 깊어질 때마다 ×10 (log10 이 1씩 증가) */
const REWARDS: StageRewards = {
  count: 5,
  gold: [1, 2, 3, 4, 5],
  ess: [0, 1, 2, 3, 4],
};

function withInputs(overrides: Partial<HuntingInputs>): HuntingInputs {
  return { ...EMPTY_INPUTS, ...overrides };
}

describe('오프라인 효율', () => {
  it('기본은 200마리 / 60초 (분당 200마리)', () => {
    expect(offlineEfficiency(EMPTY_INPUTS) * 60).toBeCloseTo(200);
  });
  it('광고를 켜면 ×1.2', () => {
    expect(offlineEfficiency(withInputs({ adOn: true })) * 60).toBeCloseTo(240);
  });
  it('VIP 17 은 전투 시간 −14초', () => {
    expect(offlineEfficiency(withInputs({ vipLevel: 17 })) * 60).toBeCloseTo((200 / 46) * 60);
  });
  it('패키지는 +20마리 −10초', () => {
    expect(offlineEfficiency(withInputs({ offlinePackageOn: true })) * 60).toBeCloseTo((220 / 50) * 60);
  });
});

describe('요정의 축복', () => {
  it('레벨 0 은 0, 레벨 1 은 25, 상한 50', () => {
    expect(fairyBonus(0)).toBe(0);
    expect(fairyBonus(1)).toBe(25);
    expect(fairyBonus(627)).toBeCloseTo(50);
    expect(fairyBonus(1000)).toBe(50);
  });
});

/** 게임 식: 요정 값이 제공자·최종 두 컨테이너에서 두 번 합산 (hunting-always-bonus.md). 요정 레벨 100 → 25 + 0.1 x 99 = 34.9% x 2 = 69.8% */
describe('요정의 축복 x2 와 켜짐', () => {
  it('요정 레벨 100 은 표 값 34.9% 의 두 배 69.8%', () => {
    const inputs = withInputs({ fairyLevel: 100, adRemoved: true });
    expect(onlineBonusPercent(inputs, 'exp')).toBeCloseTo(69.8);
    expect(onlineBonusPercent(inputs, 'gold')).toBeCloseTo(69.8);
  });
  it('요정 레벨 1 은 25% x 2 = 50% (예전 25 + 50 = 75 가 아님)', () => {
    expect(onlineBonusPercent(withInputs({ fairyLevel: 1, adRemoved: true }), 'exp')).toBeCloseTo(50);
  });
  it('정수는 요정 값이 없다', () => {
    expect(onlineBonusPercent(withInputs({ fairyLevel: 100, adRemoved: true }), 'ess')).toBe(0);
  });
  it('광고 제거가 아니면 켠 칸만 적용 (경험치만 켜면 골드는 0)', () => {
    const inputs = withInputs({ fairyLevel: 100, fairyOn: { exp: true, gold: false, ess: false } });
    expect(onlineBonusPercent(inputs, 'exp')).toBeCloseTo(69.8);
    expect(onlineBonusPercent(inputs, 'gold')).toBe(0);
  });
  it('모두 꺼져 있으면 0 (기본값 꺼짐)', () => {
    expect(onlineBonusPercent(withInputs({ fairyLevel: 100 }), 'exp')).toBe(0);
  });
  it('켜진 칸은 오프라인에도 적용', () => {
    const inputs = withInputs({ fairyLevel: 100, fairyOn: { exp: true, gold: false, ess: false } });
    expect(offlineBonusPercent(inputs, 'exp')).toBeCloseTo(69.8);
    expect(offlineBonusPercent(inputs, 'gold')).toBe(0);
  });
});

describe('상점 효과 패키지 오프라인 포함', () => {
  it('패키지를 켜면 오프라인 보너스에도 +100%', () => {
    const inputs = withInputs({ packageOn: { exp: false, gold: true, ess: false } });
    expect(offlineBonusPercent(inputs, 'gold')).toBe(100);
    expect(offlineBonusPercent(inputs, 'exp')).toBe(0);
    expect(onlineBonusPercent(inputs, 'gold')).toBe(100);
  });
  it('요리·이벤트는 온라인 전용 (오프라인에 안 들어감)', () => {
    const inputs = withInputs({
      foodPercent: { exp: 125, gold: 0, ess: 0 },
      eventOn: { exp: true, gold: false, ess: false },
    });
    expect(offlineBonusPercent(inputs, 'exp')).toBe(0);
    expect(onlineBonusPercent(inputs, 'exp')).toBe(225);
  });
});

describe('손익분기 분당 처치 수', () => {
  it('같은 층, 보너스 없음이면 오프라인 효율과 같다', () => {
    const inputs = withInputs({ offlineFloor: 3 });
    expect(requiredKillsPerMinute(inputs, REWARDS, 3, 'gold')).toBeCloseTo(200);
  });
  it('한 층 깊어지면 보상이 10배라 필요 처치 수가 1/10', () => {
    const inputs = withInputs({ offlineFloor: 3 });
    expect(requiredKillsPerMinute(inputs, REWARDS, 4, 'gold')).toBeCloseTo(20);
  });
  it('직접 사냥 보너스가 +100% 이면 필요 처치 수가 절반', () => {
    const inputs = withInputs({ offlineFloor: 3, eventOn: { exp: false, gold: true, ess: false } });
    expect(requiredKillsPerMinute(inputs, REWARDS, 3, 'gold')).toBeCloseTo(100);
  });
  it('층 범위를 훑으면 층마다 한 줄', () => {
    const rows = scanFloors(withInputs({ offlineFloor: 3 }), REWARDS, 1, 5, 2);
    expect(rows.map((row) => row.floor)).toEqual([1, 3, 5]);
    expect(rows[1].required.gold).toBeCloseTo(200);
  });
});
