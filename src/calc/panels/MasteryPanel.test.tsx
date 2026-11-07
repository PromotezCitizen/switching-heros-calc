import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MasteryPanel from '@/calc/panels/MasteryPanel';
import { loadTestTables } from '@/test/loadTestTables';
import { renderWithProviders } from '@/test/renderWithProviders';

const tables = loadTestTables();
const IGNORE_CHANGE = (): void => undefined;

function renderPanel(readOnly?: boolean) {
  return renderWithProviders(<MasteryPanel values={{}} setValue={IGNORE_CHANGE} tables={tables} descriptions={{}} readOnly={readOnly} />);
}

describe('특성 패널 (MasteryPanel) 읽기 전용', () => {
  it('기본은 고칠 수 있다: 초기화 버튼과 레벨 입력 칸이 있다', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: '전체 초기화' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: '이 종류 초기화' }).length).toBeGreaterThan(0);
    const levelInputs = screen.getAllByRole('textbox').filter((input) => !(input as HTMLInputElement).readOnly);
    expect(levelInputs.length).toBeGreaterThan(0);
  });

  it('읽기 전용이면 초기화 버튼이 없고 레벨 입력 칸은 모두 읽기 전용이다', () => {
    renderPanel(true);
    expect(screen.queryByRole('button', { name: '전체 초기화' })).toBeNull();
    expect(screen.queryAllByRole('button', { name: '이 종류 초기화' })).toHaveLength(0);
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    expect(inputs.length).toBeGreaterThan(0);
    expect(inputs.every((input) => input.readOnly)).toBe(true);
  });

  it('읽기 전용이면 아이콘 · 최대 레벨 칸이 버튼이 아니다 (고칠 수 있을 때는 버튼이다)', () => {
    const editable = renderPanel();
    expect(screen.queryAllByRole('button', { name: /최대 레벨로 채우기|^최대$/ }).length).toBeGreaterThan(0);
    editable.unmount();
    renderPanel(true);
    expect(screen.queryAllByRole('button', { name: /최대 레벨로 채우기|^최대$/ })).toHaveLength(0);
  });
});
