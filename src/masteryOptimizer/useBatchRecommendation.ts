import { useCallback, useEffect, useRef, useState } from 'react';
import type { StatTables } from '@/data/statTables';
import type { MonsterHpData } from '@/dpm/hpCondition';
import { startBatch, type BatchHandle, type BatchParts, type BatchProgress } from '@/masteryOptimizer/batchRecommend';
import { useCalcStore } from '@/store/useCalcStore';

/** 일괄 계산 (batchRecommend.ts) 을 화면에서 시작 · 멈춤. 결과는 끝나는 대상마다 저장소에 바로 들어간다 */
export function useBatchRecommendation() {
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const handleRef = useRef<BatchHandle | null>(null);
  const running = progress !== null && progress.phase !== 'done' && handleRef.current !== null;

  const start = useCallback((tables: StatTables, monsterHp: MonsterHpData | null, parts: BatchParts = 'all') => {
    handleRef.current?.stop();
    const handle = startBatch({
      storeValues: useCalcStore.getState().values,
      tables,
      monsterHp,
      parts,
      save: (key, value) => useCalcStore.getState().setValue(key, value),
      onProgress: setProgress,
    });
    handleRef.current = handle;
    void handle.done.then((final) => {
      if (handleRef.current === handle) handleRef.current = null;
      setProgress({ ...final });
    });
  }, []);

  const stop = useCallback(() => {
    handleRef.current?.stop();
    handleRef.current = null;
    setProgress(null);
  }, []);

  // 페이지를 떠나면 작업자를 끝낸다
  useEffect(() => () => handleRef.current?.stop(), []);

  return { progress, running, start, stop };
}
