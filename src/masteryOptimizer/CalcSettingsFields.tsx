import { useTranslation } from 'react-i18next';
import { Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { NumberField } from '@/components/StoreFields';
import { DEFAULT_TARGETS_PER_SKILL, OPTIMIZER_KEYS } from '@/masteryOptimizer/optimizerKeys';

/** 추천 계산에 쓰는 값 (맞는 적 수 · 스테이지 층). 계정 페이지의 "계산 설정" 묶음에 그린다. 유저 레벨은 계정 값이라 "기본 정보" 묶음 */
export default function CalcSettingsFields() {
  const { t: translate } = useTranslation();
  return (
    <Paper withBorder>
      <Stack>
        <Text fw={600}>{translate('optimizer.inputsTitle')}</Text>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <NumberField
            storeKey={OPTIMIZER_KEYS.targetsPerSkill}
            label={translate('optimizer.targetsPerSkill')}
            hint={translate('optimizer.targetsPerSkillHint')}
            min={1}
            fallback={DEFAULT_TARGETS_PER_SKILL}
          />
          <NumberField storeKey={OPTIMIZER_KEYS.stageFloor} label={translate('optimizer.stageFloor')} min={0} />
        </SimpleGrid>
      </Stack>
    </Paper>
  );
}
