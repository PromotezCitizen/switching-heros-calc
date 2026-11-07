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
import FIGURE_IMAGES from '@/calc/sources/providers/figureImages.json';
import { statLabel, type StatDescriptions } from '@/calc/statText';
import type { TabPanelProps } from '@/calc/types';

const { CARD_MIN_WIDTH, ICON_FOLDER, ICON_PREFIX, ICON_DIGITS, ICON_SIZE, LEVEL_INPUT_WIDTH, SLOT_COUNT, STAT_COLUMN_PREFIX, TARGET_HERO_PATTERN } =
  CONSTS.providers.figure;
const { EMPTY_STATS } = CONSTS.providers;
const UNUSED_OPACITY = CONSTS.heroWeaponCardPet.ui.UNUSED_OPACITY;

/**
 * 피규어 그림: 아이템 표 imgName (figureImages.json, 예: 1번 → Figure_47) 의 번호로 public/icons/Atlas_FigureIMG/figure_<번호>.png.
 * 그림 번호 ≠ 피규어 번호 (사용자 지적 2026-11-07 "피규어랑 이미지랑 같지도 않는데"). 표에 없으면 그림 없음
 */
function figureIcon(figureId: string): string | null {
  const imageName = (FIGURE_IMAGES as Record<string, string>)[figureId];
  const imageNumber = imageName?.split('_').pop();
  return imageNumber ? iconUrl(`${ICON_FOLDER}/${ICON_PREFIX}${imageNumber.padStart(ICON_DIGITS, '0')}`) : null;
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
  /**
   * 같은 히어로끼리 붙여 늘어놓는 히어로 이름: 전용은 효과의 대상 히어로, 공용은 이름의 "<…>" 뒤 히어로 (히어로 표에 있을 때만).
   * 모르면 (예: <피크닉>) null → 맨 뒤
   */
  heroKey: string | null;
}

/** 이름 "<수식어> 히어로" 의 히어로 부분 (없으면 빈 글) */
function heroPartOf(name: string): string {
  return name.replace(/^<[^>]*>/, '').trim();
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
        <Image src={figureIcon(figure.figureId) ?? undefined} w={ICON_SIZE} h={ICON_SIZE} fit="contain" alt="" />
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
  const { t: translate, i18n } = useTranslation();
  const views = useMemo(() => buildViews(tables, descriptions, translate), [tables, descriptions, translate]);
  // 공용 · 히어로 전용 모두 같은 히어로끼리 붙여서 (사용자 지시 2026-11-07 "같은 히어로면 근처에 붙여라" · 공용도 "ㅇ"):
  // 히어로 이름을 화면 언어의 가나다 (알파벳) 순으로 (사용자 결정 2026-11-07 "2", 언어마다 순서가 다름), 같은 히어로 안에서는 피규어 번호 순, 히어로 모름은 맨 뒤
  const byHero = (left: FigureView, right: FigureView) => {
    if (left.heroKey !== right.heroKey) {
      if (left.heroKey === null) return 1;
      if (right.heroKey === null) return -1;
      return left.heroKey.localeCompare(right.heroKey, i18n.language);
    }
    return Number(left.figure.figureId) - Number(right.figure.figureId);
  };
  const groups = [
    { key: 'common', items: views.filter((view) => !view.heroOnly).sort(byHero) },
    { key: 'hero', items: views.filter((view) => view.heroOnly).sort(byHero) },
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
  const heroes = rosterHeroes(tables);
  const heroName = new Map(heroes.map((hero) => [hero.charId, hero.name]));
  const heroNames = new Set(heroes.map((hero) => hero.name));
  return figures(tables).map((figure) => {
    const stats = figureStats(tables, figure.figureId);
    let heroOnly = false;
    let heroKey: string | null = null;
    const effect = stats
      .map((stat) => {
        const target = TARGET_HERO_PATTERN.exec(stat);
        if (target) {
          heroOnly = true;
          heroKey = heroName.get(target[1]) ?? null;
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
    // 공용은 이름의 히어로 (히어로 표에 있을 때만)
    if (!heroOnly) {
      const part = heroPartOf(name);
      heroKey = heroNames.has(part) ? part : null;
    }
    return { figure, name, effect, heroOnly, heroKey };
  });
}
