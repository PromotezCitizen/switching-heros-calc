import { useTranslation } from 'react-i18next';
import { Stack, Table, Text, Textarea, TextInput } from '@mantine/core';
import { CONSTS } from '@/CONSTS';
import { combineLines } from '@/calc/combine';
import { formatLog } from '@/calc/gameNumber';
import { ancientRelicLines } from '@/calc/sources/providers/ancientRelic';
import { statDescription } from '@/calc/statText';
import type { TabPanelProps } from '@/calc/types';

const { MASTERED_FIELD, PROGRESS_FIELD, PROGRESS_ROWS } = CONSTS.providers.ancientRelic;
const PLACEHOLDER = '{0}';
const PLACEHOLDER_SHOWN = 'N';
/** 화면의 % = 줄을 곱한 배율 − 1 (× 100): log10(배율 − 1) + 2 */
const PERCENT_LOG_SHIFT = 2;

/** 별자리 유물: 달성한 별자리 번호와 진행 중 별자리 (USB 가져오기가 채운다). 아래 표는 게임의 "별자리 효과" 화면과 같은 값 */
export default function AncientRelicPanel({ values, setValue, tables, descriptions }: TabPanelProps) {
  const { t: translate } = useTranslation();
  const combined = Object.entries(combineLines(ancientRelicLines(values, tables, (key) => key)));
  return (
    <Stack gap="xs">
      <Text size="sm" c="dimmed">
        {translate('calc.ancientRelic.help')}
      </Text>
      <TextInput
        label={translate('calc.ancientRelic.mastered')}
        description={translate('calc.ancientRelic.masteredHint')}
        value={values[MASTERED_FIELD] ?? ''}
        onChange={(event) => setValue(MASTERED_FIELD, event.currentTarget.value)}
      />
      <Textarea
        label={translate('calc.ancientRelic.progress')}
        description={translate('calc.ancientRelic.progressHint')}
        autosize
        minRows={PROGRESS_ROWS}
        value={values[PROGRESS_FIELD] ?? ''}
        onChange={(event) => setValue(PROGRESS_FIELD, event.currentTarget.value)}
      />
      {combined.length > 0 && (
        <>
          <Text size="sm" fw={600}>
            {translate('calc.ancientRelic.effectsTitle')}
          </Text>
          <Table striped>
            <Table.Tbody>
              {combined.map(([stat, entry]) => (
                <Table.Tr key={stat}>
                  <Table.Td>{statDescription(descriptions, stat).replace(PLACEHOLDER, PLACEHOLDER_SHOWN)}</Table.Td>
                  <Table.Td ta="right">
                    {formatLog(Math.log10(Math.max(Math.pow(10, entry.log) - 1, Number.MIN_VALUE)) + PERCENT_LOG_SHIFT)}%
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </>
      )}
    </Stack>
  );
}
