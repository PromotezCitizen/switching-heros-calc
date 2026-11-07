/**
 * 카드 추천 계산 작업자: 오래 걸리는 계산을 화면과 따로 돌린다. 카드 고르기와 세트 마크 고르기는 따로 돌린다 (mode).
 * 마크 계산은 묶음마다 하위 작업자를 띄워 동시에 계산한다:
 *  1) 열린 묶음마다 세트 몰기 (markGroup) → 2) 합쳐서 하나씩 바꿔 보며 다듬기 (이 작업자) → 3) 안 열린 묶음마다 0 · 2 · 4 · 6장 (lockedGroup).
 * 묶음끼리 따로 계산하므로 순차 계산 (앞 묶음 결과를 반영) 과 결과가 조금 다를 수 있다. 다듬기 (2) 가 그 차이를 줄인다.
 * 하위 작업자를 못 쓰는 환경이면 예전처럼 한 작업자에서 차례로 계산한다. 동시에 도는 하위 작업자는 MAX_SUB_WORKERS 개까지
 */
import '@/masteryOptimizer/workerShim';
import '@/i18n';
import type { CardRecommendMessage, CardRecommendRequest } from '@/cardOptimizer/cardWorkerTypes';
import { loadoutFromValues, markCountOf, parseOwnedCards, valuesWithLoadout, type Loadout, type OwnedCard } from '@/cardOptimizer/loadout';
import { recommendCards } from '@/cardOptimizer/recommendCards';
import { ascendMarks, bestGroupLoadout, recommendMarks, startMarkLoadout } from '@/cardOptimizer/recommendMarks';
import { CARD_EXTRA_MARKS_FIELD, CARD_MARK_NUMBERS, CARD_SLOT_NUMBERS, setIdsForMark } from '@/calc/sources/heroWeaponCardPet/card';
import { scanLockedGroups, type LockedMarkGroup } from '@/cardOptimizer/lockedMarkGroups';
import { masteryTraits } from '@/calc/sources/masteryRuneBuff/mastery';
import { efficiencyLog, valuesWithAllocation } from '@/masteryOptimizer/evaluate';
import { targetDamageWithSwap } from '@/dpm/swapDamage';

/** 동시에 도는 하위 작업자 수 상한 (게임을 하면서 돌릴 수 있어 CPU 를 다 쓰지 않는다) */
const MAX_SUB_WORKERS = 3;

/** 작업자 전역 (프로젝트 타입 설정에 작업자용 타입이 없어 필요한 부분만 적는다) */
interface WorkerScope {
  onmessage: ((event: MessageEvent<CardRecommendRequest>) => void) | null;
  postMessage: (message: CardRecommendMessage) => void;
}
const scope = self as unknown as WorkerScope;

/** 하위 작업자 하나에 요청을 보내고 결과 메시지 하나를 받는다 */
function runSubWorker(request: CardRecommendRequest): Promise<CardRecommendMessage> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./cardRecommend.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<CardRecommendMessage>) => {
      const message = event.data;
      if (message.type === 'groupDone' || message.type === 'lockedDone') {
        worker.terminate();
        resolve(message);
      } else if (message.type === 'failed') {
        worker.terminate();
        reject(new Error(message.message));
      }
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message));
    };
    worker.postMessage(request);
  });
}

/** 일을 limit 개씩 동시에 돌린다 (순서대로 결과) */
async function runPool<Result>(tasks: (() => Promise<Result>)[], limit: number): Promise<Result[]> {
  const results: Result[] = new Array(tasks.length);
  let next = 0;
  const lanes = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (next < tasks.length) {
      const index = next;
      next += 1;
      results[index] = await tasks[index]();
    }
  });
  await Promise.all(lanes);
  return results;
}

scope.onmessage = async (event) => {
  const request = event.data;
  const { values: currentValues, tables, inputs, ownedText, mode, cardIds } = request;
  try {
    // 특성은 비운 상태로 계산한다 (카드와 특성은 따로 추천한다. 지금 찍은 특성은 반영하지 않는다)
    const values = valuesWithAllocation(currentValues, masteryTraits(tables.Mastery), {});
    const owned = parseOwnedCards(ownedText);
    const evaluate = (loadout: Loadout) => efficiencyLog(targetDamageWithSwap(valuesWithLoadout(values, tables, loadout), tables, inputs.target, inputs.damage));
    const markCount = (card: OwnedCard) => markCountOf(tables, card);
    const onProgress = (progress: Parameters<NonNullable<Parameters<typeof recommendCards>[1]['onProgress']>>[0]) =>
      scope.postMessage({ type: 'progress', progress });
    const current = loadoutFromValues(values, tables, owned);
    // 세트 마크는 "없는 것 포함": 카드가 열어 둔 세트 목록이 아니라 그 마크 번호의 모든 세트를 후보로 쓴다 (카드는 지금 가진 것만)
    const allSets = CARD_MARK_NUMBERS.map((mark) => setIdsForMark(tables, mark));
    const cards = (cardIds?.length ? cardIds.flatMap((cardId) => owned.filter((card) => card.cardId === cardId)) : current.map((entry) => entry.card)).map(
      (card) => ({ ...card, setsByMark: allSets }),
    );
    /** picks (카드마다 고른 세트) 를 넣은 편성 */
    const loadoutWith = (picks: string[][] | undefined): Loadout =>
      picks ? cards.map((card, index) => ({ card, picks: picks[index] ?? [] })) : startMarkLoadout(cards, markCount);
    /** 추천 편성에 안 열린 묶음 세트 개수를 더한 효율 (계산 전용 칸) */
    const lockedEvaluator = (loadout: Loadout) => {
      const recommendedValues = valuesWithLoadout(values, tables, loadout);
      return (extra: Record<string, number>) =>
        efficiencyLog(targetDamageWithSwap({ ...recommendedValues, [CARD_EXTRA_MARKS_FIELD]: JSON.stringify(extra) }, tables, inputs.target, inputs.damage));
    };

    if (mode === 'cards') {
      // 비교 기준: 지금 끼고 있는 편성 (카드 + 세트 마크, 특성은 비운 상태). 추천은 빈 6칸에서 시작한다
      const baseEfficiency = evaluate(current);
      scope.postMessage({ type: 'base', efficiency: baseEfficiency });
      // 고정 카드를 먼저 넣고 (보유한 것만, 칸 수까지) 나머지 칸만 찾는다
      const fixed: Loadout = (request.fixedCardIds ?? [])
        .flatMap((cardId) => owned.filter((card) => card.cardId === cardId).slice(0, 1))
        .slice(0, CARD_SLOT_NUMBERS.length)
        .map((card) => ({ card, picks: [] }));
      const result = recommendCards(fixed, { evaluate, baseEfficiency, markCount, owned, slots: CARD_SLOT_NUMBERS.length, withMarks: false, onProgress, fixedCount: fixed.length });
      scope.postMessage({ type: 'done', result });
      return;
    }
    if (mode === 'markGroup') {
      // 하위 작업자: 묶음 하나 (0부터) 의 세트 몰기
      const mark = request.mark ?? 0;
      const loadout = loadoutWith(request.picks);
      const group = bestGroupLoadout(loadout, mark, markCount, evaluate, evaluate(loadout));
      scope.postMessage({ type: 'groupDone', picks: group.loadout.map((entry) => entry.picks[mark] ?? ''), efficiency: group.efficiency });
      return;
    }
    if (mode === 'lockedGroup') {
      // 하위 작업자: 안 열린 묶음 하나 (1부터) 의 0 · 2 · 4 · 6장
      const mark = request.mark ?? 1;
      const [group] = scanLockedGroups([mark], (target) => setIdsForMark(tables, target), lockedEvaluator(loadoutWith(request.picks)));
      scope.postMessage({ type: 'lockedDone', group: group ?? null });
      return;
    }

    // marks: 비교 기준은 지금 끼고 있는 편성 (카드 + 세트 마크, 특성은 비운 상태)
    const baseEfficiency = evaluate(current);
    scope.postMessage({ type: 'base', efficiency: baseEfficiency });
    const lockedMarksOf = (loadout: Loadout) => CARD_MARK_NUMBERS.filter((mark) => !loadout.some((entry) => markCount(entry.card) >= mark));

    if (typeof Worker === 'undefined') {
      // 하위 작업자를 못 쓰는 환경: 예전처럼 차례로
      const result = recommendMarks(cards, { evaluate, baseEfficiency, markCount, onProgress });
      const lockedGroups = scanLockedGroups(lockedMarksOf(result.loadout), (mark) => setIdsForMark(tables, mark), lockedEvaluator(result.loadout));
      scope.postMessage({ type: 'done', result: { ...result, lockedGroups } });
      return;
    }

    // 1) 열린 묶음마다 하위 작업자로 세트 몰기 (같은 출발 편성에서)
    const subRequest = (extra: Partial<CardRecommendRequest>): CardRecommendRequest => ({
      values: currentValues,
      tables,
      inputs,
      ownedText,
      mode: 'markGroup',
      cardIds: cards.map((card) => card.cardId),
      ...extra,
    });
    let loadout = startMarkLoadout(cards, markCount);
    const startPicks = loadout.map((entry) => entry.picks);
    const marks = Math.max(0, ...cards.map(markCount));
    let evaluations = 0;
    const groupResults = await runPool(
      Array.from({ length: marks }, (_, mark) => () => runSubWorker(subRequest({ mode: 'markGroup', mark, picks: startPicks }))),
      MAX_SUB_WORKERS,
    );
    groupResults.forEach((message, mark) => {
      if (message.type !== 'groupDone') return;
      loadout = loadout.map((entry, index) => {
        if (mark >= entry.picks.length) return entry;
        const picks = [...entry.picks];
        picks[mark] = message.picks[index] || picks[mark];
        return { card: entry.card, picks };
      });
    });
    const measure = (trial: Loadout) => {
      evaluations += 1;
      return evaluate(trial);
    };
    let best = measure(loadout);
    onProgress({ pass: marks, efficiency: best, evaluations, loadout });

    // 2) 합친 편성에서 마크 하나씩 바꿔 보며 다듬기 (묶음을 따로 계산한 차이를 줄인다)
    const ascended = ascendMarks(loadout, best, markCount, measure, undefined, (round, efficiency, current_) =>
      onProgress({ pass: marks + round, efficiency, evaluations, loadout: current_ }),
    );
    loadout = ascended.loadout;
    best = ascended.efficiency;

    // 3) 안 열린 묶음마다 하위 작업자로 0 · 2 · 4 · 6장
    const finalPicks = loadout.map((entry) => entry.picks);
    const lockedResults = await runPool(
      lockedMarksOf(loadout).map((mark) => () => runSubWorker(subRequest({ mode: 'lockedGroup', mark, picks: finalPicks }))),
      MAX_SUB_WORKERS,
    );
    const lockedGroups = lockedResults.flatMap((message): LockedMarkGroup[] => (message.type === 'lockedDone' && message.group ? [message.group] : []));
    scope.postMessage({ type: 'done', result: { loadout, baseEfficiency, efficiency: best, evaluations, stopped: false, lockedGroups } });
  } catch (error) {
    scope.postMessage({ type: 'failed', message: String(error) });
  }
};
