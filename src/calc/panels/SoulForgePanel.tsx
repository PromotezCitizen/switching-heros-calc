import { useTranslation } from 'react-i18next';
import { Group, NumberInput, Stack, Text } from '@mantine/core';
import { CONSTS } from '../../CONSTS';
import { FlagField } from '../../components/StoreFields';
import {
  SOUL_FORGE_FIELD,
  maxSoulForgeLevel,
  soulForgeLevelRows,
  soulForgeSlotField,
} from '../sources/heroWeaponCardPet/weapon';
import { numberValue } from '../sources/heroWeaponCardPet/shared';
import { statDescription } from '../statText';
import { CALC_KEY_PREFIX } from '../storeKeys';
import type { TabPanelProps } from '../types';

const { MIN_NUMBER } = CONSTS.heroWeaponCardPet;
const PLACEHOLDER = '{0}';
const PLACEHOLDER_SHOWN = 'N';

/**
 * 소울포지: 레벨 하나 + 현재 레벨의 슬롯 켜짐 (게임 m6913: 낮은 레벨은 슬롯 상관없이 전부, 현재 레벨은 켜진 슬롯만).
 * 슬롯 칸은 처음 꺼짐 (비어 있음)
 */
export default function SoulForgePanel({ values, setValue, tables, descriptions }: TabPanelProps) {
  const { t: translate } = useTranslation();
  const maxLevel = maxSoulForgeLevel(tables);
  const level = numberValue(values, SOUL_FORGE_FIELD);
  const slotRows = soulForgeLevelRows(tables, level).slice(1);
  return (
    <Stack gap="xs">
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
      {slotRows.length > 0 && (
        <>
          <Text size="sm" c="dimmed">
            {translate('calc.soulForge.slotHelp', { level })}
          </Text>
          {slotRows.map((row) => (
            <FlagField
              key={row.statIdx}
              storeKey={CALC_KEY_PREFIX + soulForgeSlotField(row.statIdx)}
              label={translate('calc.soulForge.slotLabel', {
                index: row.statIdx,
                effect: statDescription(descriptions, row.statType).replace(PLACEHOLDER, PLACEHOLDER_SHOWN),
              })}
            />
          ))}
        </>
      )}
    </Stack>
  );
}
