import { describe, expect, it } from 'vitest';
import { coinPowerLines, coinPowerMaxLevel, tableValueLog } from '@/calc/sources/providers/coinPower';
import { combineLines } from '@/calc/combine';
import { providerTabs } from '@/calc/sources/providers/index';
import { loadTestTables } from '@/test/loadTestTables';

const tables = loadTestTables();
const label = (key: string, params?: Record<string, unknown>) => `${key}${params ? JSON.stringify(params) : ''}`;

describe('코인 파워 (5.81 새 제공자)', () => {
  it('표는 1 ~ 673레벨', () => {
    expect(coinPowerMaxLevel(tables)).toBe(673);
  });

  it('레벨이 비었거나 0 이면 줄 없음', () => {
    expect(coinPowerLines({}, tables, label)).toEqual([]);
    expect(coinPowerLines({ coinPowerLevel: '0' }, tables, label)).toEqual([]);
  });

  it('레벨 L 은 공격력 3.5^(L − 1)%, 체력 2^(L − 1)% 줄 하나씩', () => {
    const lines = coinPowerLines({ coinPowerLevel: '5' }, tables, label);
    expect(lines.map((line) => line.stat)).toEqual(['_per_attackDamage', '_per_hp']);
    expect(lines[0].log).toBeCloseTo(4 * Math.log10(3.5), 6);
    expect(lines[1].log).toBeCloseTo(4 * Math.log10(2), 6);
  });

  it('_per_ 스탯이라 × (1 + 값/100) 으로 곱해진다 (5레벨 공격력 ×2.5006)', () => {
    const combined = combineLines(coinPowerLines({ coinPowerLevel: '5' }, tables, label));
    expect(combined._per_attackDamage.log).toBeCloseTo(Math.log10(1 + 150.0625 / 100), 6);
  });

  it('1E+308 을 넘는 값도 log 로 읽는다 (673레벨 공격력 4.1089E+365%)', () => {
    expect(tableValueLog('4.10890219118287E+365')).toBeCloseTo(365 + Math.log10(4.10890219118287), 10);
    const [attack] = coinPowerLines({ coinPowerLevel: '673' }, tables, label);
    expect(Number.isFinite(attack.log)).toBe(true);
  });

  it('탭 목록에 있고 쓰는 표가 CoinPower', () => {
    expect(providerTabs.find((tab) => tab.id === 'coinPower')!.tableNames).toEqual(['CoinPower']);
  });
});
