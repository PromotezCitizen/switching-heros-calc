import { beforeEach, describe, expect, it } from 'vitest';
import { useCalcStore } from './useCalcStore';

describe('useCalcStore', () => {
  beforeEach(() => {
    useCalcStore.getState().reset();
  });

  it('입력값을 칸 이름으로 저장하고 초기화한다', () => {
    useCalcStore.getState().setValue('atkInc', '282.48CJ%');
    expect(useCalcStore.getState().values.atkInc).toBe('282.48CJ%');
    useCalcStore.getState().reset();
    expect(useCalcStore.getState().values).toEqual({});
  });

  it('여러 칸을 한 번에 저장하고 다른 칸은 그대로 둔다', () => {
    useCalcStore.getState().setValue('keep', '1');
    let updates = 0;
    const unsubscribe = useCalcStore.subscribe(() => {
      updates += 1;
    });
    useCalcStore.getState().setValues({ first: '2', second: '3' });
    unsubscribe();
    expect(updates).toBe(1);
    expect(useCalcStore.getState().values).toEqual({ keep: '1', first: '2', second: '3' });
  });
});
