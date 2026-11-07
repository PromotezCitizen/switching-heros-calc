import { useTranslation } from 'react-i18next';
import { NumberInput, Stack, Text } from '@mantine/core';
import { CONSTS } from '@/CONSTS';
import { formatLog } from '@/calc/gameNumber';
import { MINE_LEVEL_FIELD, mineAwakenTotal, mineMultiplier } from '@/calc/sources/heroWeaponCardPet/mine';
import type { TabPanelProps } from '@/calc/types';

const { MIN_NUMBER } = CONSTS.heroWeaponCardPet;
const { PERCENT_LOG, LEVEL_INPUT_WIDTH } = CONSTS.heroWeaponCardPet.mine;
/**
 * 광산: 광산 주인 창의 투자 레벨 → 광산 주인의 축복 (공격력·체력 증가, 화면 값과 같은 꼴).
 * 모든 광부 각성 레벨 총합은 히어로 탭 각성 레벨 합으로 계산해 보여 주기만 한다 (입력 칸 없음)
 */
export default function MinePanel({ values, setValue }: TabPanelProps) {
  const { t: translate } = useTranslation();
  const multiplier = mineMultiplier(values);
  const blessing = multiplier !== null && multiplier > 1 ? formatLog(Math.log10(multiplier - 1) + PERCENT_LOG) : null;
  return (
    <Stack gap="xs">
      <NumberInput
        w={LEVEL_INPUT_WIDTH}
        label={translate('calc.mine.level')}
        hideControls
        min={MIN_NUMBER}
        allowNegative={false}
        allowDecimal={false}
        value={values[MINE_LEVEL_FIELD] ?? ''}
        onChange={(next) => setValue(MINE_LEVEL_FIELD, String(next))}
      />
      <Text size="sm">{translate('calc.mine.awakenTotal', { total: mineAwakenTotal(values) })}</Text>
      <Text size="sm">
        {translate('calc.mine.blessing', { value: blessing ?? '-' })}
      </Text>
    </Stack>
  );
}
