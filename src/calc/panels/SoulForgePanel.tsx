import { useTranslation } from 'react-i18next';
import { Group, NumberInput, Text } from '@mantine/core';
import { CONSTS } from '../../CONSTS';
import { SOUL_FORGE_FIELD, maxSoulForgeLevel } from '../sources/heroWeaponCardPet/weapon';
import type { TabPanelProps } from '../types';

const { MIN_NUMBER } = CONSTS.heroWeaponCardPet;

/** 소울포지: 레벨 하나 (그 레벨 이하 행의 효과를 전부 넣는다) */
export default function SoulForgePanel({ values, setValue, tables }: TabPanelProps) {
  const { t: translate } = useTranslation();
  const maxLevel = maxSoulForgeLevel(tables);
  return (
    <Group gap="xs" align="flex-end">
      <NumberInput
        label={translate('calc.soulForge.level')}
        hideControls
        min={MIN_NUMBER}
        max={maxLevel}
        allowNegative={false}
        allowDecimal={false}
        value={values[SOUL_FORGE_FIELD] ?? ''}
        onChange={(next) => setValue(SOUL_FORGE_FIELD, String(next))}
      />
      <Text size="sm" c="dimmed" pb={6}>
        / {maxLevel}
      </Text>
    </Group>
  );
}
