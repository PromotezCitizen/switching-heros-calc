/** 연성 "능력치 합계" 15줄: 게임 목록과 같은 순서의 세로 목록 */
import { useTranslation } from 'react-i18next';
import { Stack, Text } from '@mantine/core';
import { GameNumberRow } from '../../components/StoreFields';
import { CALC_KEY_PREFIX } from '../storeKeys';
import { ARTIFACT_TOTAL_FIELDS } from '../sources/artifact';

export default function ArtifactPanel() {
  const { t: translate } = useTranslation();
  return (
    <Stack gap="xs">
      <Text size="sm" c="dimmed" mb="xs">
        {translate('calc.artifact.help')}
      </Text>
      {ARTIFACT_TOTAL_FIELDS.map((field) => (
        <GameNumberRow
          key={field.id}
          storeKey={CALC_KEY_PREFIX + field.id}
          label={translate(`calc.artifact.fields.${field.id}.label`)}
          example={translate(`calc.artifact.fields.${field.id}.example`)}
        />
      ))}
    </Stack>
  );
}
