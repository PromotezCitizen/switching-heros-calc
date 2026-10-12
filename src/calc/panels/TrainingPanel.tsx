import { useTranslation } from 'react-i18next';
import { Stack, Text, TextInput } from '@mantine/core';
import HorizontalScrollRow from '../../components/HorizontalScrollRow';
import SectionTitle from '../../components/SectionTitle';
import { CONSTS } from '../../CONSTS';
import {
  TRAINING_LEVEL_FIELDS,
  TRAINING_STAGE_FIELD,
  trainingItemNumber,
  trainingMaxStage,
  trainingScreenStage,
  trainingSlotRows,
  trainingStageEntered,
} from '../sources/trainingRelic/training';
import { statLabel } from '../statText';
import type { TabPanelProps } from '../types';

const MIN_LEVEL = CONSTS.emptyInput.LEVEL;
const { LIST_INPUT_WIDTH } = CONSTS.display;

/** 훈련: 게임 화면 단계 + 현재 단계 항목 레벨 4칸 */
export default function TrainingPanel({ values, setValue, tables, descriptions }: TabPanelProps) {
  const { t: translate } = useTranslation();
  const stageEntered = trainingStageEntered(values);
  const maxScreenStage = trainingScreenStage(trainingMaxStage(tables));
  const slotRows = trainingSlotRows(values, tables);

  return (
    <Stack gap="md">
      <Stack gap="xs">
        <SectionTitle>{translate('calc.training.stageTitle')}</SectionTitle>
        <HorizontalScrollRow itemWidth={LIST_INPUT_WIDTH}>
          <TextInput
            type="number"
            inputMode="numeric"
            min={MIN_LEVEL}
            max={maxScreenStage}
            label={translate('calc.training.stageLabel', { max: maxScreenStage })}
            value={values[TRAINING_STAGE_FIELD] ?? ''}
            onChange={(event) => setValue(TRAINING_STAGE_FIELD, event.currentTarget.value)}
          />
        </HorizontalScrollRow>
        <Text size="sm" c="dimmed">{translate('calc.training.stageHelp')}</Text>
      </Stack>

      <Stack gap="xs">
        <SectionTitle>{translate('calc.training.levelsTitle')}</SectionTitle>
        <HorizontalScrollRow itemWidth={LIST_INPUT_WIDTH}>
          {TRAINING_LEVEL_FIELDS.map((fieldId, index) => {
            const row = slotRows[index];
            if (stageEntered && !row) return null;
            const label =
              stageEntered && row
                ? translate('calc.training.levelForStat', { stat: statLabel(descriptions, row.stat), max: row.maxLevel })
                : translate('calc.training.levelDefault', { index: trainingItemNumber(index) });
            return (
              <TextInput
                key={fieldId}
                type="number"
                inputMode="numeric"
                min={MIN_LEVEL}
                max={stageEntered && row ? row.maxLevel : undefined}
                label={label}
                value={values[fieldId] ?? ''}
                onChange={(event) => setValue(fieldId, event.currentTarget.value)}
              />
            );
          })}
        </HorizontalScrollRow>
        <Text size="sm" c="dimmed">{translate('calc.training.levelsHelp')}</Text>
      </Stack>
    </Stack>
  );
}
