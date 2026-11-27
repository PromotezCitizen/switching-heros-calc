import { useTranslation } from 'react-i18next';
import { NumberInput, Stack, Text } from '@mantine/core';
import { CONSTS } from '@/CONSTS';
import { formatLog } from '@/calc/gameNumber';
import { coinPowerMaxLevel, coinPowerRow, tableValueLog } from '@/calc/sources/providers/coinPower';
import type { TabPanelProps } from '@/calc/types';

const { LEVEL_FIELD, LEVEL_INPUT_WIDTH, STAT_PAIRS } = CONSTS.providers.coinPower;
const [[, ATTACK_COLUMN], [, HP_COLUMN]] = STAT_PAIRS;
const MIN_LEVEL = 0;

/** 코인 파워: 코인 레벨 → 공격력, 체력 증가 (코인 파워 화면 값과 같은 꼴) */
export default function CoinPowerPanel({ values, setValue, tables }: TabPanelProps) {
  const { t: translate } = useTranslation();
  const row = coinPowerRow(values, tables);
  const shown = (column: string) => (row ? formatLog(tableValueLog(row[column])) : '-');
  return (
    <Stack gap="xs">
      <Text size="sm">{translate('calc.coinPower.help')}</Text>
      <NumberInput
        w={LEVEL_INPUT_WIDTH}
        label={translate('calc.coinPower.level')}
        hideControls
        min={MIN_LEVEL}
        max={coinPowerMaxLevel(tables)}
        clampBehavior="strict"
        allowNegative={false}
        allowDecimal={false}
        value={values[LEVEL_FIELD] ?? ''}
        onChange={(next) => setValue(LEVEL_FIELD, String(next))}
      />
      <Text size="sm">{translate('calc.coinPower.attack', { value: shown(ATTACK_COLUMN) })}</Text>
      <Text size="sm">{translate('calc.coinPower.hp', { value: shown(HP_COLUMN) })}</Text>
    </Stack>
  );
}
