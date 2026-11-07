/** 특성 → 확률 묶음 (추천이 같은 묶음의 특성 둘을 동시에 올려 볼 때 쓴다, consts COMBO_FAMILIES) */
import { CONSTS } from '@/CONSTS';
import type { MasteryTrait } from '@/calc/sources/masteryRuneBuff/mastery';

const { COMBO_FAMILIES } = CONSTS.masteryRuneBuff;

/** 일반 특성의 statName 에 확률 이름이 들어 있으면 그 이름, 아니면 null. 얼티밋은 5000 포인트 단위라 쌍으로 찾지 않는다 */
export function comboFamilyOf(trait: MasteryTrait): string | null {
  if (trait.ultimate) return null;
  const name = trait.statName.toLowerCase();
  return COMBO_FAMILIES.find((family) => name.includes(family.toLowerCase())) ?? null;
}
