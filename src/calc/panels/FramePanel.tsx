import { useTranslation } from 'react-i18next';
import { Stack, Text } from '@mantine/core';
import AutoGrid from '@/components/AutoGrid';
import { CONSTS } from '@/CONSTS';
import { FlagField } from '@/components/StoreFields';
import { frameOwnedField, frameRows } from '@/calc/sources/providers/frame';
import { statDescription } from '@/calc/statText';
import { CALC_KEY_PREFIX } from '@/calc/storeKeys';
import type { TabPanelProps } from '@/calc/types';

const { ID_COLUMN, STAT_COLUMN, VALUE_COLUMN, FLAG_MIN_WIDTH } = CONSTS.providers.frame;
const PLACEHOLDER = '{0}';

/** 프로필 테두리: 가진 테두리를 켠다 (장착과 무관하게 보유한 테두리 전부 효과가 들어간다) */
export default function FramePanel({ tables, descriptions }: TabPanelProps) {
  const { t: translate } = useTranslation();
  return (
    <Stack gap="xs">
      <Text size="sm" c="dimmed">
        {translate('calc.frame.help')}
      </Text>
      <AutoGrid minItemWidth={FLAG_MIN_WIDTH}>
        {frameRows(tables).map((row) => (
          <FlagField
            key={row[ID_COLUMN]}
            storeKey={CALC_KEY_PREFIX + frameOwnedField(row[ID_COLUMN])}
            label={translate('calc.frame.flagLabel', {
              frame: row[ID_COLUMN],
              // 효과 문구의 {0} 자리에 값을 넣는다 (예: 공격력 100% 증가)
              effect: statDescription(descriptions, row[STAT_COLUMN]).replace(PLACEHOLDER, row[VALUE_COLUMN]),
            })}
          />
        ))}
      </AutoGrid>
    </Stack>
  );
}
