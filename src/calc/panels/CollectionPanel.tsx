/** 도감 효과 (공격력·체력 증가) */
import { useTranslation } from 'react-i18next';
import { Stack, Text } from '@mantine/core';
import { ENCYCLOPEDIA_FIELDS } from '../sources/textLines/collection';
import type { TabPanelProps } from '../types';
import { ScreenValueInput } from './TextLinesFields';

export default function CollectionPanel({ values, setValue }: TabPanelProps) {
  const { t: translate } = useTranslation();
  return (
    <Stack gap="xs">
      <Text size="sm" c="dimmed">
        {translate('calc.collection.help')}
      </Text>
      {ENCYCLOPEDIA_FIELDS.map((field) => (
        <ScreenValueInput
          key={field.id}
          values={values}
          setValue={setValue}
          fieldId={field.id}
          translationPrefix={`calc.collection.fields.${field.id}`}
        />
      ))}
    </Stack>
  );
}
