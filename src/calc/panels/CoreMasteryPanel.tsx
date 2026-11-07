import { useTranslation } from 'react-i18next';
import { Group, NumberInput, Stack, Text } from '@mantine/core';
import AutoGrid from '@/components/AutoGrid';
import { CONSTS } from '@/CONSTS';
import { FlagField } from '@/components/StoreFields';
import {
  CORE_MASTERY_SLOT_NUMBERS,
  coreMasteryLevel,
  coreMasteryRow,
  coreMasterySelectField,
  coreMasterySlot,
  maxCoreMasteryLevel,
} from '@/calc/sources/providers/coreMastery';
import { statDescription } from '@/calc/statText';
import { CALC_KEY_PREFIX } from '@/calc/storeKeys';
import type { TabPanelProps } from '@/calc/types';
import { ACCOUNT_KEYS } from '@/account/accountKeys';
import { readNumber } from '@/store/storedValues';
import { useCalcStore } from '@/store/useCalcStore';

const { LEVEL_FIELD, LEVEL_INPUT_WIDTH, SELECT_MIN_WIDTH } = CONSTS.providers.coreMastery;
const PLACEHOLDER = '{0}';
const PLACEHOLDER_SHOWN = 'N';

/** 코어 특성: 레벨 하나 + 켠 항목 (1 ~ 13번, 그 레벨 행의 스탯). 처음은 레벨 비어 있음 · 항목 꺼짐 */
export default function CoreMasteryPanel({ values, setValue, tables, descriptions }: TabPanelProps) {
  const { t: translate } = useTranslation();
  // 유저 레벨 해금 (ContentsUnlock 98행): 안 열렸으면 언제 열리는지만
  const userLevel = useCalcStore((state) => readNumber(state.values, ACCOUNT_KEYS.userLevel));
  const unlockLevel = CONSTS.providers.coreMastery.UNLOCK_USER_LEVEL;
  const maxLevel = maxCoreMasteryLevel(tables);
  const level = coreMasteryLevel(values);
  const row = coreMasteryRow(tables, level);
  if (userLevel < unlockLevel) {
    return (
      <Text size="sm" c="dimmed">
        {translate('calc.coreMastery.locked', { level: unlockLevel.toLocaleString('ko-KR'), current: userLevel.toLocaleString('ko-KR') })}
      </Text>
    );
  }
  return (
    <Stack gap="xs">
      <Group gap="xs" align="flex-end">
        <NumberInput
          label={translate('calc.coreMastery.level')}
          w={LEVEL_INPUT_WIDTH}
          hideControls
          min={0}
          max={maxLevel}
          allowNegative={false}
          allowDecimal={false}
          value={values[LEVEL_FIELD] ?? ''}
          onChange={(next) => setValue(LEVEL_FIELD, String(next))}
        />
        <Text size="sm" c="dimmed" pb={6}>
          / {maxLevel}
        </Text>
      </Group>
      <Text size="sm" c="dimmed">
        {translate('calc.coreMastery.help')}
      </Text>
      {row && (
        <AutoGrid minItemWidth={SELECT_MIN_WIDTH}>
          {CORE_MASTERY_SLOT_NUMBERS.map((slot) => {
            const item = coreMasterySlot(row, slot);
            if (!item) return null;
            const effect = statDescription(descriptions, item.stat).replace(PLACEHOLDER, PLACEHOLDER_SHOWN);
            return (
              <FlagField
                key={slot}
                storeKey={CALC_KEY_PREFIX + coreMasterySelectField(slot)}
                label={translate('calc.coreMastery.slotLabel', { slot, effect, value: item.value })}
              />
            );
          })}
        </AutoGrid>
      )}
    </Stack>
  );
}
