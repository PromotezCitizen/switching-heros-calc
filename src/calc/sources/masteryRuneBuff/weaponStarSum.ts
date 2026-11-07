/** 두 히어로 (1 · 2슬롯) 가 장착한 전용 무기의 초월 ★ 합: 얼티밋 "_per_스탯_EqOver20Sum / 30Sum" (특성 3002 · 3008) 의 조건 값 */
import { CONSTS } from '@/CONSTS';
import { slotHeroName } from '@/calc/sources/hero/character';
import { ownedExclusiveStar } from '@/calc/sources/hero/roster';
import { heroByName } from '@/calc/sources/heroWeaponCardPet/shared';
import type { CalcValues } from '@/calc/types';
import type { StatTables } from '@/data/statTables';

const { HERO_FIELDS } = CONSTS.masteryRuneBuff;

/** 두 히어로의 전용 무기 ★ (보유한 전용 무기는 늘 낀 것으로 봄) 를 더한다. 비었거나 표에 없으면 0 */
export function equippedWeaponStarSum(values: CalcValues, tables: StatTables): number {
  return HERO_FIELDS.reduce((sum, field) => {
    const hero = heroByName(tables, slotHeroName(values, tables, field));
    return sum + (hero ? Number(ownedExclusiveStar(values, tables, hero.charId)) || 0 : 0);
  }, 0);
}
