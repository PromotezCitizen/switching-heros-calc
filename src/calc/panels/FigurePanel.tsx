import { useTranslation } from 'react-i18next';
import { Accordion, NumberInput, Stack, Text } from '@mantine/core';
import AutoGrid from '@/components/AutoGrid';
import { CONSTS } from '@/CONSTS';
import { figureLevelField, figures } from '@/calc/sources/providers/figure';
import type { TabPanelProps } from '@/calc/types';

const { INPUT_MIN_WIDTH } = CONSTS.providers.figure;

/** 피규어: 피규어마다 레벨 (비우면 미보유). 피규어 이름은 데이터에 없어 번호와 등급으로 구분한다 */
export default function FigurePanel({ values, setValue, tables }: TabPanelProps) {
  const { t: translate } = useTranslation();
  const list = figures(tables);
  return (
    <Stack gap="xs">
      <Text size="sm" c="dimmed">
        {translate('calc.figure.help')}
      </Text>
      <Accordion variant="contained">
        <Accordion.Item value="figures">
          <Accordion.Control>{translate('calc.figure.open', { count: list.length })}</Accordion.Control>
          <Accordion.Panel>
            <AutoGrid minItemWidth={INPUT_MIN_WIDTH}>
              {list.map((figure) => (
                <NumberInput
                  key={figure.figureId}
                  size="xs"
                  hideControls
                  min={0}
                  max={figure.maxLevel}
                  allowNegative={false}
                  allowDecimal={false}
                  label={translate('calc.figure.levelLabel', { figure: figure.figureId, grade: figure.grade })}
                  placeholder={`/ ${figure.maxLevel}`}
                  value={values[figureLevelField(figure.figureId)] ?? ''}
                  onChange={(next) => setValue(figureLevelField(figure.figureId), String(next))}
                />
              ))}
            </AutoGrid>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}
