import { useCallback, useEffect, useRef, useState } from 'react';
import type { CardRecommendMessage, CardRecommendRequest } from '@/cardOptimizer/cardWorkerTypes';
import type { Loadout } from '@/cardOptimizer/loadout';
import type { LockedMarkGroup } from '@/cardOptimizer/lockedMarkGroups';
import type { CardRecommendProgress } from '@/cardOptimizer/recommendCards';

export type CardRecommendationState =
  | { status: 'idle' }
  | { status: 'running'; progress: CardRecommendProgress | null }
  | { status: 'done'; loadout: Loadout; baseEfficiency: number | null; efficiency: number; evaluations: number; lockedGroups?: LockedMarkGroup[] }
  | { status: 'failed'; message: string };

/** 카드 추천 계산을 작업자에서 돌린다 (useRecommendation 과 같은 방식) */
export function useCardRecommendation() {
  const [state, setState] = useState<CardRecommendationState>({ status: 'idle' });
  const workerRef = useRef<Worker | null>(null);
  const baseRef = useRef<number | null>(null);

  const terminate = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  const start = useCallback(
    (request: CardRecommendRequest) => {
      terminate();
      baseRef.current = null;
      setState({ status: 'running', progress: null });
      const worker = new Worker(new URL('./cardRecommend.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<CardRecommendMessage>) => {
        const message = event.data;
        if (message.type === 'base') {
          baseRef.current = message.efficiency;
        } else if (message.type === 'progress') {
          baseRef.current ??= message.progress.efficiency;
          setState({ status: 'running', progress: message.progress });
        } else if (message.type === 'done') {
          terminate();
          setState({ status: 'done', ...message.result });
        } else if (message.type === 'failed') {
          terminate();
          setState({ status: 'failed', message: message.message });
        }
        // groupDone · lockedDone 은 마크 작업자와 그 하위 작업자 사이에서만 오간다
      };
      worker.onerror = (event) => {
        terminate();
        setState({ status: 'failed', message: event.message });
      };
      worker.postMessage(request);
    },
    [terminate],
  );

  /** 멈추면 중간 결과는 버린다 (끝까지 돌지 않은 결과는 최선이 아니라서). 화면은 이전에 저장한 결과를 보여 준다 */
  const stop = useCallback(() => {
    terminate();
    setState({ status: 'idle' });
  }, [terminate]);

  /** 돌던 계산을 끝내고 지난 결과도 비운다 (새 계산을 시작할 때, 지난번 결과가 이번 결과처럼 보이지 않게) */
  const reset = useCallback(() => {
    terminate();
    baseRef.current = null;
    setState({ status: 'idle' });
  }, [terminate]);

  // 페이지를 떠나면 작업자를 끝낸다
  useEffect(() => terminate, [terminate]);

  return { state, start, stop, reset };
}
