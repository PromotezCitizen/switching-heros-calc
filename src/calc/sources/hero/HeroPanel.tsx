import { useMemo } from 'react';
import { Stack } from '@mantine/core';
import HorizontalScrollRow from '@/components/HorizontalScrollRow';
import { CONSTS } from '@/CONSTS';
import type { StatTables, TableRow } from '@/data/statTables';
import { useCalcStore } from '@/store/useCalcStore';
import type { CalcValues, TabPanelProps } from '@/calc/types';
import { sharedCalcValues } from '@/calc/useTrackedCalcValues';
import { characterRows, slotHeroName } from '@/calc/sources/hero/character';
import HeroPicker from '@/calc/sources/hero/HeroPicker';
import { rosterGradeField } from '@/calc/sources/hero/rosterFields';

const { FIELDS } = CONSTS.hero;
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
 * 캐릭터 각성 칸: 1·2슬롯 히어로 고르기 (칸 charName, charName2).
 * 등급·성·각성 입력은 히어로 표 (heroOwnedGrade_<charId> 등), 전용 무기 장착 여부는 폰 불러오기 값을 쓴다
 */
export default function HeroPanel({ values, setValue, tables }: TabPanelProps) {
  const allHeroes = useMemo(() => firstRowPerHero(tables), [tables]);
  // 고르기 창 목록은 창을 열 때만 만든다 (히어로 표 등급 칸 전부를 읽으므로, 그릴 때마다 읽으면 그 칸을 바꿀 때마다 이 탭이 다시 그려짐).
  // 창이 열린 동안에는 히어로 표를 고칠 수 없어 열 때의 저장소 값으로 충분하다
  const listHeroes = () => pickableHeroes(allHeroes, sharedCalcValues(useCalcStore.getState().values));

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
    </Stack>
  );
}
