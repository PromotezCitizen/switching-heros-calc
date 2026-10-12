import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 화면 상태 (보고 있는 하위 탭 등). 계산 입력값 저장소와 나눠 둔다:
 * 같은 저장소에 두면 탭만 바꿔도 입력값이 바뀐 것처럼 모든 콘텐츠가 다시 그려진다
 */
interface UiState {
  values: Record<string, string>;
  setValue: (key: string, value: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      values: {},
      setValue: (key, value) => set((state) => ({ values: { ...state.values, [key]: value } })),
    }),
    { name: 'switching-heroes-ui' },
  ),
);

/** 화면 상태 하나를 읽고 쓴다 */
export function useUiValue(key: string): [string | undefined, (text: string) => void] {
  const text = useUiStore((state) => state.values[key]);
  const setValue = useUiStore((state) => state.setValue);
  return [text, (next: string) => setValue(key, next)];
}
