import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCalcStore } from '../store/useCalcStore';
import { joinFieldValues, splitFieldValues, useTrackedCalcValues } from './useTrackedCalcValues';

describe('useTrackedCalcValues', () => {
  beforeEach(() => {
    useCalcStore.getState().reset();
  });

  it('읽은 칸이 바뀔 때만 다시 그리고, 돌려주는 객체는 늘 같다 (React 개발판이 props 안을 훑지 않게)', () => {
    useCalcStore.getState().setValues({ 'calc.read': '1', 'calc.other': '1' });
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      const values = useTrackedCalcValues();
      return { values, read: values.read };
    });
    const firstValues = result.current.values;
    expect(result.current.read).toBe('1');
    // 처음 그린 직후 읽은 칸이 생겨 한 번 더 그릴 수 있으므로 그 뒤부터 센다
    const rendersAfterMount = renders;

    act(() => useCalcStore.getState().setValue('calc.other', '2'));
    expect(renders).toBe(rendersAfterMount);

    act(() => useCalcStore.getState().setValue('calc.read', '2'));
    expect(renders).toBe(rendersAfterMount + 1);
    expect(result.current.read).toBe('2');
    expect(result.current.values).toBe(firstValues);
  });

  it('칸 이름 목록을 훑으면 모든 칸을 구독한다', () => {
    let renders = 0;
    renderHook(() => {
      renders += 1;
      return Object.keys(useTrackedCalcValues());
    });
    const rendersAfterMount = renders;
    act(() => useCalcStore.getState().setValue('calc.anything', '1'));
    expect(renders).toBe(rendersAfterMount + 1);
  });

  it('칸 값 묶기·풀기', () => {
    const fieldIds = ['first', 'missing', 'last'];
    const joined = joinFieldValues({ first: 'a', last: 'c' }, fieldIds);
    expect(splitFieldValues(joined, fieldIds)).toEqual({ first: 'a', missing: '', last: 'c' });
  });
});
