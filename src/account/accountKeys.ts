import { readNumber } from '@/store/storedValues';
import { CONSTS } from '@/CONSTS';
import { RESOURCES, type Resource } from '@/hunting/huntingCalc';

/** 계정 공통 입력의 저장소 칸 이름 (여러 페이지가 같은 값을 읽는다) */
export const ACCOUNT_KEYS = {
  vipLevel: 'account.vipLevel',
  guildLevel: 'account.guildLevel',
  fairyLevel: 'account.fairyLevel',
  /** 요정의 축복 켜짐 — 스탯 계산기의 공격력·체력 줄용 ('true' / 'false', 저장된 값이 없으면 켜짐) */
  fairyOn: 'account.fairyOn',
  /** 광고 제거 구매 ('true' 만 켜짐, 저장된 값이 없으면 꺼짐). 요정의 축복이 경험치·골드 둘 다 상시 켜짐 */
  adRemoved: 'account.adRemoved',
  /** 사냥 보상용 요정의 축복 켜짐, 자원별 ('true' 만 켜짐, 저장된 값이 없으면 꺼짐). 정수는 요정 값이 없어 칸이 없음 */
  huntingFairyOn: (resource: Resource) => `account.huntingFairyOn.${resource}`,
  guildSkill: (resource: Resource, index: number) => `account.guild.${resource}.${index}`,
} as const;

export interface AccountInputs {
  vipLevel: number;
  guildLevel: number;
  fairyLevel: number;
  fairyOn: boolean;
  adRemoved: boolean;
  huntingFairyOn: Record<Resource, boolean>;
  guildSkillLevels: Record<Resource, number[]>;
}

export function readAccountInputs(values: Record<string, string>): AccountInputs {
  return {
    vipLevel: readNumber(values, ACCOUNT_KEYS.vipLevel),
    guildLevel: readNumber(values, ACCOUNT_KEYS.guildLevel),
    fairyLevel: readNumber(values, ACCOUNT_KEYS.fairyLevel),
    fairyOn: values[ACCOUNT_KEYS.fairyOn] !== 'false',
    adRemoved: values[ACCOUNT_KEYS.adRemoved] === 'true',
    huntingFairyOn: Object.fromEntries(
      RESOURCES.map((resource) => [resource, values[ACCOUNT_KEYS.huntingFairyOn(resource)] === 'true']),
    ) as Record<Resource, boolean>,
    guildSkillLevels: Object.fromEntries(
      RESOURCES.map((resource) => [
        resource,
        CONSTS.guild.SKILLS.map((_, index) => readNumber(values, ACCOUNT_KEYS.guildSkill(resource, index))),
      ]),
    ) as Record<Resource, number[]>,
  };
}
