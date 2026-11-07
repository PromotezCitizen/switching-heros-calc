import { describe, expect, it } from 'vitest';
import { swapCycle } from '@/dpm/swapCycle';
import { loadTestTables } from '@/test/loadTestTables';

const tables = loadTestTables();

describe('스위칭 사이클 (게임 시간, 설정표 hero_swap_cool 18 · hero_swap_init_cool 75)', () => {
  it('게이지 최대 18, 시작 13.5 (75%), 첫 교체 4.5게임초', () => {
    const cycle = swapCycle(tables)!;
    expect(cycle.gaugeMax).toBe(18);
    expect(cycle.gaugeStart).toBe(13.5);
    expect(cycle.firstSeconds).toBe(4.5);
  });

  it('이후 간격: 교체마다 게이지가 0 으로 돌아가 처음부터 가득 채우므로 18게임초 (첫 교체만 시작값에서 출발해 4.5게임초)', () => {
    const cycle = swapCycle(tables)!;
    expect(cycle.fullSeconds).toBe(18);
    expect(cycle.fullSeconds).toBeGreaterThan(cycle.firstSeconds);
    expect('restartSeconds' in cycle).toBe(false);
  });

  it('충전 속도 30% 면 게이지가 1.3배 빨리 찬다', () => {
    const cycle = swapCycle(tables, 30)!;
    expect(cycle.firstSeconds).toBeCloseTo(4.5 / 1.3, 10);
    expect(cycle.fullSeconds).toBeCloseTo(18 / 1.3, 10);
  });

  it('설정표가 없으면 null', () => {
    expect(swapCycle({})).toBeNull();
  });
});
