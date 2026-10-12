import { useTranslation } from 'react-i18next';
import { Group, NumberInput, Stack, Text } from '@mantine/core';
import { CONSTS } from '../../CONSTS';
import { formatLog } from '../gameNumber';
import { MINE_AWAKEN_LEVEL_FIELD, MINE_LEVEL_FIELD, mineMultiplier } from '../sources/heroWeaponCardPet/mine';
import type { TabPanelProps } from '../types';

const { MIN_NUMBER } = CONSTS.heroWeaponCardPet;
const { PERCENT_LOG } = CONSTS.heroWeaponCardPet.mine;
const LEVEL_FIELDS = [
  { id: MINE_LEVEL_FIELD, labelKey: 'calc.mine.level' },
  { id: MINE_AWAKEN_LEVEL_FIELD, labelKey: 'calc.mine.awakenLevel' },
];

/** 광산: 광산 주인 창의 투자 레벨 · 모든 광부 각성 레벨 총합 → 광산 주인의 축복 (공격력·체력 증가, 화면 값과 같은 꼴) */
export default function MinePanel({ values, setValue }: TabPanelProps) {
  const { t: translate } = useTranslation();
  const multiplier = mineMultiplier(values);
  const blessing = multiplier !== null && multiplier > 1 ? formatLog(Math.log10(multiplier - 1) + PERCENT_LOG) : null;
  return (
    <Stack gap="xs">
      <Group gap="sm" align="flex-end">
        {LEVEL_FIELDS.map((field) => (
          <NumberInput
            key={field.id}
            label={translate(field.labelKey)}
            hideControls
            min={MIN_NUMBER}
            allowNegative={false}
            allowDecimal={false}
            value={values[field.id] ?? ''}
            onChange={(next) => setValue(field.id, String(next))}
          />
        ))}
      </Group>
      <Text size="sm">
        {translate('calc.mine.blessing', { value: blessing ?? '-' })}
      </Text>
    </Stack>
  );
}
