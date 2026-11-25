import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MasteryPanel from '@/calc/panels/MasteryPanel';
import { masteryLevelKey, masteryTraits } from '@/calc/sources/masteryRuneBuff/mastery';
import i18n from '@/i18n';
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

describe('특성 패널 앞 단계 조건', () => {
  it('앞 단계를 최대로 찍지 않은 특성은 올릴 수 없고, 첫 단계 특성은 올릴 수 있다', () => {
    const traits = masteryTraits(tables.Mastery);
    const first = traits.find((trait) => !trait.ultimate && trait.step === 1)!;
    const second = traits.find((trait) => !trait.ultimate && trait.group === first.group && trait.step === 2)!;
    const changes: [string, string][] = [];
    renderWithProviders(
      <MasteryPanel values={{}} setValue={(key, value) => changes.push([key, value])} tables={tables} descriptions={{}} />,
    );
    const nameOf = (rNo: string, fallback: string) => i18n.t(`calc.mastery.names.${rNo}`, { defaultValue: fallback });
    fireEvent.click(screen.getByRole('button', { name: i18n.t('calc.mastery.fillMax', { name: nameOf(second.rNo, second.statName) }) }));
    fireEvent.click(screen.getByRole('button', { name: i18n.t('calc.mastery.fillMax', { name: nameOf(first.rNo, first.statName) }) }));
    expect(changes).toEqual([
      [masteryLevelKey(second.rNo), '0'],
      [masteryLevelKey(first.rNo), String(first.maxLevel)],
    ]);
  });

  it('조건을 못 채운 채 찍혀 있으면 이름을 빨간 안내로 보인다', () => {
    const traits = masteryTraits(tables.Mastery);
    const second = traits.find((trait) => !trait.ultimate && trait.step === 2)!;
    renderWithProviders(
      <MasteryPanel values={{ [masteryLevelKey(second.rNo)]: '1' }} setValue={IGNORE_CHANGE} tables={tables} descriptions={{}} />,
    );
    expect(screen.getByText(/앞 단계 조건을 못 채운 특성/)).toBeTruthy();
  });
});
