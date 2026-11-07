/**
 * 세트 마크 추천: 카드 6장이 정해진 뒤, 마크만 따로 계산한다 (카드는 recommendCards 가 따로 고른다).
 * 세트 단계는 같은 세트가 2 · 4 · 6개 모여야 열리고, 마크를 하나씩 바꿔 보는 것으로는 단계에 닿기 어렵다.
 * 그래서 마크 번호 (1 · 2 · 3번 묶음) 마다 "세트별로 몇 개씩 모을지" 를 단계 개수 (2 · 4 · 6) 로만 나눈 조합 (6 / 4 + 2 / 2 + 2 + 2) 을 시험해
 * 효율이 가장 높은 것을 받아들인다. 마지막에 마크 하나씩 바꿔 보며 더 오르면 받아들인다.
 */
import type { Loadout, OwnedCard, SlotLoadout } from '@/cardOptimizer/loadout';
import type { CardRecommendation, CardRecommendProgress } from '@/cardOptimizer/recommendCards';

/** 이보다 작은 효율 증가는 오른 것으로 치지 않는다 (log10 기준, 무한 반복 방지) */
const IMPROVEMENT_EPSILON = 1e-9;
const MAX_ASCENT_ROUNDS = 4;
/** 조합을 시험하는 동안 이만큼 계산할 때마다 진행을 알린다 */
const PROGRESS_EVERY = 20;

export interface MarkRecommendOptions {
  /** 편성 → 효율 log (클수록 좋음) */
  evaluate: (loadout: Loadout) => number;
  /** 카드 → 마크 칸 수 */
  markCount: (card: OwnedCard) => number;
  shouldStop?: () => boolean;
  onProgress?: (progress: CardRecommendProgress) => void;
  /** 결과의 "처음 효율" 로 보일 값 (비교 기준) */
  baseEfficiency?: number;
}

function withPick(loadout: Loadout, index: number, mark: number, setId: string): Loadout {
  return loadout.map((entry, entryIndex): SlotLoadout => {
    if (entryIndex !== index) return entry;
    const picks = [...entry.picks];
    picks[mark] = setId;
    return { card: entry.card, picks };
  });
}

/** 세트 단계가 열리는 개수 (카드 세트 표의 2 · 4 · 6 세트). 이 개수 말고는 마크가 낭비된다 */
const TIER_SIZES = [2, 4, 6];

/**
 * total 개 마크를 sets 개 세트에 나누는 개수 조합: 세트마다 0 또는 단계 개수 (2 · 4 · 6) 만 쓰고, 남는 마크는 1개까지만 허용한다
 * (6 / 4 + 2 / 2 + 2 + 2 …. 5 + 1 이나 3 + 3 은 낭비라 뺀다). 남은 1개는 가장 많이 모은 세트에 붙인다 (효과는 그대로)
 */
export function tierCounts(total: number, sets: number): number[][] {
  const result: number[][] = [];
  const walk = (position: number, left: number, counts: number[]): void => {
    if (position === sets) {
      if (left > 1) return;
      const full = [...counts];
      if (left === 1) full[full.indexOf(Math.max(...full))] += 1;
      result.push(full);
      return;
    }
    for (const size of [0, ...TIER_SIZES]) if (size <= left) walk(position + 1, left - size, [...counts, size]);
  };
  walk(0, total, []);
  return result;
}

/** 세트별 개수대로 카드에 세트를 나눠 준다 (카드마다 고를 수 있는 세트 안에서). 개수가 큰 세트부터, 선택지가 적은 카드부터 채운다. 못 나누면 null */
function assignCounts(entries: { index: number; options: string[] }[], sets: string[], counts: number[]): Map<number, string> | null {
  const free = [...entries];
  const assignment = new Map<number, string>();
  const order = sets.map((setId, position) => ({ setId, count: counts[position] })).sort((left, right) => right.count - left.count);
  for (const { setId, count } of order) {
    const candidates = free.filter((entry) => entry.options.includes(setId)).sort((left, right) => left.options.length - right.options.length);
    if (candidates.length < count) return null;
    for (const entry of candidates.slice(0, count)) {
      assignment.set(entry.index, setId);
      free.splice(free.indexOf(entry), 1);
    }
  }
  return free.length === 0 ? assignment : null;
}

/** 출발 편성: 카드마다 마크마다 고를 수 있는 첫 세트 */
export function startMarkLoadout(cards: OwnedCard[], markCount: (card: OwnedCard) => number): Loadout {
  return cards.map((card) => ({
    card,
    picks: Array.from({ length: markCount(card) }, (_, mark) => card.setsByMark[mark]?.[0] ?? ''),
  }));
}

/**
 * 마크 번호 하나 (0부터) 의 "세트 몰기": 세트마다 몇 개씩 모을지 (6 / 4 + 2 / 2 + 2 + 2) 를 시험해 가장 높은 편성.
 * 더 오르는 것이 없으면 loadout 그대로. 묶음마다 따로 (작업자 여럿) 돌릴 수 있게 나눠 둔 것
 */
export function bestGroupLoadout(
  loadout: Loadout,
  mark: number,
  markCount: (card: OwnedCard) => number,
  measure: (loadout: Loadout) => number,
  currentBest: number,
  shouldStop?: () => boolean,
  onMeasured?: (efficiency: number, loadout: Loadout) => void,
): { loadout: Loadout; efficiency: number; stopped: boolean } {
  // 이 마크 번호를 가진 카드와 카드마다 고를 수 있는 세트
  const entries = loadout.flatMap((entry, index) => (mark < markCount(entry.card) ? [{ index, options: entry.card.setsByMark[mark] ?? [] }] : []));
  const sets = [...new Set(entries.flatMap((entry) => entry.options))];
  let bestTrial: Loadout | null = null;
  let bestValue = currentBest;
  // 세트 단계는 개수만 정하므로 어느 카드가 어느 세트를 갖는지는 상관없다
  for (const counts of tierCounts(entries.length, sets.length)) {
    if (shouldStop?.()) return { loadout: bestTrial ?? loadout, efficiency: bestValue, stopped: true };
    const assignment = assignCounts(entries, sets, counts);
    if (!assignment) continue;
    let trial = loadout;
    for (const [index, setId] of assignment) trial = withPick(trial, index, mark, setId);
    const value = measure(trial);
    if (value > bestValue + IMPROVEMENT_EPSILON) {
      bestValue = value;
      bestTrial = trial;
    }
    onMeasured?.(bestValue, bestTrial ?? loadout);
  }
  return { loadout: bestTrial ?? loadout, efficiency: bestValue, stopped: false };
}

/** 마크 하나씩 바꿔 보며 더 오르면 받아들인다 (최대 MAX_ASCENT_ROUNDS 바퀴) */
export function ascendMarks(
  loadout: Loadout,
  best: number,
  markCount: (card: OwnedCard) => number,
  measure: (loadout: Loadout) => number,
  shouldStop?: () => boolean,
  onRound?: (round: number, efficiency: number, loadout: Loadout) => void,
): { loadout: Loadout; efficiency: number; stopped: boolean } {
  let stopped = false;
  for (let round = 0; round < MAX_ASCENT_ROUNDS && !stopped; round += 1) {
    let improved = false;
    for (let index = 0; index < loadout.length && !stopped; index += 1) {
      for (let mark = 0; mark < markCount(loadout[index].card); mark += 1) {
        for (const setId of loadout[index].card.setsByMark[mark] ?? []) {
          if (loadout[index].picks[mark] === setId) continue;
          const trial = withPick(loadout, index, mark, setId);
          const value = measure(trial);
          if (value > best + IMPROVEMENT_EPSILON) {
            loadout = trial;
            best = value;
            improved = true;
          }
        }
      }
      if (shouldStop?.()) stopped = true;
    }
    onRound?.(round, best, loadout);
    if (!improved) break;
  }
  return { loadout, efficiency: best, stopped };
}

export function recommendMarks(cards: OwnedCard[], options: MarkRecommendOptions): CardRecommendation {
  const { evaluate, markCount, shouldStop, onProgress } = options;
  let evaluations = 0;
  const measure = (loadout: Loadout): number => {
    evaluations += 1;
    return evaluate(loadout);
  };
  let loadout = startMarkLoadout(cards, markCount);
  let best = measure(loadout);
  const baseEfficiency = options.baseEfficiency ?? best;
  let stopped = false;
  const marks = Math.max(0, ...cards.map(markCount));

  // 1) 마크 번호마다 "세트 몰기" (앞 번호 결과를 반영해 차례로)
  for (let mark = 0; mark < marks && !stopped; mark += 1) {
    if (shouldStop?.()) {
      stopped = true;
      break;
    }
    onProgress?.({ pass: mark, efficiency: best, evaluations, loadout });
    const group = bestGroupLoadout(loadout, mark, markCount, measure, best, shouldStop, (efficiency, current) => {
      if (evaluations % PROGRESS_EVERY === 0) onProgress?.({ pass: mark, efficiency, evaluations, loadout: current });
    });
    loadout = group.loadout;
    best = group.efficiency;
    stopped = group.stopped;
  }

  // 2) 마크 하나씩 바꿔 보며 더 오르면 받아들인다
  if (!stopped) {
    const ascended = ascendMarks(loadout, best, markCount, measure, shouldStop, (round, efficiency, current) =>
      onProgress?.({ pass: marks + round, efficiency, evaluations, loadout: current }),
    );
    loadout = ascended.loadout;
    best = ascended.efficiency;
    stopped = ascended.stopped;
  }
  return { loadout, baseEfficiency, efficiency: best, evaluations, stopped };
}
