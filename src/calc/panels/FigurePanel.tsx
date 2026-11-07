/**
 * 피규어 탭 (사용자 결정 2026-11-07: 피규어는 따로 한 탭, 전체 108개): 공용 · 히어로 전용으로 나눠
 * 카드마다 그림 · 이름 · 번호 · 등급 · 효과 이름 · 레벨 입력 (비우면 미보유).
 * 이름 · 효과 이름은 서버 번역 표 (scripts/fill_figure_texts.mjs 가 figure.ko.json 에 채움)
 */
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Group, Image, NumberInput, Paper, Stack, Text, Title } from '@mantine/core';
import AutoGrid from '@/components/AutoGrid';
import { CONSTS } from '@/CONSTS';
import type { StatTables } from '@/data/statTables';
import { iconUrl } from '@/calc/panels/heroWeaponCardPet/IconPicker';
import { rosterHeroes } from '@/calc/sources/hero/roster';
import { figureLevelField, figureRow, figures, type Figure } from '@/calc/sources/providers/figure';
import { statLabel, type StatDescriptions } from '@/calc/statText';
import type { TabPanelProps } from '@/calc/types';

const { CARD_MIN_WIDTH, ICON_FOLDER, ICON_PREFIX, ICON_DIGITS, ICON_SIZE, LEVEL_INPUT_WIDTH, SLOT_COUNT, STAT_COLUMN_PREFIX, TARGET_HERO_PATTERN } =
  CONSTS.providers.figure;
const { EMPTY_STATS } = CONSTS.providers;
const UNUSED_OPACITY = CONSTS.heroWeaponCardPet.ui.UNUSED_OPACITY;

function figureIcon(figureId: string): string {
  return iconUrl(`${ICON_FOLDER}/${ICON_PREFIX}${figureId.padStart(ICON_DIGITS, '0')}`);
}

/** 레벨 1 행의 효과 종류들 (빈 칸 빼고) */
function figureStats(tables: StatTables, figureId: string): string[] {
  const row = figureRow(tables, figureId, 1);
  if (!row) return [];
  return Array.from({ length: SLOT_COUNT }, (_, index) => row[`${STAT_COLUMN_PREFIX}${index + 1}`]).filter(
    (stat): stat is string => !!stat && !EMPTY_STATS.includes(stat),
  );
}

interface FigureView {
  figure: Figure;
  name: string;
  /** 효과 이름 (여러 개면 " · " 로) */
  effect: string;
  /** 히어로 전용 (효과가 특정 히어로를 가리킴) */
  heroOnly: boolean;
}

interface FigureCardProps {
  view: FigureView;
  level: string | undefined;
  setValue: TabPanelProps['setValue'];
}

/** 피규어 카드 한 장 (memo: 칸 하나를 바꾸면 그 카드만 다시 그린다) */
const FigureCard = memo(function FigureCard({ view, level, setValue }: FigureCardProps) {
  const { t: translate } = useTranslation();
  const { figure, name, effect } = view;
  return (
    <Paper withBorder p="xs" style={{ opacity: level ? undefined : UNUSED_OPACITY }}>
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <Image src={figureIcon(figure.figureId)} w={ICON_SIZE} h={ICON_SIZE} fit="contain" alt="" />
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={700}>
            {name}
          </Text>
          <Text size="xs" c="dimmed">
            {translate('calc.figure.idGrade', { figure: figure.figureId, grade: figure.grade })}
          </Text>
          <Text size="xs">{effect}</Text>
          <NumberInput
            size="xs"
            w={LEVEL_INPUT_WIDTH}
            hideControls
            min={0}
            max={figure.maxLevel}
            allowNegative={false}
            allowDecimal={false}
            aria-label={translate('calc.figure.levelAria', { name })}
            placeholder={translate('calc.figure.levelPlaceholder', { max: figure.maxLevel })}
            value={level ?? ''}
            onChange={(next) => setValue(figureLevelField(figure.figureId), String(next))}
          />
        </Stack>
      </Group>
    </Paper>
  );
});

export default function FigurePanel({ values, setValue, tables, descriptions }: TabPanelProps) {
  const { t: translate } = useTranslation();
  const views = useMemo(() => buildViews(tables, descriptions, translate), [tables, descriptions, translate]);
  const groups = [
    { key: 'common', items: views.filter((view) => !view.heroOnly) },
    { key: 'hero', items: views.filter((view) => view.heroOnly) },
  ];
  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        {translate('calc.figure.help')}
      </Text>
      {groups.map((group) => (
        <Stack key={group.key} gap="xs">
          <Title order={5}>{translate(`calc.figure.groups.${group.key}`, { count: group.items.length })}</Title>
          <AutoGrid minItemWidth={CARD_MIN_WIDTH}>
            {group.items.map((view) => (
              <FigureCard key={view.figure.figureId} view={view} level={values[figureLevelField(view.figure.figureId)]} setValue={setValue} />
            ))}
          </AutoGrid>
        </Stack>
      ))}
    </Stack>
  );
}

/** 피규어마다 이름 · 효과 이름 · 전용 여부 */
function buildViews(tables: StatTables, descriptions: StatDescriptions, translate: (key: string, options?: Record<string, unknown>) => string): FigureView[] {
  const heroName = new Map(rosterHeroes(tables).map((hero) => [hero.charId, hero.name]));
  return figures(tables).map((figure) => {
    const stats = figureStats(tables, figure.figureId);
    let heroOnly = false;
    const effect = stats
      .map((stat) => {
        const target = TARGET_HERO_PATTERN.exec(stat);
        if (target) {
          heroOnly = true;
          const hero = heroName.get(target[1]) ?? translate('calc.figure.unknownHero', { id: target[1] });
          return translate(`calc.figure.targetHero.${target[2].toLowerCase() === 'hp' ? 'hp' : 'attackDamage'}`, { hero });
        }
        // 번역 표 짧은 효과 이름, 없으면 계산기 스탯 설명
        return translate(`calc.figure.effects.${stat}`, { defaultValue: statLabel(descriptions, stat) });
      })
      .join(' · ');
    const name = translate(`calc.figure.names.${figure.figureId}`, {
      defaultValue: translate('calc.figure.levelLabel', { figure: figure.figureId, grade: figure.grade }),
    });
    return { figure, name, effect, heroOnly };
  });
}
