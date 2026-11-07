import { describe, expect, it } from 'vitest';
import vipTable from '../../public/data/tables/Vip.json';
import { gameSpeedMultiplier } from '@/dpm/gameSpeed';

describe('게임 속도 = 1 + VIP game_speed_up / 100 (T743 m4472 Time.timeScale)', () => {
  it('VIP 11 → 1.3', () => {
    expect(gameSpeedMultiplier(vipTable, 11)).toBeCloseTo(1.3, 10);
  });
  it('VIP 11 이상은 혜택 유지 (표에는 11 행에만 30) → VIP 12 · 22 도 1.3', () => {
    expect(gameSpeedMultiplier(vipTable, 12)).toBeCloseTo(1.3, 10);
    expect(gameSpeedMultiplier(vipTable, 22)).toBeCloseTo(1.3, 10);
  });
  it('VIP 0 · 10 → 1', () => {
    expect(gameSpeedMultiplier(vipTable, 0)).toBe(1);
    expect(gameSpeedMultiplier(vipTable, 10)).toBe(1);
  });
});
