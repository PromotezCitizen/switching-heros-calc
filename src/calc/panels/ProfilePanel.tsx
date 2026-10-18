/** 프로필 창 값: 계산이 읽는 공격력·체력 2칸 */
import { useTranslation } from 'react-i18next';
import { Stack, Text } from '@mantine/core';
import HorizontalScrollRow from '@/components/HorizontalScrollRow';
import { CONSTS } from '@/CONSTS';
import { PROFILE_FIELDS } from '@/calc/sources/textLines/profile';
import type { TabPanelProps } from '@/calc/types';
import { ScreenValueInput } from '@/calc/panels/TextLinesFields';

const { LIST_INPUT_WIDTH } = CONSTS.display;

export default function ProfilePanel({ values, setValue }: TabPanelProps) {
  const { t: translate } = useTranslation();
  return (
    <Stack gap="md">
      <HorizontalScrollRow itemWidth={LIST_INPUT_WIDTH}>
        {PROFILE_FIELDS.map((fieldId) => (
          <ScreenValueInput
            key={fieldId}
            values={values}
            setValue={setValue}
            fieldId={fieldId}
            translationPrefix={`calc.profile.fields.${fieldId}`}
            invalidMessage={translate('calc.profile.invalid')}
          />
        ))}
      </HorizontalScrollRow>
      <Text size="sm" c="dimmed">
        {translate('calc.profile.help')}
      </Text>
    </Stack>
  );
}
