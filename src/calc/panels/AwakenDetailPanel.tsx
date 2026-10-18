import { useTranslation } from 'react-i18next';
import { Group, NumberInput, Stack, Text } from '@mantine/core';
import { CONSTS } from '@/CONSTS';
import LazySelect from '@/components/LazySelect';
import { formatLog } from '@/calc/gameNumber';
import { awakenGradeChoices, awakenStages, awakenStarChoices, selectedAwakenChoice } from '@/calc/sources/hero/awaken';
import { resolveChoice } from '@/calc/sources/hero/character';
import { awakenDetailLevelField, awakenDetailStats } from '@/calc/sources/masteryRuneBuff/awakenDetail';
import { statLabel } from '@/calc/statText';
import type { TabPanelProps } from '@/calc/types';

const { FIELDS } = CONSTS.hero;
const { DETAIL_LEVEL_INPUT_WIDTH, CHOICE_SELECT_WIDTH } = CONSTS.hero.ui;

/** 베르 각성: 게임 성장 → 각성 화면처럼 등급 · 별 · 세부 스탯 레벨 (칸 이름 awakenGrade, awakenStar, awakenDetailLevel<스탯>) */
export default function AwakenDetailPanel({ values, setValue, tables, descriptions }: TabPanelProps) {
  const { t: translate } = useTranslation();
  const stages = awakenStages(tables);
  const awaken = selectedAwakenChoice(values, stages);
  const stage = stages.find((item) => item.grade === awaken.grade && String(item.star) === awaken.star);
  const pickGrade = (grade: string) => {
    setValue(FIELDS.AWAKEN_GRADE, grade);
    setValue(FIELDS.AWAKEN_STAR, resolveChoice(values[FIELDS.AWAKEN_STAR], awakenStarChoices(stages, grade)));
  };

  return (
    <Stack gap="xs">
      {/* 등급 · 별 · 각성 단계를 한 줄에 (좁으면 줄바꿈) */}
      <Group gap="xs" align="center">
        <Text size="sm" style={{ flexShrink: 0 }}>
          {translate('calc.awakenDetail.grade')}
        </Text>
        <LazySelect
          style={{ width: CHOICE_SELECT_WIDTH }}
          aria-label={translate('calc.awakenDetail.grade')}
          data={awakenGradeChoices(stages)}
          value={awaken.grade}
          allowDeselect={false}
          onChange={(grade) => grade && pickGrade(grade)}
        />
        <Text size="sm" style={{ flexShrink: 0 }}>
          {translate('calc.awakenDetail.star')}
        </Text>
        <LazySelect
          style={{ width: CHOICE_SELECT_WIDTH }}
          aria-label={translate('calc.awakenDetail.star')}
          data={awakenStarChoices(stages, awaken.grade).map((star) => ({
            value: star,
            label: translate('calc.awakenDetail.starLabel', { star }),
          }))}
          value={awaken.star}
          allowDeselect={false}
          onChange={(star) => star && setValue(FIELDS.AWAKEN_STAR, star)}
        />
        <Text size="sm" fw={600} style={{ flexShrink: 0 }}>
          {stage ? translate('calc.awakenDetail.stageNumber', { level: stage.awakenLv }) : '-'}
        </Text>
      </Group>
      {awakenDetailStats(values, tables).map((entry) => {
        const name = statLabel(descriptions, entry.stat);
        return (
          <Group key={entry.stat} gap="xs" wrap="nowrap" justify="space-between">
            <Text size="sm" style={{ flex: 1, minWidth: 0 }}>
              {name}
            </Text>
            <NumberInput
              size="xs"
              w={DETAIL_LEVEL_INPUT_WIDTH}
              hideControls
              min={0}
              max={entry.maxLevel}
              allowNegative={false}
              allowDecimal={false}
              aria-label={translate('calc.awakenDetail.levelLabel', { name })}
              value={values[awakenDetailLevelField(entry.stat)] ?? ''}
              onChange={(next) => setValue(awakenDetailLevelField(entry.stat), String(next))}
            />
            <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
              / {entry.maxLevel}
            </Text>
            <Text size="sm" ta="right" style={{ flexShrink: 0 }}>
              {entry.percentLog === null ? '-' : `${formatLog(entry.percentLog)}%`}
            </Text>
          </Group>
        );
      })}
      <Text size="xs" c="dimmed">
        {translate('calc.awakenDetail.hitExcluded')}
      </Text>
    </Stack>
  );
}
