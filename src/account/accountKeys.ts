import { readNumber } from '../store/storedValues';
import { CONSTS } from '../CONSTS';
import { RESOURCES, type Resource } from '../hunting/huntingCalc';

/** 계정 공통 입력의 저장소 칸 이름 (여러 페이지가 같은 값을 읽는다) */
export const ACCOUNT_KEYS = {
  vipLevel: 'account.vipLevel',
  guildLevel: 'account.guildLevel',
  fairyLevel: 'account.fairyLevel',
  /** 요정의 축복 켜짐 ('true' / 'false', 저장된 값이 없으면 켜짐) */
  fairyOn: 'account.fairyOn',
  guildSkill: (resource: Resource, index: number) => `account.guild.${resource}.${index}`,
} as const;

export interface AccountInputs {
  vipLevel: number;
  guildLevel: number;
  fairyLevel: number;
  fairyOn: boolean;
  guildSkillLevels: Record<Resource, number[]>;
}

export function readAccountInputs(values: Record<string, string>): AccountInputs {
  return {
    vipLevel: readNumber(values, ACCOUNT_KEYS.vipLevel),
    guildLevel: readNumber(values, ACCOUNT_KEYS.guildLevel),
    fairyLevel: readNumber(values, ACCOUNT_KEYS.fairyLevel),
    fairyOn: values[ACCOUNT_KEYS.fairyOn] !== 'false',
    guildSkillLevels: Object.fromEntries(
      RESOURCES.map((resource) => [
        resource,
        CONSTS.guild.SKILLS.map((_, index) => readNumber(values, ACCOUNT_KEYS.guildSkill(resource, index))),
      ]),
    ) as Record<Resource, number[]>,
  };
}
