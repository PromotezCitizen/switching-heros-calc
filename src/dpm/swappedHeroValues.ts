/** 1슬롯, 2슬롯 히어로를 서로 바꾼 입력값 (교체 대미지와 특성 툴팁이 같이 쓴다. 탭 목록을 부르지 않아 패널에서 불러도 고리가 없다) */
import { CONSTS } from '@/CONSTS';
import { SKILL_EQUIP_SLOT_NUMBERS, skillEquipField } from '@/calc/sources/skill/skill';
import type { CalcValues } from '@/calc/types';

const { SWAP } = CONSTS.dpm;
const [HERO_FIELD, SECOND_HERO_FIELD] = SWAP.HERO_FIELDS;
const [EQUIPPED_FIELD, SECOND_EQUIPPED_FIELD] = SWAP.EQUIPPED_FIELDS;
/** 1슬롯과 2슬롯 히어로 (이름 · 장착 스킬 · 전용 무기 장착) 를 서로 바꾼 입력값. 2슬롯 히어로가 없으면 null */
export function swappedHeroValues(values: CalcValues): CalcValues | null {
  if (!values[HERO_FIELD] || !values[SECOND_HERO_FIELD]) return null;
  const swapped: CalcValues = {
    ...values,
    [HERO_FIELD]: values[SECOND_HERO_FIELD],
    [SECOND_HERO_FIELD]: values[HERO_FIELD],
    [EQUIPPED_FIELD]: values[SECOND_EQUIPPED_FIELD] ?? '',
    [SECOND_EQUIPPED_FIELD]: values[EQUIPPED_FIELD] ?? '',
    [SWAP.SWAPPED_FIELD]: 'true',
  };
  const [firstSssField, secondSssField] = SWAP.SSS_OPTION_COUNT_FIELDS;
  swapped[firstSssField] = values[secondSssField] ?? '';
  swapped[secondSssField] = values[firstSssField] ?? '';
  const [firstMissionField, secondMissionField] = CONSTS.masteryRuneBuff.TRANS_MISSION_FIELDS;
  swapped[firstMissionField] = values[secondMissionField] ?? '';
  swapped[secondMissionField] = values[firstMissionField] ?? '';
  for (const slot of SKILL_EQUIP_SLOT_NUMBERS) {
    const first = skillEquipField(slot);
    const second = `${SWAP.SECOND_SKILL_EQUIP_PREFIX}${slot}`;
    swapped[first] = values[second] ?? '';
    swapped[second] = values[first] ?? '';
  }
  for (const [firstPrefix, secondPrefix] of SWAP.OPTION_FIELD_PAIRS) {
    for (let index = 1; index <= SWAP.OPTION_ROWS; index++) {
      const first = `${firstPrefix}${index}`;
      const second = `${secondPrefix}${index}`;
      swapped[first] = values[second] ?? '';
      swapped[second] = values[first] ?? '';
    }
  }
  return swapped;
}
