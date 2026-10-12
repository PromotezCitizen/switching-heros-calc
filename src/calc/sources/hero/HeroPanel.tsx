import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox, Stack, Text } from '@mantine/core';
import HorizontalScrollRow from '../../../components/HorizontalScrollRow';
import SectionTitle from '../../../components/SectionTitle';
import { CONSTS } from '../../../CONSTS';
import type { StatTables, TableRow } from '../../../data/statTables';
import { useCalcStore } from '../../../store/useCalcStore';
import type { CalcValues, TabPanelProps } from '../../types';
import { sharedCalcValues } from '../../useTrackedCalcValues';
import { EXCLUSIVE_EQUIPPED_FIELD, hasExclusiveWeapon } from '../heroWeaponCardPet/weapon';
import { heroAwakenRow } from '../textLines/other';
import BaseCheckTable from './BaseCheckTable';
import { baseCheck } from './baseCheck';
import { characterRows, heroFirstRow, selectedHero, slotHeroName } from './character';
import HeroPicker from './HeroPicker';
import { rosterAwakenField, rosterGradeField } from './rosterFields';

const { FIELDS } = CONSTS.hero;
const { HERO_AWAKEN_VALUE_COLUMN } = CONSTS.textLines;
const HERO_SLOT_FIELDS = [FIELDS.HERO_1, FIELDS.HERO_2] as const;
const { CARD_MIN_WIDTH } = CONSTS.display;

/** 히어로마다 표 첫 행 (표 순서) */
function firstRowPerHero(tables: StatTables): TableRow[] {
  const seen = new Set<string>();
  return characterRows(tables).filter((row) => !seen.has(row.name) && seen.add(row.name));
}

/** 고르기 창 목록: 히어로 표에서 보유로 표시한 히어로만 (아직 하나도 없으면 전부) */
function pickableHeroes(allHeroes: TableRow[], values: CalcValues): TableRow[] {
  const ownedHeroes = allHeroes.filter((row) => values[rosterGradeField(row.charId)]);
  return ownedHeroes.length ? ownedHeroes : allHeroes;
}

/**
 * 캐릭터 각성 칸: 1·2슬롯 히어로 고르기 (칸 charName, charName2) + 1슬롯 히어로의 등급·성·각성 요약 + 기본값 확인.
 * 등급·성·각성 입력은 히어로 표 (heroOwnedGrade_<charId> 등)
 */
export default function HeroPanel({ values, setValue, tables }: TabPanelProps) {
  const { t: translate } = useTranslation();

  const allHeroes = useMemo(() => firstRowPerHero(tables), [tables]);
  // 고르기 창 목록은 창을 열 때만 만든다 (히어로 표 등급 칸 전부를 읽으므로, 그릴 때마다 읽으면 그 칸을 바꿀 때마다 이 탭이 다시 그려짐).
  // 창이 열린 동안에는 히어로 표를 고칠 수 없어 열 때의 저장소 값으로 충분하다
  const listHeroes = () => pickableHeroes(allHeroes, sharedCalcValues(useCalcStore.getState().values));

  const hero = selectedHero(values, tables);
  const heroAwaken = heroAwakenRow(values, tables);
  const slotCharId = heroFirstRow(tables, hero.name)?.charId;
  const awakenLevel = slotCharId ? values[rosterAwakenField(slotCharId)] || '0' : '';

  return (
    <Stack gap="xs">
      <HorizontalScrollRow itemWidth={CARD_MIN_WIDTH.small}>
        {HERO_SLOT_FIELDS.map((fieldId) => {
          const value = (values[fieldId] ?? '').trim();
          // 버튼에 보일 히어로 = 고르기 창 목록에 있는 고른 히어로 (보유가 아니면 빈 슬롯, slotHeroName 과 같은 기준)
          const pickedName = slotHeroName(values, tables, fieldId);
          return (
            <HeroPicker
              key={fieldId}
              fieldId={fieldId}
              value={value}
              picked={pickedName ? allHeroes.find((row) => row.name === pickedName) : undefined}
              listHeroes={listHeroes}
              onPick={(name) => setValue(fieldId, name)}
            />
          );
        })}
      </HorizontalScrollRow>
      {/* 1슬롯 히어로의 등급·성·캐릭터 각성은 히어로 표 값 (여기서는 보여 주기만) */}
      {hero.name && (
        <Text size="sm">
          {translate('calc.hero.slotSummary', {
            grade: hero.grade || '-',
            star: hero.star || '-',
            awaken: awakenLevel,
            effect: heroAwaken ? Number(heroAwaken[HERO_AWAKEN_VALUE_COLUMN]) : 0,
          })}
        </Text>
      )}
      {/* 전용 무기가 있는 히어로만: 꼈는지 (끄면 일반 무기 장착 효과, 켜면 전용 무기 장착 효과) */}
      {hasExclusiveWeapon(values, tables) && (
        <Checkbox
          label={translate('calc.hero.exclusiveEquipped')}
          checked={values[EXCLUSIVE_EQUIPPED_FIELD] === 'true'}
          onChange={(event) => setValue(EXCLUSIVE_EQUIPPED_FIELD, String(event.currentTarget.checked))}
        />
      )}
      <Text size="xs" c="dimmed">
        {translate('calc.hero.heroHint')}
      </Text>

      <SectionTitle>{translate('calc.hero.baseCheck.title')}</SectionTitle>
      <BaseCheckTable rows={baseCheck(values, tables)} />
    </Stack>
  );
}
