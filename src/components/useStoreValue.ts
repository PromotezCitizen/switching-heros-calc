import { useCalcStore } from '@/store/useCalcStore';

/** 저장소 칸 하나를 읽고 쓴다. 그 칸이 바뀔 때만 다시 그려진다 */
export function useStoreValue(storeKey: string): [string | undefined, (text: string) => void] {
  const text = useCalcStore((state) => state.values[storeKey]);
  const setValue = useCalcStore((state) => state.setValue);
  return [text, (next: string) => setValue(storeKey, next)];
}
