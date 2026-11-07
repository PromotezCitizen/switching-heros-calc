/**
 * 추천 카드로 안 열린 마크 묶음 (그 묶음 칸이 있는 카드가 0장) 마다, 그 묶음이 0 · 2 · 4 · 6장 열렸다면 어떤 세트를 고를지
 * (계산 방식은 그대로 두고 마크에 없는 등급은 0 · 2 · 4 · 6개 선택을 보이게). 추천 결과 (카드 + 다른 묶음 마크) 는 고정하고,
 * 그 묶음의 세트 개수만 더해 효율을 본다 (계산 전용 칸 CARD_EXTRA_MARKS_FIELD — 세트 효과는 묶음 안 개수로만 정해짐).
 * 개수마다 세트별 2 · 4 · 6 조합 (recommendMarks 의 tierCounts) 과 그 묶음의 모든 세트를 시험한다
 */
import { tierCounts } from '@/cardOptimizer/recommendMarks';

export const LOCKED_GROUP_COUNTS = [2, 4, 6] as const;

export interface LockedMarkOption {
  /** 그 묶음이 열린 카드 장수 (0 = 지금) */
  count: number;
  /** 세트별 개수 (개수 큰 순) */
  sets: { setId: string; count: number }[];
  efficiency: number;
}

export interface LockedMarkGroup {
  /** 마크 묶음 번호 (1부터) */
  mark: number;
  options: LockedMarkOption[];
}

/**
 * lockedMarks: 안 열린 묶음 번호 (1부터), setsOf: 묶음 번호 → 고를 수 있는 세트, evaluateExtra: 더할 세트 개수 → 효율 log.
 * shouldStop 이 참이면 그때까지의 결과만
 */
export function scanLockedGroups(
  lockedMarks: number[],
  setsOf: (mark: number) => string[],
  evaluateExtra: (extra: Record<string, number>) => number,
  shouldStop?: () => boolean,
): LockedMarkGroup[] {
  const base = evaluateExtra({});
  const groups: LockedMarkGroup[] = [];
  for (const mark of lockedMarks) {
    const sets = setsOf(mark);
    const options: LockedMarkOption[] = [{ count: 0, sets: [], efficiency: base }];
    for (const count of LOCKED_GROUP_COUNTS) {
      if (shouldStop?.()) return groups;
      let best: LockedMarkOption | null = null;
      for (const counts of tierCounts(count, sets.length)) {
        const extra: Record<string, number> = {};
        counts.forEach((amount, index) => {
          if (amount > 0) extra[sets[index]] = amount;
        });
        const efficiency = evaluateExtra(extra);
        if (!best || efficiency > best.efficiency) {
          best = {
            count,
            sets: Object.entries(extra)
              .map(([setId, amount]) => ({ setId, count: amount }))
              .sort((left, right) => right.count - left.count),
            efficiency,
          };
        }
      }
      if (best) options.push(best);
    }
    groups.push({ mark, options });
  }
  return groups;
}
