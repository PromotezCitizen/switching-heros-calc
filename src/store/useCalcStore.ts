import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** 계산기 입력 칸 값 (칸 이름 → 입력한 글). 기존 HTML 의 data-key 입력 전체에 해당 */
type InputValues = Record<string, string>;

interface CalcState {
  values: InputValues;
  setValue: (key: string, value: string) => void;
  /** 여러 칸을 한 번에 저장 (칸마다 setValue 를 부르면 그때마다 전체 복사·저장·구독 확인이 일어남) */
  setValues: (changes: InputValues) => void;
  reset: () => void;
}

export const useCalcStore = create<CalcState>()(
  persist(
    (set) => ({
      values: {},
      setValue: (key, value) => set((state) => ({ values: { ...state.values, [key]: value } })),
      setValues: (changes) => set((state) => ({ values: { ...state.values, ...changes } })),
      reset: () => set({ values: {} }),
    }),
    { name: 'switching-heroes-calc-inputs' },
  ),
);
