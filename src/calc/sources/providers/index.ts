/** 코어 특성 · 피규어 탭 (뒤늦게 계산에 넣은 능력치 제공자, 입력은 처음 비어 있음) */
import i18n from 'i18next';
import { CONSTS } from '@/CONSTS';
import CoreMasteryPanel from '@/calc/panels/CoreMasteryPanel';
import FigurePanel from '@/calc/panels/FigurePanel';
import type { CalcTab } from '@/calc/types';
import type { SourceLabel } from '@/calc/sources/heroWeaponCardPet/shared';
import { coreMasteryLines } from '@/calc/sources/providers/coreMastery';
import { figureLines } from '@/calc/sources/providers/figure';

/** 출처 글 = 번역 (i18n 이 준비된 뒤 호출된다) */
const sourceLabel: SourceLabel = (translationKey, params) => i18n.t(translationKey, params);

export const providerTabs: CalcTab[] = [
  {
    id: 'coreMastery',
    tableNames: [CONSTS.providers.coreMastery.TABLE],
    Panel: CoreMasteryPanel,
    lines: (values, tables) => coreMasteryLines(values, tables, sourceLabel),
  },
  {
    id: 'figure',
    tableNames: [CONSTS.providers.figure.TABLE, CONSTS.hero.TABLES.CHARACTER],
    Panel: FigurePanel,
    lines: (values, tables) => figureLines(values, tables, sourceLabel),
  },
];
