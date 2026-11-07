import { describe, expect, it } from 'vitest';
import type { Line } from '@/calc/combine';
import { cardStackLines } from '@/calc/sources/heroWeaponCardPet/card';

const label = (key: string, params?: Record<string, unknown>) => `${key}${params ? JSON.stringify(params) : ''}`;

describe('카드 전투 중 중첩 줄 (최대 상태)', () => {
  it('혈류 6세트 (버프 스킬 발동 시 3초간 버프 스킬 데미지, 최대 5중첩): 값 × 5 % 를 버프 스킬 데미지에', () => {
    const lines: Line[] = [{ source: '세트', stat: '_per_BuffDamage_BuffAttack', value: 336.3 }];
    const stack = cardStackLines(lines, label);
    expect(stack).toHaveLength(1);
    expect(stack[0].stat).toBe('_per_BuffSkillDamage');
    expect(stack[0].value).toBeCloseTo(336.3 * 5, 10);
  });

  it('값이 없으면 줄이 없다', () => {
    expect(cardStackLines([{ source: '세트', stat: '_per_attackDamage', value: 10 }], label)).toEqual([]);
  });
});

describe('카드 처치 중첩 (적 처치 시 N초간 공격력, 최대 5중첩): 일반 몬스터 대상에서만 쌓인다', () => {
  const kill: Line[] = [{ source: '카드', stat: '_per_attackDamage_Kill', value: 140 }];
  const useSkill: Line[] = [{ source: '카드', stat: 'attackDamage_useSkill', value: 160 }];

  it('일반 몬스터 (기본 대상) 는 5중첩: 값 140 → (1 + 1.4 - 1) × 5 = 7 → 700%', () => {
    expect(cardStackLines(kill, label)[0].value).toBeCloseTo(700, 9);
    expect(cardStackLines(kill, label, 'normal')[0].value).toBeCloseTo(700, 9);
  });

  it('보스 · 히어로 몬스터 대상은 한 마리를 잡으면 전투가 끝나서 쌓이지 않는다', () => {
    expect(cardStackLines(kill, label, 'boss')).toEqual([]);
    expect(cardStackLines(kill, label, 'hero')).toEqual([]);
  });

  it('스킬 사용 중첩은 대상과 상관없이 그대로 쌓인다', () => {
    const stacks = cardStackLines([...kill, ...useSkill], label, 'boss');
    expect(stacks).toHaveLength(1);
    expect(stacks[0].value).toBeCloseTo(160 * 5, 9);
  });
});
