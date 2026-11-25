/** 추천 배분 계산 작업자: 오래 걸리는 계산을 화면과 따로 돌린다. 진행 상황을 메시지로 보내고, 끝나면 결과를 보낸다 */
import '@/masteryOptimizer/workerShim';
import '@/i18n';
import { masteryTraits } from '@/calc/sources/masteryRuneBuff/mastery';
import { valuesWithLoadout } from '@/cardOptimizer/loadout';
import { totalMasteryPoints } from '@/masteryOptimizer/budget';
import { comboFamilyOf } from '@/masteryOptimizer/comboFamily';
import {
  allocationFromValues,
  evaluateOneCastEach,
  makeChanceGuard,
  makeJumpLevels,
  unreachableChanceTraits,
} from '@/masteryOptimizer/evaluate';
import { CONSTS } from '@/CONSTS';
import { recommendAllocation } from '@/masteryOptimizer/recommend';
import type { RecommendMessage, RecommendRequest } from '@/masteryOptimizer/recommendWorkerTypes';
import { buildStartAllocation } from '@/masteryOptimizer/startAllocation';
import { isUnlocked, validateAllocation } from '@/masteryOptimizer/rules';
import { traitPolicyFor } from '@/masteryOptimizer/traitPolicy';
import {
  equippedPetCounts,
  equippedPetIds,
  formationHeroAttributes,
  formationHeroGenders,
  formationHeroTargetUnits,
} from '@/calc/sources/masteryRuneBuff/ultimate';

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
    // 비교 값은 공격마다 한 번씩 대미지 합 (쿨타임 · 시간은 보지 않음), 고정 · 무시 규칙은 대상 종류를 따른다
    const evaluate = (allocation: Record<string, number>) =>
      evaluateOneCastEach(noCardValues, traits, tables, allocation, inputs.target, inputs.damage);
    const basePolicy = traitPolicyFor(inputs.target, traits, {
      attributes: formationHeroAttributes(noCardValues, tables),
      genders: formationHeroGenders(noCardValues, tables),
      targetUnits: formationHeroTargetUnits(noCardValues, tables),
      petCounts: equippedPetCounts(equippedPetIds(noCardValues), tables.Pet),
    });
    // 지금 프리셋은 비교 기준이자 두 번째 출발점이다
    const current = allocationFromValues(noCardValues, traits);
    // 최대로 찍어도 100% 에 닿지 않는 확률의 특성은 먼저 찍지 않는다 (예: 매직 가드 50%). 계정 배분 위에 확률 특성만 최대로 올려 잰다
    const chanceFirst = basePolicy.chanceFirst ?? new Set<string>();
    const unreachable = unreachableChanceTraits(
      noCardValues,
      traits,
      tables,
      inputs.target,
      inputs.damage,
      chanceFirst,
      current,
    );
    const policy = { ...basePolicy, chanceFirst: new Set([...chanceFirst].filter((rNo) => !unreachable.has(rNo))) };
    const totalPoints = totalMasteryPoints(tables, inputs.userLevel, inputs.vipLevel);
    // 확률 바닥: 100% 이상이던 확률, 켜진 얼티밋이 넘고 있던 문턱 아래로 내리지 않는다
    const chanceGuard = makeChanceGuard(noCardValues, traits, tables, inputs.target, inputs.damage);
    // 확률 특성을 다음 계단 (10% 단위, 120 · 150 · 200) 까지 한 번에 올리는 레벨 수
    const jumpLevels = makeJumpLevels(noCardValues, traits, tables, inputs.target, inputs.damage);
    // 탐색 끝에 다시 켜 볼 얼티밋: 확률 관련 (80% · 120% 초과 개수, 150% · 200% 문턱)
    const { CHANCE_ULTIMATES, CHANCE_COUNT_ULTIMATES } = CONSTS.masteryRuneBuff;
    const retryUltimates = new Set(
      traits
        .filter(
          (trait) =>
            trait.ultimate &&
            (CHANCE_ULTIMATES[trait.statName] || CHANCE_COUNT_ULTIMATES[trait.statName] !== undefined),
        )
        .map((trait) => trait.rNo),
    );
    const baseEfficiency = evaluate(current);
    scope.postMessage({ type: 'base', efficiency: baseEfficiency });
    const start = buildStartAllocation(traits, {
      evaluate,
      userLevel: inputs.userLevel,
      totalPoints,
      policy,
      rankFrom: current,
      onProgress: (progress) => scope.postMessage({ type: 'progress', progress: { block: 0, pass: 0, ...progress } }),
    });
    const search = (from: Record<string, number>, evaluationsBefore: number) =>
      recommendAllocation(traits, from, {
        evaluate,
        userLevel: inputs.userLevel,
        totalPoints,
        baseEfficiency,
        evaluationsBefore,
        comboFamily: comboFamilyOf,
        policy,
        chanceGuard,
        retryUltimates,
        jumpLevels,
        onProgress: (progress) => scope.postMessage({ type: 'progress', progress }),
      });
    const fromEmpty = search(start.allocation, start.evaluations);
    // 지금 배분에서도 한 번 더 찾는다 (고정 특성은 최대로 채워서). 규칙에 맞지 않으면 건너뛴다
    let result = fromEmpty;
    const seeded = { ...current };
    for (const trait of traits) {
      if (policy.fixed.has(trait.rNo) && isUnlocked(traits, trait, seeded, inputs.userLevel))
        seeded[trait.rNo] = trait.maxLevel;
    }
    if (!fromEmpty.stopped && validateAllocation(traits, seeded, inputs.userLevel, totalPoints).length === 0) {
      const fromCurrent = search(seeded, fromEmpty.evaluations);
      result =
        fromCurrent.efficiency > fromEmpty.efficiency
          ? { ...fromCurrent, baseEfficiency }
          : { ...fromEmpty, evaluations: fromCurrent.evaluations, stopped: fromCurrent.stopped };
    }
    scope.postMessage({ type: 'done', result });
  } catch (error) {
    scope.postMessage({ type: 'failed', message: String(error) });
  }
};
