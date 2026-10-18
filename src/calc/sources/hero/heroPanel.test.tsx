import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import awakenTable from '../../../../public/data/tables/Awaken.json';
import characterTable from '../../../../public/data/tables/Character.json';
import type { RawTable, StatTables } from '@/data/statTables';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { CalcValues } from '@/calc/types';
import HeroPanel from '@/calc/sources/hero/HeroPanel';

const tables: StatTables = {
  Character: characterTable as RawTable,
  Awaken: awakenTable as RawTable,
};

function renderPanel(values: CalcValues) {
  const setValue = vi.fn();
  renderWithProviders(<HeroPanel values={values} setValue={setValue} tables={tables} descriptions={{}} />);
  return setValue;
}

describe('히어로 탭 화면', () => {
  it('빈 입력: 히어로 고르기 버튼 2개, 기본값 확인 표 없음 (등급·성·각성 입력은 히어로 표로 옮김)', () => {
    renderPanel({});
    expect(screen.getByLabelText('1슬롯 히어로 고르기')).toBeTruthy();
    expect(screen.getByLabelText('2슬롯 히어로 고르기')).toBeTruthy();
    expect(screen.queryByText('수치표 기본값')).toBeNull();
  });

  it('1슬롯 히어로 요약은 히어로 표 값 (등급·성·각성)', () => {
    renderPanel({ charName: '린', heroOwnedGrade_0: 'SSS', heroOwnedStar_0: '2', heroOwnedAwaken_0: '3' });
    expect(screen.getByText(/^1슬롯: 등급 SSS · 성 2 · 각성 3/)).toBeTruthy();
  });

  it('고른 히어로·기본값 확인 표', () => {
    renderPanel({ charName: '셰나', charName2: '루피아', charGrade: 'S', charStar: '2', atk: '735.70A', hp: '1.5A' });
    expect(screen.getAllByText('735.70A', { selector: 'td' }).length).toBe(2);
    expect(screen.getByText('11.04B')).toBeTruthy();
    expect(screen.getByText('같음')).toBeTruthy();
    expect(screen.getByText('다름')).toBeTruthy();
  });

  it('고르기 창: 속성·직업으로 걸러 고르면 이름만 넣는다 (등급·성은 히어로 표)', async () => {
    const setValue = renderPanel({ charName: '린', charGrade: 'SS', charStar: '1' });
    fireEvent.click(screen.getByLabelText('1슬롯 히어로 고르기'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByLabelText('땅 속성'));
    fireEvent.click(within(dialog).getByLabelText('격투가'));
    expect(within(dialog).queryByText('파이크')).toBeNull();
    fireEvent.click(within(dialog).getByText('레이'));
    expect(setValue).toHaveBeenCalledWith('charName', '레이');
    expect(setValue).toHaveBeenCalledTimes(1);
  });
});
