import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CardSetState } from '@/calc/sources/heroWeaponCardPet/card';
import CardSetCards from '@/calc/panels/heroWeaponCardPet/CardSetCards';
import { renderWithProviders } from '@/test/renderWithProviders';

const SET_STATES: CardSetState[] = [
  { setId: '3', markCount: 2, levelParts: [290, 290], tiers: [{ setCount: 2, stat: '_per_attackDamage', value: 293, reached: true, base: 20, perLevel: 0.3, level: 910 }] },
  { setId: '9', markCount: 4, levelParts: [290, 290], tiers: [{ setCount: 2, stat: '_per_hp', value: 293, reached: true, base: 20, perLevel: 0.3, level: 910 }] },
];

describe('카드 세트 칸 (CardSetCards)', () => {
  it('세트 이름 · 마크 수가 보인다', () => {
    renderWithProviders(<CardSetCards setStates={SET_STATES} descriptions={{}} />);
    expect(screen.getByText('폭풍')).toBeTruthy();
    expect(screen.getByText('마크 2개')).toBeTruthy();
  });

  it('마크가 없는 세트는 그리지 않는다', () => {
    renderWithProviders(<CardSetCards setStates={[{ setId: '3', markCount: 0, tiers: [], levelParts: [] }]} descriptions={{}} />);
    expect(screen.queryByText('폭풍')).toBeNull();
  });
});
