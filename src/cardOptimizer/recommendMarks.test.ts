import { describe, expect, it } from 'vitest';
import type { Loadout, OwnedCard } from '@/cardOptimizer/loadout';
import { recommendCards } from '@/cardOptimizer/recommendCards';
import { recommendMarks } from '@/cardOptimizer/recommendMarks';

/** 마크 1번 칸만 있는 카드 (고를 수 있는 세트 목록) */
function card(cardId: string, sets: string[]): OwnedCard {
  return { cardId, star: '1', setsByMark: [sets] };
}

/** 가짜 효율: 같은 세트가 2 · 4 · 6개 모일 때마다 단계 보너스 (세트마다 가중치 다름) */
function tierEvaluate(weight: Record<string, number>) {
  return (loadout: Loadout): number => {
    const counts = new Map<string, number>();
    for (const entry of loadout) {
      const pick = entry.picks[0];
      if (pick) counts.set(pick, (counts.get(pick) ?? 0) + 1);
    }
    let total = 0;
    for (const [setId, count] of counts) total += (weight[setId] ?? 1) * [2, 4, 6].filter((tier) => count >= tier).length;
    return total;
  };
}

const markCount = () => 1;

describe('세트 마크 추천 (카드는 정해진 뒤, 마크만 따로)', () => {
  // 6장 중 5장은 세트 A · B 를 고를 수 있고, 한 장 (f) 은 B 만 고를 수 있다. A 를 몰면 A 5개 (2/4), f 는 B 1개 (낱개)
  // B 를 몰면 B 6개 (2/4/6) 라서 B 로 모으는 것이 더 좋다 (한 칸씩 바꿔서는 닿기 어려운 곳)
  const cards = [card('a', ['A', 'B']), card('b', ['A', 'B']), card('c', ['A', 'B']), card('d', ['A', 'B']), card('e', ['A', 'B']), card('f', ['B'])];
  const evaluate = tierEvaluate({ A: 1, B: 1.5 });

  it('세트를 몰아서 단계를 채운다 (낱개로 남기지 않는다)', () => {
    const result = recommendMarks(cards, { evaluate, markCount });
    expect(result.loadout.map((entry) => entry.picks[0])).toEqual(['B', 'B', 'B', 'B', 'B', 'B']);
    expect(result.efficiency).toBe(4.5);
  });

  it('6개로 몰지 않고 4 + 2 로 나누는 편이 더 좋으면 그렇게 나눈다', () => {
    // A: 2 · 4 단계는 효과 1 씩, 6 단계는 0. B: 2 단계만 효과 10. 6 몰기 = A 6 → 2, 4 + 2 = A 4 (2) + B 2 (10) = 12
    const tier: Record<string, number[]> = { A: [1, 1, 0], B: [10, 0, 0] };
    const split = (loadout: Loadout): number => {
      const counts = new Map<string, number>();
      for (const entry of loadout) counts.set(entry.picks[0], (counts.get(entry.picks[0]) ?? 0) + 1);
      let total = 0;
      for (const [setId, count] of counts) total += [2, 4, 6].reduce((sum, threshold, index) => sum + (count >= threshold ? (tier[setId]?.[index] ?? 0) : 0), 0);
      return total;
    };
    const open = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => card(id, ['A', 'B']));
    const result = recommendMarks(open, { evaluate: split, markCount });
    const counts = result.loadout.reduce<Record<string, number>>((acc, entry) => ({ ...acc, [entry.picks[0]]: (acc[entry.picks[0]] ?? 0) + 1 }), {});
    expect(result.efficiency).toBe(12);
    expect(counts).toEqual({ A: 4, B: 2 });
  });

  it('카드는 그대로 두고 마크만 정한다, 비교 기준 효율을 따로 줄 수 있다', () => {
    const result = recommendMarks(cards, { evaluate, markCount, baseEfficiency: -1 });
    expect(result.baseEfficiency).toBe(-1);
    expect(result.loadout.map((entry) => entry.card.cardId)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });

  it('멈추라고 하면 그때까지의 최선을 돌려준다', () => {
    const result = recommendMarks(cards, { evaluate, markCount, shouldStop: () => true });
    expect(result.stopped).toBe(true);
    expect(result.loadout).toHaveLength(6);
  });
});

describe('카드 추천은 마크를 건드리지 않는다 (withMarks: false)', () => {
  it('카드만 고르고 마크는 비워 둔다', () => {
    const owned = [card('a', ['A']), card('b', ['A']), card('c', ['A'])];
    const result = recommendCards([], { evaluate: (loadout) => loadout.length, markCount, owned, slots: 2, withMarks: false });
    expect(result.loadout).toHaveLength(2);
    expect(result.loadout.every((entry) => entry.picks.length === 0)).toBe(true);
  });
});
