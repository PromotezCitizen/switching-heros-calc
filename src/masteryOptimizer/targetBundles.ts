/**
 * 추천을 같이 계산하는 최적화 대상 (consts/dpm.ts TARGET_BUNDLES): 게임 조건 (적 수 · 처치 · 체력 무한 여부) 이 같아
 * 특성 · 카드 효과가 같은 대상끼리 묶고, 묶음에서 앞에 있는 대상 하나로 계산해 그 결과를 같이 쓴다.
 * 콘텐츠 프리셋은 보지 않는다 (프리셋은 사람마다 지금 고른 구성일 뿐이라 묶음 기준이 아님).
 * 계산에 쓰는 입력값은 묶음 앞 대상의 프리셋 값이다
 */
import { CONSTS } from '@/CONSTS';
import type { DamageTarget } from '@/dpm/targetDamage';

const { TARGET_BUNDLES, MASTERY_BUNDLES } = CONSTS.dpm;

/** 묶음에서 앞에 있는 대상 (묶음이 없으면 자기 자신) */
function firstOfBundle(bundles: readonly (readonly string[])[], target: DamageTarget): DamageTarget {
  const bundle = bundles.find((members) => members.includes(target));
  return (bundle?.[0] as DamageTarget | undefined) ?? target;
}

/** 이 대상 대신 계산하는 대상 (카드 추천 · 버튼, TARGET_BUNDLES) */
export function bundleTarget(target: DamageTarget): DamageTarget {
  return firstOfBundle(TARGET_BUNDLES, target);
}

/** 특성 추천을 대신 계산하는 대상 (MASTERY_BUNDLES: 보스끼리 · 히어로끼리 하나, 카드보다 크게 묶음) */
export function masteryBundleTarget(target: DamageTarget): DamageTarget {
  return firstOfBundle(MASTERY_BUNDLES, target);
}
