import { useCallback, useEffect, useRef, useState } from 'react';
import type { Allocation } from '@/masteryOptimizer/rules';
import type { RecommendProgress } from '@/masteryOptimizer/recommend';
import type { RecommendMessage, RecommendRequest } from '@/masteryOptimizer/recommendWorkerTypes';

export type RecommendationState =
  | { status: 'idle' }
  | { status: 'running'; progress: RecommendProgress | null }
  | { status: 'done'; allocation: Allocation; baseEfficiency: number | null; efficiency: number; evaluations: number }
  | { status: 'failed'; message: string };

/**
 * 추천 계산을 작업자에서 돌린다. start 로 시작, stop 으로 멈추면 중간 결과는 버린다 (끝까지 돌지 않은 결과는 최선이 아니라서,
 * 사용자 결정 2026-11-01). 화면은 이전에 저장한 결과를 그대로 보여 준다
 */
export function useRecommendation() {
  const [state, setState] = useState<RecommendationState>({ status: 'idle' });
  const workerRef = useRef<Worker | null>(null);
  const baseRef = useRef<number | null>(null);

  const terminate = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  const start = useCallback(
    (request: RecommendRequest) => {
      terminate();
      baseRef.current = null;
      setState({ status: 'running', progress: null });
      const worker = new Worker(new URL('./recommend.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<RecommendMessage>) => {
        const message = event.data;
        if (message.type === 'base') {
          baseRef.current = message.efficiency;
        } else if (message.type === 'progress') {
          baseRef.current ??= message.progress.efficiency;
          setState({ status: 'running', progress: message.progress });
        } else if (message.type === 'done') {
          terminate();
          setState({ status: 'done', ...message.result, baseEfficiency: message.result.baseEfficiency });
        } else {
          terminate();
          setState({ status: 'failed', message: message.message });
        }
      };
      worker.onerror = (event) => {
        terminate();
        setState({ status: 'failed', message: event.message });
      };
      worker.postMessage(request);
    },
    [terminate],
  );

  const stop = useCallback(() => {
    terminate();
    setState({ status: 'idle' });
  }, [terminate]);

  // 페이지를 떠나면 작업자를 끝낸다
  useEffect(() => terminate, [terminate]);

  return { state, start, stop };
}
