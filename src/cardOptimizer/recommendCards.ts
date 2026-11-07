/**
 * 카드 추천 편성: 지금 편성에서 시작해 (1) 한 칸의 카드를 안 쓴 보유 카드로 바꿔 보고 (2) 칸마다 세트 마크를 바꿔 보며
 * 효율이 오르면 받아들인다. 평가 함수는 밖에서 넘긴다 (실제 대미지 계산이 느려서, 탐색 자체는 가짜 함수로 시험한다).
 * 한계: 한 칸씩 바꾸는 언덕 오르기라 최적을 보장하지 않는다 (두 칸을 함께 바꿔야 오르는 조합은 놓친다).
 */
import type { LockedMarkGroup } from '@/cardOptimizer/lockedMarkGroups';
import type { Loadout, OwnedCard, SlotLoadout } from '@/cardOptimizer/loadout';

/** 이보다 작은 효율 증가는 오른 것으로 치지 않는다 (log10 기준, 무한 반복 방지) */
const IMPROVEMENT_EPSILON = 1e-9;
const MAX_PASSES = 40;
const MAX_PICK_ROUNDS = 4;
/** 카드 교환 후보 중 세트 고르기를 다시 맞춰 볼 개수 */
const TOP_SWAPS = 4;

export interface CardRecommendOptions {
  /** 편성 → 효율 log (클수록 좋음) */
  evaluate: (loadout: Loadout) => number;
  /** 마크 칸 수 (카드 → 고를 수 있는 마크 칸 수) */
  markCount: (card: OwnedCard) => number;
  /** 편성에 넣을 수 있는 카드 (보유 카드 전체) */
  owned: OwnedCard[];
  /** 편성 칸 수 */
  slots: number;
  shouldStop?: () => boolean;
  onProgress?: (progress: CardRecommendProgress) => void;
  /** 결과의 "처음 효율" 로 보일 값 (비교 기준, 예: 지금 편성의 효율). 없으면 출발 편성의 효율 */
  baseEfficiency?: number;
  /** false 면 세트 마크는 건드리지 않는다 (카드만 고른다, 마크는 recommendMarks 가 따로 계산). 기본 true */
  withMarks?: boolean;
  /** 출발 편성 앞쪽의 이 칸 수는 바꾸지 않는다 (고정 카드, 사용자 결정 2026-11-05 "몬스터카드는 3개 고정"). 기본 0 */
  fixedCount?: number;
}

export interface CardRecommendProgress {
  pass: number;
  efficiency: number;
  evaluations: number;
  loadout: Loadout;
}

export interface CardRecommendation {
  loadout: Loadout;
  baseEfficiency: number;
  efficiency: number;
  evaluations: number;
  stopped: boolean;
  /** 추천 카드로 안 열린 마크 묶음마다 "0 · 2 · 4 · 6장 열렸다면" 최선 세트 (마크 계산에서만 채움, lockedMarkGroups.ts) */
  lockedGroups?: LockedMarkGroup[];
}

function withSlot(loadout: Loadout, index: number, slot: SlotLoadout): Loadout {
  return loadout.map((entry, entryIndex) => (entryIndex === index ? slot : entry));
}

export function recommendCards(current: Loadout, options: CardRecommendOptions): CardRecommendation {
  const { evaluate, markCount, owned, slots, shouldStop, onProgress } = options;
  let evaluations = 0;
  const measure = (loadout: Loadout): number => {
    evaluations += 1;
    return evaluate(loadout);
  };
  let loadout = current;
  let best = measure(loadout);
  const baseEfficiency = options.baseEfficiency ?? best;
  let stopped = false;

  /** 칸마다 마크마다 다른 세트로 바꿔 보며 오르면 받아들인다 (더 오르지 않을 때까지) */
  const improvePicks = (start: Loadout, startValue: number): { loadout: Loadout; value: number } => {
    if (options.withMarks === false) return { loadout: start, value: startValue };
    let state = start;
    let value = startValue;
    for (let round = 0; round < MAX_PICK_ROUNDS; round += 1) {
      let improved = false;
      state.forEach((entry, index) => {
        for (let mark = 0; mark < markCount(entry.card); mark += 1) {
          for (const setId of entry.card.setsByMark[mark] ?? []) {
            const currentEntry = state[index];
            if (currentEntry.picks[mark] === setId) continue;
            const picks = [...currentEntry.picks];
            picks[mark] = setId;
            const trial = withSlot(state, index, { card: currentEntry.card, picks });
            const trialValue = measure(trial);
            if (trialValue > value + IMPROVEMENT_EPSILON) {
              state = trial;
              value = trialValue;
              improved = true;
            }
          }
        }
      });
      if (!improved) break;
    }
    return { loadout: state, value };
  };

  /** 카드를 바꿀 때 새 카드의 세트: 같은 마크에서 이미 편성에 많이 쓰는 세트 (세트 단계는 장수로 열리므로), 없으면 첫 세트 */
  const picksFor = (card: OwnedCard, others: Loadout): string[] =>
    options.withMarks === false
      ? []
      : Array.from({ length: markCount(card) }, (_, mark) => {
      const choices = card.setsByMark[mark] ?? [];
      const counts = new Map<string, number>();
      for (const entry of others) {
        const pick = entry.picks[mark];
        if (pick && choices.includes(pick)) counts.set(pick, (counts.get(pick) ?? 0) + 1);
      }
      return [...choices].sort((left, right) => (counts.get(right) ?? 0) - (counts.get(left) ?? 0))[0] ?? '';
    });

  const first = improvePicks(loadout, best);
  loadout = first.loadout;
  best = first.value;

  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    if (shouldStop?.()) {
      stopped = true;
      break;
    }
    onProgress?.({ pass, efficiency: best, evaluations, loadout });
    const used = new Set(loadout.map((entry) => entry.card.cardId));
    const swaps: { loadout: Loadout; value: number }[] = [];
    for (let index = options.fixedCount ?? 0; index < Math.min(slots, loadout.length); index += 1) {
      const others = loadout.filter((_, otherIndex) => otherIndex !== index);
      for (const card of owned) {
        if (used.has(card.cardId)) continue;
        const trial = withSlot(loadout, index, { card, picks: picksFor(card, others) });
        swaps.push({ loadout: trial, value: measure(trial) });
      }
    }
    // 빈 칸이 있으면 (보유 카드가 편성 칸보다 많은데 덜 채운 경우) 채워 본다
    if (loadout.length < slots) {
      for (const card of owned) {
        if (used.has(card.cardId)) continue;
        const trial = [...loadout, { card, picks: picksFor(card, loadout) }];
        swaps.push({ loadout: trial, value: measure(trial) });
      }
    }
    swaps.sort((left, right) => right.value - left.value);
    let improved = false;
    for (const swap of swaps.slice(0, TOP_SWAPS)) {
      const tuned = improvePicks(swap.loadout, swap.value);
      if (tuned.value > best + IMPROVEMENT_EPSILON) {
        loadout = tuned.loadout;
        best = tuned.value;
        improved = true;
      }
    }
    if (!improved) break;
  }
  return { loadout, baseEfficiency, efficiency: best, evaluations, stopped };
}
