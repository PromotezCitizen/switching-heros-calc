import { describe, expect, it } from 'vitest';
import type { Loadout, OwnedCard } from '@/cardOptimizer/loadout';
import { recommendCards } from '@/cardOptimizer/recommendCards';

function card(cardId: string, setsByMark: string[][]): OwnedCard {
  return { cardId, star: '1', setsByMark };
}

/** 카드마다 가치 + 같은 세트를 2장 이상 쓰면 보너스 (세트 단계 흉내) */
function fakeEvaluate(worth: Record<string, number>) {
  return (loadout: Loadout): number => {
    const counts = new Map<string, number>();
    let total = 0;
    for (const entry of loadout) {
      total += worth[entry.card.cardId] ?? 0;
      for (const pick of entry.picks) counts.set(pick, (counts.get(pick) ?? 0) + 1);
    }
    for (const count of counts.values()) total += count >= 2 ? 10 * count : 0;
    return total;
  };
}

describe('카드 추천 편성', () => {
  const owned = [card('a', [['1', '2']]), card('b', [['1', '2']]), card('c', [['1', '2']]), card('d', [['1']]), card('e', [['2']])];
  const options = { markCount: () => 1, owned, slots: 3 };

  it('안 쓴 더 좋은 카드로 바꾸고 같은 세트로 모은다', () => {
    const start: Loadout = [
      { card: owned[0], picks: ['1'] },
      { card: owned[1], picks: ['2'] },
      { card: owned[2], picks: ['1'] },
    ];
    const worth = { a: 0, b: 0, c: 0, d: 5, e: 5 };
    const result = recommendCards(start, { ...options, evaluate: fakeEvaluate(worth) });
    expect(result.efficiency).toBeGreaterThan(result.baseEfficiency);
    expect(new Set(result.loadout.map((entry) => entry.card.cardId)).size).toBe(result.loadout.length);
    expect(result.loadout.length).toBe(3);
  });

  it('고정 카드 (fixedCount): 앞의 고정 칸은 더 좋은 카드가 있어도 바꾸지 않고 나머지 칸만 채운다', () => {
    const worth = { a: 0, b: 0, c: 0, d: 5, e: 5 };
    const fixed: Loadout = [{ card: owned[0], picks: [] }];
    const result = recommendCards(fixed, { ...options, withMarks: false, evaluate: fakeEvaluate(worth), fixedCount: 1 });
    expect(result.loadout[0].card.cardId).toBe('a');
    expect(result.loadout.map((entry) => entry.card.cardId).sort()).toEqual(['a', 'd', 'e']);
  });

  it('빈 편성에서 시작해도 칸을 채워 가며 좋은 카드로 모은다 (비교 기준 효율을 따로 줄 수 있다)', () => {
    const worth = { a: 0, b: 0, c: 0, d: 5, e: 5 };
    const result = recommendCards([], { ...options, evaluate: fakeEvaluate(worth), baseEfficiency: -1 });
    expect(result.baseEfficiency).toBe(-1);
    expect(result.loadout.length).toBe(3);
    expect(new Set(result.loadout.map((entry) => entry.card.cardId)).size).toBe(3);
    // 최선 = 카드 d (가치 5) + 같은 세트 1 을 3장 모은 보너스 30 = 35 (d + e 는 세트가 안 모여 10)
    expect(result.efficiency).toBe(35);
    expect(result.loadout.map((entry) => entry.card.cardId)).toContain('d');
  });

  it('이미 최선이면 효율이 그대로다', () => {
    const start: Loadout = [{ card: owned[0], picks: ['1'] }, { card: owned[1], picks: ['1'] }, { card: owned[2], picks: ['1'] }];
    const evaluate = fakeEvaluate({});
    const first = recommendCards(start, { ...options, evaluate });
    const again = recommendCards(first.loadout, { ...options, evaluate });
    expect(again.efficiency).toBeCloseTo(first.efficiency, 12);
  });

  it('멈추라고 하면 그때까지의 최선을 돌려준다', () => {
    const start: Loadout = [{ card: owned[0], picks: ['1'] }];
    const result = recommendCards(start, { ...options, evaluate: fakeEvaluate({ d: 1 }), shouldStop: () => true });
    expect(result.stopped).toBe(true);
    expect(result.loadout.length).toBeGreaterThan(0);
  });
});
