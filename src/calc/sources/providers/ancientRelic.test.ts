import { describe, expect, it } from 'vitest';
import { combineLines } from '@/calc/combine';
import { ancientRelicLines, constellationNameKey } from '@/calc/sources/providers/ancientRelic';
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

  it('저장 → 진행 중 별자리 (번호 · 처음으로 안 켜진 단계 · 그 단계 칸 레벨), 예전 칸 (달성 번호 · 진행 글) 은 비움', () => {
    expect(values.ancientMastered).toBe('');
    expect(values.ancientCurrentConst).toBe('2');
    expect(values.ancientCurrentStep).toBe('3');
    expect([1, 2, 3, 4].map((idx) => values[`ancientStepLevel_${idx}`])).toEqual(['0', '0', '25', '19']);
    expect(values.ancientProgress).toBe('');
  });

  it('예전 진행 글만 있어도 같은 값 (새 칸이 비었을 때)', () => {
    const legacy: CalcValues = { ancientMastered: '1', ancientProgress: '2:1:1:1=25,2=25,3=25,4=25;2:2:1:1=25,2=25,3=25,4=25;2:3:0:1=0,2=0,3=25,4=19' };
    expect(screenPercent(legacy, '_per_Swordsman_AttackDamage')).toBeCloseTo(screenPercent(values, '_per_Swordsman_AttackDamage'), 6);
    expect(ancientRelicLines(legacy, tables, label).length).toBe(ancientRelicLines(values, tables, label).length);
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
    expect(ancientRelicValues({}).values).toEqual({ ancientMastered: '', ancientCurrentConst: '', ancientCurrentStep: '', ancientProgress: '' });
  });

  it('현재 단계 칸이 모두 최대면 그 단계 보너스 (칸 1000) 가 들어가고, 하나라도 모자라면 안 들어간다', () => {
    const base: CalcValues = { ancientCurrentConst: '2', ancientCurrentStep: '1', ancientStepLevel_1: '25', ancientStepLevel_2: '25', ancientStepLevel_3: '25' };
    const full = ancientRelicLines({ ...base, ancientStepLevel_4: '25' }, tables, label);
    const short = ancientRelicLines({ ...base, ancientStepLevel_4: '24' }, tables, label);
    expect(full.length).toBe(short.length + 1);
  });

  it('앞의 별자리는 모두 달성 (별자리 2 단계 1 칸 비움 = 별자리 1 전체만), 현재 단계 앞의 단계는 다 찬 상태', () => {
    const constOne = ancientRelicLines({ ancientCurrentConst: '2', ancientCurrentStep: '1' }, tables, label);
    expect(constOne.length).toBeGreaterThan(0);
    expect(constOne.every((line) => line.source.includes('"constellation":"1"'))).toBe(true);
    const stepTwo = ancientRelicLines({ ancientCurrentConst: '2', ancientCurrentStep: '2' }, tables, label);
    expect(stepTwo.length).toBe(constOne.length + 5);
  });

  it('탭 목록에 있고 쓰는 표가 AncientRelic · Relic (해금 판정)', () => {
    expect(providerTabs.find((tab) => tab.id === 'ancientRelic')!.tableNames).toEqual(['AncientRelic', 'Relic']);
  });
});

describe('별자리 이름 (단계 수 = 별 개수, 같은 단계 수 안에서 번호순)', () => {
  it('1 천칭 · 2 황소 · 3 사자 · 31 나침반 · 37 궁수 · 44 물고기, 45~88 은 1~44 반복', () => {
    expect(constellationNameKey(tables, '1')).toBe('8Star_1');
    expect(constellationNameKey(tables, '2')).toBe('8Star_2');
    expect(constellationNameKey(tables, '3')).toBe('9Star_1');
    expect(constellationNameKey(tables, '31')).toBe('8Star_7');
    expect(constellationNameKey(tables, '37')).toBe('12Star_9');
    expect(constellationNameKey(tables, '44')).toBe('12Star_12');
    expect(constellationNameKey(tables, '45')).toBe('8Star_1');
    expect(constellationNameKey(tables, '0')).toBeNull();
  });
});
