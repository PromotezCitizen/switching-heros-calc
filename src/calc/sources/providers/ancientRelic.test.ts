import { describe, expect, it } from 'vitest';
import { combineLines } from '@/calc/combine';
import { ancientRelicLines } from '@/calc/sources/providers/ancientRelic';
import { providerTabs } from '@/calc/sources/providers/index';
import type { CalcValues } from '@/calc/types';
import { loadTestTables } from '@/test/loadTestTables';
import { ancientRelicValues } from '@/usb/saveImport/ancientRelicValues';

const tables = loadTestTables();
const label = (key: string, params?: Record<string, unknown>) => `${key}${params ? JSON.stringify(params) : ''}`;

/** 2026-10-31 저장 (Dispatch.ancientRelicData): 별자리 1 달성, 별자리 2 진행 중 (1·2단계 완료, 3단계 칸 3 = 25 · 칸 4 = 19) */
const SAVED = {
  ancientRelicData: {
    _masteredList: [{ id: 1 }],
    _constellationList: [
      {
        id: 2,
        stepDic: {
          m_Keys: [1, 2, 3],
          m_Values: [
            { id: 1, isActive: 1, lvDic: { m_Keys: [1, 2, 3, 4], m_Values: [25, 25, 25, 25].map((lv, i) => ({ idx: i + 1, lv })) } },
            { id: 2, isActive: 1, lvDic: { m_Keys: [1, 2, 3, 4], m_Values: [25, 25, 25, 25].map((lv, i) => ({ idx: i + 1, lv })) } },
            { id: 3, isActive: 0, lvDic: { m_Keys: [1, 2, 3, 4], m_Values: [0, 0, 25, 19].map((lv, i) => ({ idx: i + 1, lv })) } },
          ],
        },
      },
    ],
  },
};

/** 화면의 % = (줄을 곱한 배율 − 1) × 100 */
function screenPercent(values: CalcValues, stat: string): number {
  const combined = combineLines(ancientRelicLines(values, tables, label));
  return (Math.pow(10, combined[stat].log) - 1) * 100;
}

describe('별자리 유물', () => {
  const values = ancientRelicValues(SAVED).values as CalcValues;

  it('저장 → 입력 글', () => {
    expect(values.ancientMastered).toBe('1');
    expect(values.ancientProgress).toBe('2:1:1:1=25,2=25,3=25,4=25;2:2:1:1=25,2=25,3=25,4=25;2:3:0:1=0,2=0,3=25,4=19');
  });

  it('게임의 별자리 효과 화면과 같은 값 (줄마다 곱한 값 − 1)', () => {
    const expected: Record<string, number> = {
      _per_Swordsman_AttackDamage: 3806.25,
      _per_attackDamage: 1500,
      _per_Swordsman_NormalMonsterDamage: 525,
      _per_NormalMonsterDamage: 300,
      _per_Swordsman_Hp: 2400,
      _per_Archer_Hp: 12400,
      _per_Mage_Hp: 10000,
      _per_hp: 2400,
      _per_Swordsman_BossMonsterDamage: 150,
    };
    for (const [stat, percent] of Object.entries(expected)) expect(screenPercent(values, stat), stat).toBeCloseTo(percent, 0);
  });

  it('입력이 비면 줄 없음, 5.70 이전 저장 (데이터 없음) 은 칸을 비운다', () => {
    expect(ancientRelicLines({}, tables, label)).toEqual([]);
    expect(ancientRelicValues({}).values).toEqual({ ancientMastered: '', ancientProgress: '' });
  });

  it('진행 중 별자리는 단계가 꺼져 있으면 단계 보너스 (칸 1000) 가 들어가지 않는다', () => {
    const on = ancientRelicLines({ ancientProgress: '2:1:1:1=25' }, tables, label);
    const off = ancientRelicLines({ ancientProgress: '2:1:0:1=25' }, tables, label);
    expect(on.length).toBe(off.length + 1);
  });

  it('탭 목록에 있고 쓰는 표가 AncientRelic', () => {
    expect(providerTabs.find((tab) => tab.id === 'ancientRelic')!.tableNames).toEqual(['AncientRelic']);
  });
});
