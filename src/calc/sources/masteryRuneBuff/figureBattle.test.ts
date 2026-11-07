import { describe, expect, it } from 'vitest';
import type { Line } from '@/calc/combine';
import { figureBattleLines } from '@/calc/sources/masteryRuneBuff/battleEffects';
import { devilWinkSource, statusProbabilities } from '@/dpm/statusEffects';
import { CONSTS } from '@/CONSTS';
import { loadTestTables } from '@/test/loadTestTables';

const tables = loadTestTables();
const label = (key: string, params?: Record<string, unknown>) => `${key}${params ? JSON.stringify(params) : ''}`;
const { SWAP_UPTIME_FIELD, FIGURE_BATTLE } = CONSTS.masteryRuneBuff;
const figureLine = (stat: string, value: number): Line => ({ source: 'figure', stat, value });

describe('피규어 조건형 효과 (figure-special-effects-2026-11-07.md)', () => {
  it('확률 200% 초과: 그 확률이 200 을 넘을 때만 공격력 줄 (같으면 안 켜짐)', () => {
    const lines = [figureLine(FIGURE_BATTLE.OVER_STATS.smite, 500)];
    expect(figureBattleLines(lines, {}, tables, { smite: 200 }, false, label)).toEqual([]);
    const on = figureBattleLines(lines, {}, tables, { smite: 201 }, false, label);
    expect(on.map((line) => [line.stat, line.value])).toEqual([['_per_attackDamage', 500]]);
  });

  it('같은 효과 피규어가 둘이면 곱 ((1.5 × 1.2 − 1) × 100 = 80)', () => {
    const lines = [figureLine(FIGURE_BATTLE.OVER_STATS.doubleAttack, 50), figureLine(FIGURE_BATTLE.OVER_STATS.doubleAttack, 20)];
    expect(figureBattleLines(lines, {}, tables, { doubleAttack: 300 }, false, label)[0].value).toBeCloseTo(80, 10);
  });

  it('스위칭 부스트는 교체가 있어야, 매직 가드는 보호막이 있어야', () => {
    const swapLines = [figureLine(FIGURE_BATTLE.OVER_STATS.switchingBoost, 100)];
    expect(figureBattleLines(swapLines, {}, tables, { switchingBoost: 250 }, false, label)).toEqual([]);
    expect(figureBattleLines(swapLines, { [SWAP_UPTIME_FIELD]: '50' }, tables, { switchingBoost: 250 }, false, label)).toHaveLength(1);
    const barrierLines = [figureLine(FIGURE_BATTLE.OVER_STATS.barrier, 100)];
    expect(figureBattleLines(barrierLines, {}, tables, { barrier: 250 }, false, label)).toEqual([]);
    expect(figureBattleLines(barrierLines, {}, tables, { barrier: 250 }, true, label)).toHaveLength(1);
  });

  it('교체 등장 10초: 교체가 없으면 0, 있으면 켜짐 비율만큼', () => {
    const lines = [figureLine(FIGURE_BATTLE.CHANGE_SKILL_CAST_STAT, 300)];
    expect(figureBattleLines(lines, {}, tables, {}, false, label)).toEqual([]);
    const on = figureBattleLines(lines, { [SWAP_UPTIME_FIELD]: '100' }, tables, {}, false, label);
    expect(on).toHaveLength(1);
    expect(on[0].value).toBeGreaterThan(0);
    expect(on[0].value).toBeLessThanOrEqual(300);
  });

  it('기본 공격 (체력 100%) 은 상시 그 값, 사망 방어는 줄 없음 (죽을 일이 없으므로)', () => {
    const lines = [figureLine(FIGURE_BATTLE.NORMAL_ATTACK_UP_STAT, 5803.77), figureLine(FIGURE_BATTLE.DEATH_GUARD_STAT, 999)];
    expect(figureBattleLines(lines, {}, tables, {}, false, label).map((line) => [line.stat, line.value])).toEqual([['_per_attackDamage', 5803.77]]);
  });
});

describe('데빌윙크 (전용 스킬 적중 10% · 6초)', () => {
  it('피규어나 전용 스킬이 없으면 출처 없음', () => {
    expect(devilWinkSource(null, 10, 100)).toBeNull();
    expect(devilWinkSource(5, 10, 0)).toBeNull();
  });

  it('한 시전에 10번 맞으면 시전마다 1 − 0.9^10, 간격 3초면 6초 안 20번 → 걸려 있는 비율 1 − 0.9^20', () => {
    const source = devilWinkSource(3, 10, 100)!;
    expect(source.chance).toBeCloseTo(1 - Math.pow(0.9, 10), 10);
    expect(source.durationSeconds).toBe(6);
    expect(statusProbabilities([source]).devilWink).toBeCloseTo(1 - Math.pow(0.9, 20), 10);
  });

  it('간격이 6초보다 길면 (12초) 걸려 있는 비율은 시전 확률 × 6/12', () => {
    const source = devilWinkSource(12, 10, 100)!;
    expect(statusProbabilities([source]).devilWink).toBeCloseTo((1 - Math.pow(0.9, 10)) * 0.5, 10);
  });
});
