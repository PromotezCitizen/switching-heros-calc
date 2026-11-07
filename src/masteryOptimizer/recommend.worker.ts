/** 추천 배분 계산 작업자: 오래 걸리는 계산을 화면과 따로 돌린다. 진행 상황을 메시지로 보내고, 끝나면 결과를 보낸다 */
import '@/masteryOptimizer/workerShim';
import '@/i18n';
import { masteryTraits } from '@/calc/sources/masteryRuneBuff/mastery';
import { valuesWithLoadout } from '@/cardOptimizer/loadout';
import { totalMasteryPoints } from '@/masteryOptimizer/budget';
import { comboFamilyOf } from '@/masteryOptimizer/comboFamily';
import { allocationFromValues, evaluateAllocation } from '@/masteryOptimizer/evaluate';
import { recommendAllocation } from '@/masteryOptimizer/recommend';
import type { RecommendMessage, RecommendRequest } from '@/masteryOptimizer/recommendWorkerTypes';
import { buildStartAllocation } from '@/masteryOptimizer/startAllocation';

/** 작업자 전역 (프로젝트 타입 설정에 작업자용 타입이 없어 필요한 부분만 적는다) */
interface WorkerScope {
  onmessage: ((event: MessageEvent<RecommendRequest>) => void) | null;
  postMessage: (message: RecommendMessage) => void;
}
const scope = self as unknown as WorkerScope;

scope.onmessage = (event) => {
  const { values, tables, inputs } = event.data;
  try {
    const traits = masteryTraits(tables.Mastery);
    // 몬스터 카드는 비운 상태로 계산한다 (카드와 특성은 따로 추천한다. 지금 끼고 있는 카드는 반영하지 않는다)
    const noCardValues = valuesWithLoadout(values, tables, []);
    const evaluate = (allocation: Record<string, number>) => evaluateAllocation(noCardValues, traits, tables, allocation, inputs.target, inputs.damage);
    const totalPoints = totalMasteryPoints(tables, inputs.userLevel, inputs.vipLevel);
    // 지금 프리셋은 비교 기준으로만 쓴다. 추천은 아무것도 없는 상태에서 시작한다
    const baseEfficiency = evaluate(allocationFromValues(noCardValues, traits));
    scope.postMessage({ type: 'base', efficiency: baseEfficiency });
    const start = buildStartAllocation(traits, {
      evaluate,
      userLevel: inputs.userLevel,
      totalPoints,
      onProgress: (progress) => scope.postMessage({ type: 'progress', progress: { block: 0, pass: 0, ...progress } }),
    });
    const result = recommendAllocation(traits, start.allocation, {
      evaluate,
      userLevel: inputs.userLevel,
      totalPoints,
      baseEfficiency,
      evaluationsBefore: start.evaluations,
      comboFamily: comboFamilyOf,
      onProgress: (progress) => scope.postMessage({ type: 'progress', progress }),
    });
    scope.postMessage({ type: 'done', result });
  } catch (error) {
    scope.postMessage({ type: 'failed', message: String(error) });
  }
};
