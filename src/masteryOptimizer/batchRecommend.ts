/**
 * 일괄 계산 (순서 "특성 뒤 카드"):
 * 특성 추천 묶음 (MASTERY_BUNDLES 앞 대상) 을 BATCH.MASTERY_LANES 개씩 동시에 돌리고, 다 끝나면 카드 추천 묶음 (TARGET_BUNDLES 앞 대상) 을
 * BATCH.CARD_LANES 개씩 돌린다. 대상 하나가 끝날 때마다 그 대상의 저장 칸에 결과를 넣는다 (화면의 개별 추천과 같은 칸 · 같은 모양).
 * 멈추면 돌던 작업자를 끝내고, 끝나지 않은 대상의 결과는 버린다 (멈추면 중간 결과 버림)
 */
import { CONSTS } from '@/CONSTS';
import type { StatTables } from '@/data/statTables';
import type { MonsterHpData } from '@/dpm/hpCondition';
import { DAMAGE_TARGETS, type DamageTarget } from '@/dpm/targetDamage';
import type { CardRecommendMessage, CardRecommendRequest } from '@/cardOptimizer/cardWorkerTypes';
import type { CardRecommendation } from '@/cardOptimizer/recommendCards';
import { CARD_FIXED_KEY, cardResultKey, fixedCardIdsOf, storedCardResult } from '@/cardOptimizer/cardResult';
import { optimizerInputsFor, optimizerValuesFor } from '@/masteryOptimizer/optimizerInputs';
import type { Recommendation } from '@/masteryOptimizer/recommend';
import type { RecommendMessage, RecommendRequest } from '@/masteryOptimizer/recommendWorkerTypes';
import { masteryResultKey, resultSlot, type StoredMasteryResult } from '@/masteryOptimizer/storedResult';
import { bundleTarget, masteryBundleTarget } from '@/masteryOptimizer/targetBundles';
import { OWNED_CARDS_KEY } from '@/usb/saveImport/ownedCards';

const { BATCH } = CONSTS.dpm;

/** 묶음마다 앞 대상 하나 (대상 순서대로) */
function representatives(pick: (target: DamageTarget) => DamageTarget): DamageTarget[] {
  return [...new Set(DAMAGE_TARGETS.map(pick))];
}
export const BATCH_MASTERY_TARGETS = representatives(masteryBundleTarget);
export const BATCH_CARD_TARGETS = representatives(bundleTarget);

/** 일괄 계산 범위: 둘 다 (특성 → 카드) / 특성만 / 몬스터 카드만 */
export type BatchParts = 'all' | 'mastery' | 'cards';

export interface BatchProgress {
  parts: BatchParts;
  phase: 'mastery' | 'cards' | 'done';
  masteryDone: number;
  cardsDone: number;
  /** 지금 계산 중인 대상 */
  running: DamageTarget[];
  failed: string[];
}

export interface BatchOptions {
  /** 시작 때의 저장소 값 (입력 · 고정 카드 · 보유 카드) */
  storeValues: Record<string, string>;
  tables: StatTables;
  monsterHp: MonsterHpData | null;
  /** 계산 범위 (기본 둘 다) */
  parts?: BatchParts;
  save: (key: string, value: string) => void;
  onProgress: (progress: BatchProgress) => void;
}

/** 일을 limit 개씩 동시에 돌린다 */
async function runPool<Item>(items: Item[], limit: number, task: (item: Item) => Promise<void>): Promise<void> {
  let next = 0;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      await task(item);
    }
  });
  await Promise.all(lanes);
}

export interface BatchHandle {
  done: Promise<BatchProgress>;
  stop: () => void;
}

export function startBatch({ storeValues, tables, monsterHp, parts = 'all', save, onProgress }: BatchOptions): BatchHandle {
  const workers = new Set<Worker>();
  let stopped = false;
  const runsMastery = parts !== 'cards';
  const runsCards = parts !== 'mastery';
  const progress: BatchProgress = { parts, phase: runsMastery ? 'mastery' : 'cards', masteryDone: 0, cardsDone: 0, running: [], failed: [] };
  const report = () => onProgress({ ...progress, running: [...progress.running], failed: [...progress.failed] });

  /** 작업자 하나를 돌려 끝 메시지의 결과를 받는다 (멈추면 끝내고 null) */
  function runWorker<Request, Result>(url: URL, request: Request, isDone: (message: unknown) => Result | undefined): Promise<Result | null> {
    return new Promise((resolve, reject) => {
      if (stopped) return resolve(null);
      const worker = new Worker(url, { type: 'module' });
      workers.add(worker);
      const finish = () => {
        worker.terminate();
        workers.delete(worker);
      };
      worker.onmessage = (event: MessageEvent<{ type: string; message?: string }>) => {
        const result = isDone(event.data);
        if (result !== undefined) {
          finish();
          resolve(result);
        } else if (event.data.type === 'failed') {
          finish();
          reject(new Error(event.data.message ?? '계산 중 오류가 났어요'));
        }
      };
      worker.onerror = (event) => {
        finish();
        reject(new Error(event.message || '계산 중 오류가 났어요'));
      };
      worker.postMessage(request);
    });
  }

  const masteryUrl = new URL('./recommend.worker.ts', import.meta.url);
  const cardUrl = new URL('../cardOptimizer/cardRecommend.worker.ts', import.meta.url);
  const swap = optimizerInputsFor(storeValues, BATCH_MASTERY_TARGETS[0], monsterHp).damage.swap === true;
  const ownedText = storeValues[OWNED_CARDS_KEY] ?? '';
  const fixedCardIds = fixedCardIdsOf(storeValues[CARD_FIXED_KEY]);

  const withRunning = async (target: DamageTarget, work: () => Promise<void>) => {
    progress.running.push(target);
    report();
    try {
      await work();
    } catch (error) {
      if (!stopped) progress.failed.push(`${target}: ${String(error)}`);
    } finally {
      progress.running = progress.running.filter((name) => name !== target);
      report();
    }
  };

  const done = (async (): Promise<BatchProgress> => {
    report();
    await runPool(runsMastery ? BATCH_MASTERY_TARGETS : [], BATCH.MASTERY_LANES, (target) =>
      withRunning(target, async () => {
        const request: RecommendRequest = { values: optimizerValuesFor(storeValues, target), tables, inputs: optimizerInputsFor(storeValues, target, monsterHp) };
        const result = await runWorker<RecommendRequest, Recommendation>(masteryUrl, request, (message) =>
          (message as RecommendMessage).type === 'done' ? (message as Extract<RecommendMessage, { type: 'done' }>).result : undefined,
        );
        if (!result || stopped) return;
        const stored: StoredMasteryResult = { allocation: result.allocation, baseEfficiency: result.baseEfficiency, efficiency: result.efficiency };
        save(masteryResultKey(target, swap), JSON.stringify(stored));
        progress.masteryDone += 1;
      }),
    );
    if (stopped) return progress;
    progress.phase = 'cards';
    report();
    await runPool(runsCards ? BATCH_CARD_TARGETS : [], BATCH.CARD_LANES, (target) =>
      withRunning(target, async () => {
        const base: CardRecommendRequest = { values: optimizerValuesFor(storeValues, target), tables, inputs: optimizerInputsFor(storeValues, target, monsterHp), ownedText, mode: 'cards' };
        const takeDone = (message: unknown) =>
          (message as CardRecommendMessage).type === 'done' ? (message as Extract<CardRecommendMessage, { type: 'done' }>).result : undefined;
        const cards = await runWorker<CardRecommendRequest, CardRecommendation>(cardUrl, { ...base, fixedCardIds }, takeDone);
        if (!cards || stopped) return;
        const cardIds = cards.loadout.map((entry) => entry.card.cardId);
        const marks = await runWorker<CardRecommendRequest, CardRecommendation>(cardUrl, { ...base, mode: 'marks', cardIds }, takeDone);
        if (!marks || stopped) return;
        const stored = storedCardResult(marks.loadout, marks.baseEfficiency ?? marks.efficiency, marks.efficiency, marks.lockedGroups);
        save(cardResultKey(resultSlot(target, swap)), JSON.stringify(stored));
        progress.cardsDone += 1;
      }),
    );
    if (!stopped) progress.phase = 'done';
    report();
    return progress;
  })();

  return {
    done,
    stop: () => {
      stopped = true;
      for (const worker of workers) worker.terminate();
      workers.clear();
    },
  };
}
