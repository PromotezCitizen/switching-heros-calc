/** 스킬 탭: 보유 스킬 레벨 · 1슬롯 히어로 장착 5칸 · 스킬 옵션 칸. 스킬 데미지가 최종 대미지에 들어가는 식을 몰라 줄은 만들지 않는다 (장착 레벨 합은 유물 연동에 씀).
 * 스킬 옵션 (다발 화살 252) 의 공격력 % 는 전투 중 중첩이라 버프 탭이 skillOptionLines 로 넣는다 */
import { CONSTS } from '@/CONSTS';
import SkillPanel from '@/calc/panels/SkillPanel';
import type { CalcTab } from '@/calc/types';

export const skillTab: CalcTab = {
  id: 'skill',
  tableNames: [CONSTS.skill.TABLE, CONSTS.hero.TABLES.CHARACTER],
  Panel: SkillPanel,
  lines: () => [],
};
