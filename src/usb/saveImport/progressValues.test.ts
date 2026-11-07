import { describe, expect, it } from 'vitest';
import { soulForgeLines } from '@/calc/sources/heroWeaponCardPet/weapon';
import type { CalcValues } from '@/calc/types';
import { loadTestTables } from '@/test/loadTestTables';
import { coreMasteryValues, figureValues, soulForgeValues } from '@/usb/saveImport/progressValues';

const tables = loadTestTables();
const label = (key: string, params?: Record<string, unknown>) => `${key}${params ? JSON.stringify(params) : ''}`;

describe('저장 데이터 → 소울포지 · 코어 특성 · 피규어', () => {
  // 2026-10-31 저장 (Equip.soulForgeData): 레벨 1, 슬롯 2 (여성 히어로 공격력 20%) 하나를 얻음
  const equip = { soulForgeData: { lv: 1, slotDataDic: { k: [2], v: [{ isGet: 1 }] } } };

  it('소울포지: 레벨과 얻은 슬롯만 켜고, 표에 있는 나머지 슬롯은 끈다', () => {
    const { values, notes } = soulForgeValues(equip, tables);
    expect(notes).toEqual([]);
    expect(values.soulForgeLevel).toBe('1');
    expect(values.soulForgeSlot_2).toBe('true');
    expect(values.soulForgeSlot_1).toBe('false');
  });

  it('가져온 값으로 소울포지 줄이 나온다 (슬롯 2 = 여성 히어로 공격력)', () => {
    const lines = soulForgeLines(soulForgeValues(equip, tables).values as CalcValues, tables, label);
    expect(lines.map((line) => line.stat)).toEqual(['_per_Female_AttackDamage']);
  });

  it('저장에 소울포지가 없으면 (옛 저장) 아무 칸도 안 건드린다', () => {
    expect(soulForgeValues({}, tables)).toEqual({ values: {}, notes: [] });
  });

  it('코어 특성 레벨, 피규어 레벨 (번호 → 레벨, 없으면 빈 값)', () => {
    expect(coreMasteryValues({ coreMasteryLv: 7 }).values).toEqual({ coreMasteryLevel: '7' });
    expect(coreMasteryValues({}).values).toEqual({});
    expect(figureValues({ figureDic: { k: [1, 5], v: [2, { lv: 3 }] } }).values).toEqual({ figureLevel_1: '2', figureLevel_5: '3' });
    expect(figureValues({ figureDic: { k: [], v: [] } }).values).toEqual({});
  });
});
