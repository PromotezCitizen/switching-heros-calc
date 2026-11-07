import { describe, expect, it } from 'vitest';
import { calcValuesOf } from '@/calc/storeKeys';

/** 요정의 축복 (사용자 지시 2026-11-07 "광고 제거 샀으면 항상 켜지기, 안샀으면 선택해야만 켜기") */
describe('요정의 축복 켜짐', () => {
  it('광고 제거를 샀으면 축복 칸과 상관없이 켜짐', () => {
    expect(calcValuesOf({ 'account.adRemoved': 'true' }).fairyBlessingOn).toBe('true');
    expect(calcValuesOf({ 'account.adRemoved': 'true', 'account.fairyOn': 'false' }).fairyBlessingOn).toBe('true');
  });
  it('안 샀으면 직접 켰을 때만 켜짐 (처음 꺼짐)', () => {
    expect(calcValuesOf({}).fairyBlessingOn).toBe('false');
    expect(calcValuesOf({ 'account.adRemoved': 'false' }).fairyBlessingOn).toBe('false');
    expect(calcValuesOf({ 'account.fairyOn': 'true' }).fairyBlessingOn).toBe('true');
  });
});
