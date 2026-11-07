/**
 * 특성 추천 배분: 지금 배분에서 시작해, 포인트를 효율이 낮은 특성에서 높은 특성으로 옮기며 올린다.
 * 한 판 (pass) 마다 특성별로 "묶음만큼 올렸을 때 · 내렸을 때" 효율 변화를 재서 포인트당 증가가 큰 쪽 (넣을 곳) 과
 * 포인트당 감소가 작은 쪽 (뺄 곳, 안 쓴 포인트 포함) 을 짝지어 옮겨 보고, 실제로 효율이 오르고 규칙을 지키면 받아들인다.
 * 묶음 크기는 1000 → 100 → 10 → 1 로 줄인다 (claude-docs/mastery-optimizer-design.md 5절).
 * 평가 함수는 밖에서 넘긴다 (실제 대미지 계산이 느려서, 이 탐색 자체는 작은 가짜 함수로 시험한다).
 * 확률 문턱: 확률은 100% 미만이면 효과 0 이라 (사용자 결정) 확률을 올리는 특성과 그 문턱 효과 특성은 하나씩 올려서는 효율이 안 오른다.
 * 그래서 한 판에서 일반 이동이 하나도 오르지 않으면, 같은 확률 묶음 (comboFamily) 의 특성 둘을 동시에 최대까지 올리고
 * (효율 손실이 작은 특성부터 빼서 포인트를 댄다), 오르면 받아들인다. 남는 포인트는 이어지는 일반 이동이 정리한다.
 * 한계: 아직 안 열린 특성은 후보가 아니다 (앞 단계를 최대 레벨까지 채워야 열리는 경우는 따라가지 못함). 쌍만 시도한다 (셋 이상 필요한 문턱은 못 찾음).
 */
import type { MasteryTrait } from '@/calc/sources/masteryRuneBuff/mastery';
import { isUnlocked, levelOf, usedPoints, validateAllocation, type Allocation } from '@/masteryOptimizer/rules';

/** 한 번에 옮겨 보는 포인트 묶음 (큰 것부터) */
export const DEFAULT_BLOCK_SIZES = [1000, 100, 10, 1];
/** 한 묶음 크기에서 더 오르지 않을 때까지 돌리는 판 수의 상한 */
const MAX_PASSES_PER_BLOCK = 200;
/** 넣을 곳 · 뺄 곳 후보를 각각 앞에서 이만큼 짝지어 실제로 옮겨 본다 */
const TOP_CANDIDATES = 5;
/** 한 묶음 크기에서 쌍 이동을 시도하는 횟수의 상한 (쌍마다 효율을 한 번씩 계산하므로 느리다) */
const MAX_COMBO_ATTEMPTS_PER_BLOCK = 4;
/** 이보다 작은 효율 증가는 오른 것으로 치지 않는다 (log10 기준, 무한 반복 방지) */
const IMPROVEMENT_EPSILON = 1e-9;

export interface RecommendOptions {
  /** 배분 → 효율 log (클수록 좋음) */
  evaluate: (allocation: Allocation) => number;
  userLevel: number;
  /** 총 포인트 (사용 + 안 쓴 포인트) */
  totalPoints: number;
  blockSizes?: number[];
  /** true 를 돌려주면 그때까지의 최선으로 멈춘다 */
  shouldStop?: () => boolean;
  onProgress?: (progress: RecommendProgress) => void;
  /** 결과의 "처음 효율" 로 보일 값 (비교 기준, 예: 지금 프리셋의 효율). 없으면 출발 배분의 효율 */
  baseEfficiency?: number;
  /** 이 탐색 앞에서 이미 센 계산 횟수 (진행 표시에 더한다) */
  evaluationsBefore?: number;
  /** 특성 → 확률 묶음 이름 (없으면 null). 있으면 같은 묶음의 특성 둘을 동시에 올리는 이동도 시도한다 */
  comboFamily?: (trait: MasteryTrait) => string | null;
}

export interface RecommendProgress {
  block: number;
  pass: number;
  efficiency: number;
  evaluations: number;
  /** 지금까지의 최선 배분 (멈출 때 이걸 쓴다) */
  allocation: Allocation;
  /** 출발 배분을 만드는 중이면 그 단계 (뼈대 · 얼티밋). 없으면 포인트 옮기기 탐색 */
  phase?: 'skeleton' | 'ultimates';
}

export interface Recommendation {
  allocation: Allocation;
  baseEfficiency: number;
  efficiency: number;
  evaluations: number;
  stopped: boolean;
}

/** 옮길 때 넣을 곳 후보 */
interface AddCandidate {
  trait: MasteryTrait;
  /** 포인트당 효율 증가 */
  rate: number;
}

/** 옮길 때 뺄 곳 후보. trait 이 null 이면 안 쓴 포인트 (빼도 효율이 안 줄어든다) */
interface RemoveCandidate {
  trait: MasteryTrait | null;
  /** 포인트당 효율 감소 */
  rate: number;
  /** 빼면 확보되는 포인트 (효율 감소가 같으면 많이 확보되는 쪽을 먼저) */
  points: number;
}

function withLevel(allocation: Allocation, rNo: string, level: number): Allocation {
  const next = { ...allocation };
  if (level > 0) next[rNo] = level;
  else delete next[rNo];
  return next;
}

/** 묶음 포인트로 살 수 있는 레벨 수 (한 레벨은 최소 1) */
function levelsFor(trait: MasteryTrait, block: number): number {
  return Math.max(1, Math.floor(block / trait.needPoint));
}

export function recommendAllocation(traits: MasteryTrait[], current: Allocation, options: RecommendOptions): Recommendation {
  const { evaluate, userLevel, totalPoints, blockSizes = DEFAULT_BLOCK_SIZES, shouldStop, onProgress, comboFamily } = options;
  let evaluations = options.evaluationsBefore ?? 0;
  const measure = (allocation: Allocation): number => {
    evaluations += 1;
    return evaluate(allocation);
  };
  let allocation = { ...current };
  let best = measure(allocation);
  const baseEfficiency = options.baseEfficiency ?? best;
  let stopped = false;

  for (const block of blockSizes) {
    let comboAttempts = 0;
    for (let pass = 0; pass < MAX_PASSES_PER_BLOCK; pass += 1) {
      if (shouldStop?.()) {
        stopped = true;
        break;
      }
      onProgress?.({ block, pass, efficiency: best, evaluations, allocation });
      const free = totalPoints - usedPoints(traits, allocation);

      // 넣을 곳: 열려 있고 아직 최대가 아닌 특성에 묶음만큼 더했을 때 포인트당 증가
      const adds: AddCandidate[] = [];
      for (const trait of traits) {
        const level = levelOf(allocation, trait);
        if (level >= trait.maxLevel || !isUnlocked(traits, trait, allocation, userLevel)) continue;
        const added = Math.min(levelsFor(trait, block), trait.maxLevel - level);
        const gain = measure(withLevel(allocation, trait.rNo, level + added)) - best;
        if (gain > IMPROVEMENT_EPSILON) adds.push({ trait, rate: gain / (added * trait.needPoint) });
      }
      adds.sort((left, right) => right.rate - left.rate);

      // 뺄 곳: 안 쓴 포인트 (공짜) 와, 찍은 특성에서 묶음만큼 뺐을 때 포인트당 감소
      const removes: RemoveCandidate[] = free > 0 ? [{ trait: null, rate: 0, points: free }] : [];
      for (const trait of traits) {
        const level = levelOf(allocation, trait);
        if (level <= 0) continue;
        const removed = Math.min(levelsFor(trait, block), level);
        const reduced = withLevel(allocation, trait.rNo, level - removed);
        // 빼면 규칙이 깨지는 특성 (뒤 단계의 앞 단계 조건 등) 은 후보가 아니다 — 후보 수를 헛되이 차지하지 않게 미리 거른다
        if (validateAllocation(traits, reduced, userLevel, totalPoints).length > 0) continue;
        const loss = best - measure(reduced);
        removes.push({ trait, rate: Math.max(loss, 0) / (removed * trait.needPoint), points: removed * trait.needPoint });
      }
      removes.sort((left, right) => left.rate - right.rate || right.points - left.points);

      let improved = false;
      search: for (const add of adds.slice(0, TOP_CANDIDATES)) {
        // 넣을 특성을 한 레벨이라도 사려면 빼서 확보하는 포인트 (+ 안 쓴 포인트) 가 그 비용 이상이어야 한다.
        // 비용을 못 대는 후보가 상위 자리를 차지해 대는 후보가 시도조차 안 되는 일이 없도록 먼저 거른다
        const affordable = removes.filter((remove) => (remove.trait ? remove.points + free : remove.points) >= add.trait.needPoint);
        for (const remove of affordable.slice(0, TOP_CANDIDATES)) {
          if (remove.trait?.rNo === add.trait.rNo || add.rate <= remove.rate) continue;
          const trial = transfer(traits, allocation, add.trait, remove.trait, block, free);
          if (!trial || validateAllocation(traits, trial, userLevel, totalPoints).length > 0) continue;
          const value = measure(trial);
          if (value > best + IMPROVEMENT_EPSILON) {
            allocation = trial;
            best = value;
            improved = true;
            break search;
          }
        }
      }
      // 일반 이동이 하나도 안 오르면: 확률 문턱 (100% 미만은 효과 0) 때문에 하나씩 올려서는 안 보이는 쌍을 동시에 올려 본다
      if (!improved && comboFamily && comboAttempts < MAX_COMBO_ATTEMPTS_PER_BLOCK) {
        comboAttempts += 1;
        const combo = bestPairMove(traits, allocation, comboFamily, removes, block, free, userLevel, totalPoints, measure, best);
        if (combo) {
          allocation = combo.allocation;
          best = combo.value;
          improved = true;
        }
      }
      if (!improved) break;
    }
    if (stopped) break;
  }
  return { allocation, baseEfficiency, efficiency: best, evaluations, stopped };
}

/**
 * 같은 확률 묶음의 특성 둘을 동시에 최대 레벨까지 올린 배분 중 가장 효율이 높은 것 (best 보다 오르는 것만, 없으면 null).
 * 포인트는 안 쓴 포인트 + removes (효율 손실이 작은 순) 에서 댄다
 */
function bestPairMove(
  traits: MasteryTrait[],
  allocation: Allocation,
  comboFamily: (trait: MasteryTrait) => string | null,
  removes: RemoveCandidate[],
  block: number,
  free: number,
  userLevel: number,
  totalPoints: number,
  measure: (allocation: Allocation) => number,
  best: number,
): { allocation: Allocation; value: number } | null {
  const open = traits.filter((trait) => levelOf(allocation, trait) < trait.maxLevel && comboFamily(trait) !== null);
  let found: { allocation: Allocation; value: number } | null = null;
  let foundValue = best + IMPROVEMENT_EPSILON;
  for (let first = 0; first < open.length; first += 1) {
    for (let second = first + 1; second < open.length; second += 1) {
      if (comboFamily(open[first]) !== comboFamily(open[second])) continue;
      const trial = fundedAdd(traits, allocation, [open[first], open[second]], removes, block, free);
      if (!trial || validateAllocation(traits, trial, userLevel, totalPoints).length > 0) continue;
      const value = measure(trial);
      if (value > foundValue) {
        found = { allocation: trial, value };
        foundValue = value;
      }
    }
  }
  return found;
}

/**
 * add 의 특성들을 최대 레벨까지 올린 배분. 필요한 포인트는 안 쓴 포인트로 대고, 모자라면 removes 를 앞에서부터
 * 묶음만큼씩 (한 특성에서 다 빼질 때까지 되풀이해서) 빼서 댄다. 대지 못하거나 예산을 넘으면 null
 */
function fundedAdd(
  traits: MasteryTrait[],
  allocation: Allocation,
  add: MasteryTrait[],
  removes: RemoveCandidate[],
  block: number,
  free: number,
): Allocation | null {
  const cost = add.reduce((sum, trait) => sum + (trait.maxLevel - levelOf(allocation, trait)) * trait.needPoint, 0);
  const adding = new Set(add.map((trait) => trait.rNo));
  let next = allocation;
  let budget = free;
  for (const remove of removes) {
    const trait = remove.trait;
    if (!trait || adding.has(trait.rNo)) continue;
    while (budget < cost) {
      const removed = Math.min(levelsFor(trait, block), levelOf(next, trait));
      if (removed <= 0) break;
      next = withLevel(next, trait.rNo, levelOf(next, trait) - removed);
      budget += removed * trait.needPoint;
    }
    if (budget >= cost) break;
  }
  if (budget < cost) return null;
  for (const trait of add) next = withLevel(next, trait.rNo, trait.maxLevel);
  return usedPoints(traits, next) <= usedPoints(traits, allocation) + free ? next : null;
}

/** remove 에서 묶음만큼 (remove 가 안 쓴 포인트면 그 전부) 빼서 add 에 넣은 배분. 넣을 레벨이 0 이면 null */
function transfer(
  traits: MasteryTrait[],
  allocation: Allocation,
  add: MasteryTrait,
  remove: MasteryTrait | null,
  block: number,
  free: number,
): Allocation | null {
  let next = allocation;
  let budget = free;
  if (remove) {
    const removed = Math.min(levelsFor(remove, block), levelOf(allocation, remove));
    next = withLevel(next, remove.rNo, levelOf(allocation, remove) - removed);
    budget += removed * remove.needPoint;
  }
  const level = levelOf(next, add);
  const added = Math.min(Math.floor(budget / add.needPoint), add.maxLevel - level);
  if (added <= 0) return null;
  next = withLevel(next, add.rNo, level + added);
  // 넣은 뒤에도 예산을 넘지 않는다 (예산 = 안 쓴 포인트 + 뺀 포인트)
  return usedPoints(traits, next) <= usedPoints(traits, allocation) + free ? next : null;
}
