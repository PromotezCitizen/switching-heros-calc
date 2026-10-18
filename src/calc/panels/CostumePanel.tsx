/** 코스튬 "능력치 확인" 공격력 증가 + 보유 코스튬 수 (얼티밋 특성용) */
import { useTranslation } from 'react-i18next';
import { Stack, Text } from '@mantine/core';
import { COSTUME_COUNT_FIELD, COSTUME_FIELDS } from '@/calc/sources/textLines/collection';
import type { TabPanelProps } from '@/calc/types';
import { LevelInput, ScreenValueInput } from '@/calc/panels/TextLinesFields';

export default function CostumePanel({ values, setValue }: TabPanelProps) {
  const { t: translate } = useTranslation();
  return (
    <Stack gap="xs">
      <Text size="sm" c="dimmed">
        {translate('calc.costume.help')}
      </Text>
      {COSTUME_FIELDS.map((field) => (
        <ScreenValueInput
          key={field.id}
          values={values}
          setValue={setValue}
          fieldId={field.id}
          translationPrefix={`calc.costume.fields.${field.id}`}
        />
      ))}
      <LevelInput
        values={values}
        setValue={setValue}
        fieldId={COSTUME_COUNT_FIELD}
        translationPrefix={`calc.costume.fields.${COSTUME_COUNT_FIELD}`}
      />
    </Stack>
  );
}
