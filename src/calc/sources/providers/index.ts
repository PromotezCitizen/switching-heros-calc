/** 코어 특성 · 피규어 탭 (뒤늦게 계산에 넣은 능력치 제공자, 입력은 처음 비어 있음) */
import i18n from 'i18next';
import { CONSTS } from '@/CONSTS';
import CoreMasteryPanel from '@/calc/panels/CoreMasteryPanel';
import AncientRelicPanel from '@/calc/panels/AncientRelicPanel';
import FigurePanel from '@/calc/panels/FigurePanel';
import { ancientRelicLines } from '@/calc/sources/providers/ancientRelic';
import FramePanel from '@/calc/panels/FramePanel';
import { frameLines } from '@/calc/sources/providers/frame';
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
    // 개수형 효과의 N: 배지 점수 (CardStickerSet) · 전용 무기 초월 (WeaponChar) · 각성 (Character)
    tableNames: [CONSTS.providers.figure.TABLE, CONSTS.hero.TABLES.CHARACTER, 'CardStickerSet', 'WeaponChar'],
    Panel: FigurePanel,
    lines: (values, tables) => figureLines(values, tables, sourceLabel),
  },
  {
    id: 'ancientRelic',
    tableNames: [CONSTS.providers.ancientRelic.TABLE],
    Panel: AncientRelicPanel,
    lines: (values, tables) => ancientRelicLines(values, tables, sourceLabel),
  },
  {
    id: 'frame',
    tableNames: [CONSTS.providers.frame.TABLE],
    Panel: FramePanel,
    lines: (values, tables) => frameLines(values, tables, sourceLabel),
  },
];
