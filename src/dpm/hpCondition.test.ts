import { describe, expect, it } from 'vitest';
import monsterHp from '../../public/data/monsterHp.json';
import { attributeHeroHpLog, killFractions, stageMonsterHpLog, timelinePhases, type MonsterHpData } from '@/dpm/hpCondition';

const DATA = monsterHp as MonsterHpData;

describe('몬스터 체력 (log10)', () => {
  it('스테이지 1층 일반 100 (log 2), 보스 × 3', () => {
    expect(stageMonsterHpLog(DATA, 1, false)).toBeCloseTo(2, 5);
    expect(stageMonsterHpLog(DATA, 1, true)).toBeCloseTo(2 + Math.log10(3), 4);
  });
  it('7771층 일반 5.467e404 (damage-pipeline.md 4절)', () => {
    expect(stageMonsterHpLog(DATA, 7771, false)).toBeCloseTo(404 + Math.log10(5.467), 4);
  });
  it('표 밖 층은 null', () => {
    expect(stageMonsterHpLog(DATA, 0, false)).toBeNull();
    expect(stageMonsterHpLog(DATA, DATA.stage.count + 1, false)).toBeNull();
  });
  it('속성 던전: 히어로 층만 값 (Stage[dungeonVal1] monHp × bossHp × dungeonVal2), 다른 층은 null', () => {
    const heroFloor = DATA.attributeDungeon.kind.findIndex((kind) => kind === 3) + 1;
    const otherFloor = DATA.attributeDungeon.kind.findIndex((kind) => kind !== 3) + 1;
    const stage = DATA.attributeDungeon.stage[heroFloor - 1];
    const expected = DATA.stage.monHp[stage - 1] + DATA.stage.bossHp[stage - 1] + DATA.attributeDungeon.hpMultiplier[heroFloor - 1];
    expect(attributeHeroHpLog(DATA, heroFloor)).toBeCloseTo(expected, 8);
    expect(attributeHeroHpLog(DATA, otherFloor)).toBeNull();
  });
});

describe('한 마리 죽이는 동안 조건 비율', () => {
  it('한 대에 죽으면 70% 이상 1, 30% 이하 0', () => {
    expect(killFractions(10, 5)).toEqual({ high: 1, low: 0 });
  });
  it('10대 (r = 10): 70% 이상은 1·2·3·4번째 (남은 1, 0.9, 0.8, 0.7) → 0.4, 30% 이하는 8·9·10번째 (0.3, 0.2, 0.1) → 0.3', () => {
    expect(killFractions(0, 1)).toEqual({ high: 0.4, low: 0.3 });
  });
  it('아주 많이 때리면 극한 (0.3, 0.3)', () => {
    const fractions = killFractions(0, 20);
    expect(fractions.high).toBeCloseTo(0.3, 12);
    expect(fractions.low).toBeCloseTo(0.3, 12);
  });
});

describe('시간 순서 체력 구간', () => {
  it('체력 10 에 1씩 12대: 남은 1 · 0.9 · 0.8 · 0.7 high, 0.6 ~ 0.4 mid, 0.3 · 0.2 · 0.1 low, 그 뒤 dead', () => {
    const phases = timelinePhases(Array(12).fill(0), 1);
    expect(phases).toEqual(['high', 'high', 'high', 'high', 'mid', 'mid', 'mid', 'low', 'low', 'low', 'dead', 'dead']);
  });
  it('체력 무한이면 모두 high', () => {
    expect(timelinePhases([300, 300, 300], Infinity)).toEqual(['high', 'high', 'high']);
  });
});
