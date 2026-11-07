import { useTranslation } from 'react-i18next';
import { Button, Checkbox, Modal, SimpleGrid, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { CONSTS } from '@/CONSTS';
import { FlagField, NumberField, SelectField } from '@/components/StoreFields';
import { RESOURCES } from '@/hunting/huntingCalc';
import { useCalcStore } from '@/store/useCalcStore';
import { readNumber } from '@/store/storedValues';
import { ACCOUNT_KEYS } from '@/account/accountKeys';
import BattleBuffFields from '@/account/BattleBuffFields';

const GUILD_LEVEL_OPTIONS = Array.from({ length: CONSTS.guild.SKILL_MAX_LEVEL + 1 }, (_, level) => ({
  value: String(level),
  label: String(level),
}));
/** 요정의 축복 값이 있는 자원 (정수는 요정 값이 없음) */
const HUNTING_FAIRY_RESOURCES = RESOURCES.filter((resource) => resource !== 'ess');
const FIRST_SKILL_UNLOCK = Math.min(...CONSTS.guild.SKILLS.map((skill) => skill.unlock));

/**
 * 요정의 축복 켬 칸: 광고 제거를 샀으면 늘 켜짐 (켜진 채 잠금), 안 샀으면 직접 켜야만 켜짐 (처음 꺼짐)
 * (사용자 지시 2026-11-07 "광고 제거 샀으면 항상 켜지기, 안샀으면 선택해야만 켜기")
 */
function FairyFlag({ storeKey, label, adRemoved }: { storeKey: string; label: string; adRemoved: boolean }) {
  return adRemoved ? <Checkbox label={label} checked disabled readOnly /> : <FlagField storeKey={storeKey} label={label} />;
}

/** 여러 페이지가 같이 쓰는 계정 값 (VIP·길드·요정)을 한 곳에서 입력하는 창 */
export default function AccountDialog() {
  const { t: translate } = useTranslation();
  const [opened, { open, close }] = useDisclosure(false);
  const guildLevel = useCalcStore((state) => readNumber(state.values, ACCOUNT_KEYS.guildLevel));
  const adRemoved = useCalcStore((state) => state.values[ACCOUNT_KEYS.adRemoved] === 'true');
  const unlockedSkills = CONSTS.guild.SKILLS.map((skill, index) => ({ skill, index })).filter(
    ({ skill }) => guildLevel >= skill.unlock,
  );

  return (
    <>
      <Button variant="light" onClick={open}>
        {translate('account.open')}
      </Button>
      <Modal opened={opened} onClose={close} title={translate('account.title')} size="lg">
        <Stack>
          <Text size="xs" c="dimmed">
            {translate('account.description')}
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <NumberField storeKey={ACCOUNT_KEYS.vipLevel} label={translate('account.vipLevel')} />
            <NumberField storeKey={ACCOUNT_KEYS.guildLevel} label={translate('account.guildLevel')} />
            <Stack gap={4}>
              <NumberField storeKey={ACCOUNT_KEYS.fairyLevel} label={translate('account.fairyLevel')} />
              <FairyFlag storeKey={ACCOUNT_KEYS.fairyOn} label={translate('account.fairyOn')} adRemoved={adRemoved} />
            </Stack>
          </SimpleGrid>
          <Text fw={600} size="sm">
            {translate('account.battleBuff')}
          </Text>
          <BattleBuffFields />
          {/* 사냥 보상용 요정의 축복: 광고 제거면 경험치·골드 둘 다 상시 (스탯 축복도 상시), 아니면 칸마다 따로 켬 (정수는 요정 값 없음) */}
          <Text fw={600} size="sm">
            {translate('account.huntingFairy')}
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <FlagField storeKey={ACCOUNT_KEYS.adRemoved} label={translate('account.adRemoved')} hint={translate('account.adRemovedHint')} />
            {HUNTING_FAIRY_RESOURCES.map((resource) => (
              <FairyFlag
                key={resource}
                storeKey={ACCOUNT_KEYS.huntingFairyOn(resource)}
                label={translate('account.huntingFairyOn', { resource: translate(`hunting.resource.${resource}`) })}
                adRemoved={adRemoved}
              />
            ))}
          </SimpleGrid>
          <Text fw={600} size="sm">
            {translate('account.guildSkill')}
          </Text>
          {unlockedSkills.length === 0 ? (
            <Text size="xs" c="dimmed">
              {translate('account.guildSkillLocked', { level: FIRST_SKILL_UNLOCK })}
            </Text>
          ) : (
            <Stack gap="xs">
              <SimpleGrid cols={3}>
                {RESOURCES.map((resource) => (
                  <Text key={resource} size="xs" c="dimmed" ta="center">
                    {translate(`hunting.resource.${resource}`)}
                  </Text>
                ))}
              </SimpleGrid>
              {unlockedSkills.map(({ skill, index }) => (
                <Stack key={skill.unlock} gap={2}>
                  <Text size="xs">
                    {translate('account.guildSkillRow', { number: index + 1, percent: skill.perLevel })}
                  </Text>
                  <SimpleGrid cols={3}>
                    {RESOURCES.map((resource) => (
                      <SelectField
                        key={resource}
                        storeKey={ACCOUNT_KEYS.guildSkill(resource, index)}
                        label=""
                        options={GUILD_LEVEL_OPTIONS}
                      />
                    ))}
                  </SimpleGrid>
                </Stack>
              ))}
            </Stack>
          )}
        </Stack>
      </Modal>
    </>
  );
}
