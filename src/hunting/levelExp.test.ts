import { describe, expect, it } from 'vitest';
import { expToTargetLog, levelExpLog } from '@/hunting/levelExp';

/** 기대값은 온라인 효율 계산기 floor-calc/calc.js 로 같은 레벨을 계산한 값 (옮긴 식이 같은지 대조) */
describe('레벨업 필요 경험치 (floor-calc 와 같은 값)', () => {
  it.each([
    [1, 4.301029995663981],
    [10, 3],
    [149, 3.9043330030031487],
    [1000, 7.201616509594025],
    [7799, 20.422103293821674],
    [7800, 20.618002946230906],
    [59999, 133.63455705485651],
    [60000, 133.83046035003096],
    [140500, 308.4204327150153],
    [300000, 654.347330015317],
    [315001, 686.9108896477334],
    [400000, 871.2728402198362],
  ])('레벨 %i', (level, expected) => {
    expect(levelExpLog(level)).toBeCloseTo(expected, 9);
  });
});

describe('목표 레벨까지 더 필요한 경험치', () => {
  it('floor-calc 와 같은 값', () => {
    expect(expToTargetLog(98000, 37.5, 100000)).toBeCloseTo(222.78250921054664, 9);
    expect(expToTargetLog(5, 0, 200)).toBeCloseTo(6.1865804516456935, 9);
    expect(expToTargetLog(300000, 50, 320000)).toBeCloseTo(699.954621605986, 9);
  });
  it('목표가 현재 이하면 null', () => {
    expect(expToTargetLog(10, 0, 5)).toBeNull();
    expect(expToTargetLog(0, 0, 5)).toBeNull();
  });
});
