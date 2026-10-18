import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCalcStore } from '@/store/useCalcStore';
import { renderWithProviders } from '@/test/renderWithProviders';
import { FlagField, GameNumberField, SelectField } from '@/components/StoreFields';

describe('공통 입력 칸', () => {
  beforeEach(() => {
    useCalcStore.getState().reset();
  });

  it('게임 큰 수 칸은 입력을 저장소에 넣는다', () => {
    renderWithProviders(<GameNumberField storeKey="calc.x" label="공격력" example="예: 5.14N%" />);
    fireEvent.change(screen.getByLabelText('공격력'), { target: { value: '5.14N%' } });
    expect(useCalcStore.getState().values['calc.x']).toBe('5.14N%');
    expect(screen.queryByText(/단위와 %까지 넣으세요/)).toBeNull();
  });

  it('읽을 수 없는 글이면 오류를 보여 준다', () => {
    renderWithProviders(<GameNumberField storeKey="calc.x" label="공격력" />);
    fireEvent.change(screen.getByLabelText('공격력'), { target: { value: 'abc' } });
    expect(screen.getByText(/단위와 %까지 넣으세요/)).toBeTruthy();
  });

  it('고르기 칸은 선택지가 모두 보이고, 값이 없으면 첫 항목이 골라져 있다', () => {
    renderWithProviders(
      <SelectField
        storeKey="calc.s"
        label="요리"
        options={[
          { value: '0', label: '없음' },
          { value: '25', label: '+25%' },
        ]}
      />,
    );
    expect((screen.getByLabelText('없음') as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByLabelText('+25%'));
    expect(useCalcStore.getState().values['calc.s']).toBe('25');
  });

  it('체크 칸은 true / false 글로 저장한다', () => {
    renderWithProviders(<FlagField storeKey="calc.f" label="광고" />);
    fireEvent.click(screen.getByLabelText('광고'));
    expect(useCalcStore.getState().values['calc.f']).toBe('true');
    fireEvent.click(screen.getByLabelText('광고'));
    expect(useCalcStore.getState().values['calc.f']).toBe('false');
  });
});
