/** 칭호 "누적 능력치 확인" (공격력·체력 증가) */
import { useTranslation } from 'react-i18next';
import { Stack, Text } from '@mantine/core';
import { TITLE_FIELDS } from '@/calc/sources/textLines/collection';
import type { TabPanelProps } from '@/calc/types';
import { ScreenValueInput } from '@/calc/panels/TextLinesFields';

export default function TitlePanel({ values, setValue }: TabPanelProps) {
  const { t: translate } = useTranslation();
  return (
    <Stack gap="xs">
      <Text size="sm" c="dimmed">
        {translate('calc.title.help')}
      </Text>
      {TITLE_FIELDS.map((field) => (
        <ScreenValueInput
          key={field.id}
          values={values}
          setValue={setValue}
          fieldId={field.id}
          translationPrefix={`calc.title.fields.${field.id}`}
        />
      ))}
    </Stack>
  );
}
