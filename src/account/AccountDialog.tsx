import { useTranslation } from 'react-i18next';
import { Button, Modal, SimpleGrid, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { CONSTS } from '../CONSTS';
import { FlagField, NumberField, SelectField } from '../components/StoreFields';
import { RESOURCES } from '../hunting/huntingCalc';
import { useCalcStore } from '../store/useCalcStore';
import { readNumber } from '../store/storedValues';
import { ACCOUNT_KEYS } from './accountKeys';

const GUILD_LEVEL_OPTIONS = Array.from({ length: CONSTS.guild.SKILL_MAX_LEVEL + 1 }, (_, level) => ({
  value: String(level),
  label: String(level),
}));
const FIRST_SKILL_UNLOCK = Math.min(...CONSTS.guild.SKILLS.map((skill) => skill.unlock));

/** 여러 페이지가 같이 쓰는 계정 값 (VIP·길드·요정)을 한 곳에서 입력하는 창 */
export default function AccountDialog() {
  const { t: translate } = useTranslation();
  const [opened, { open, close }] = useDisclosure(false);
  const guildLevel = useCalcStore((state) => readNumber(state.values, ACCOUNT_KEYS.guildLevel));
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
              <FlagField storeKey={ACCOUNT_KEYS.fairyOn} label={translate('account.fairyOn')} defaultChecked />
            </Stack>
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
