/** 히어로 · 전용 무기 표 (한 탭): 가진 것만 등급·성·각성 / 초월 ★ 를 넣는다 (비우면 미보유) */
import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Group, Modal, NumberInput, Stack, Table, Text } from '@mantine/core';
import { CONSTS } from '@/CONSTS';
import LazySelect from '@/components/LazySelect';
import type { StatTables } from '@/data/statTables';
import { heroFirstRow, heroGradeChoices, heroStarChoices, resolveChoice } from '@/calc/sources/hero/character';
import { HeroImage } from '@/calc/sources/hero/HeroPicker';
import { exclusiveWeapons, rosterHeroes, type ExclusiveWeapon, type RosterHero } from '@/calc/sources/hero/roster';
import {
  exclusiveMissionReceivedStarField,
  exclusiveOptionStatField,
  exclusiveOptionValueField,
  exclusiveOwnedLevelField,
  exclusiveOwnedStarField,
  rosterAffinityField,
  rosterAwakenField,
  rosterGradeField,
  rosterStarField,
} from '@/calc/sources/hero/rosterFields';
import type { CalcValues, TabPanelProps } from '@/calc/types';
import type { StatDescriptions } from '@/calc/statText';
import StatValueRows, { diceStatChoices } from '@/calc/panels/heroWeaponCardPet/StatValueRows';
import { optionSlotsForStar, optionUnlockStar } from '@/calc/sources/heroWeaponCardPet/weapon';

const {
  ICON_SIZE,
  SELECT_WIDTH,
  NUMBER_WIDTH,
  TABLE_MIN_WIDTH,
  TABLE_MAX_HEIGHT,
  AFFINITY_MAX_LEVEL,
  HERO_GRADE_WIDTH,
  HERO_STAR_WIDTH,
  HERO_AWAKEN_WIDTH,
} = CONSTS.hero.roster;
const NOT_OWNED = '';
const { OPTION_ROWS } = CONSTS.heroWeaponCardPet.weapon;
/** 표 칸 수: 히어로 쪽 (이름 · 등급 · 성 · 각성 · 호감도), 전용 무기 쪽 (초월 ★ · 강화 레벨 · 받은 초월 미션 ★) */
const HERO_COLUMN_COUNT = 5;
const WEAPON_COLUMN_COUNT = 4;
/** 히어로 칸과 전용 무기 칸 사이 세로 줄 */
const WEAPON_DIVIDER = '1px solid var(--mantine-color-default-border)';

/** 전용 무기 칸 값 (초월 ★ · 강화 레벨 · 받은 초월 미션 ★) */
interface WeaponValues {
  star: string | undefined;
  level: string | undefined;
  /** 받은 초월 미션 ★ (비어 있으면 초월 ★ 까지 받은 것으로 침) */
  missionStar: string | undefined;
}

function weaponValuesOf(values: TabPanelProps['values'], weapon: ExclusiveWeapon | undefined): WeaponValues {
  if (!weapon) return { star: undefined, level: undefined, missionStar: undefined };
  return {
    star: values[exclusiveOwnedStarField(weapon.weaponId)],
    level: values[exclusiveOwnedLevelField(weapon.weaponId)],
    missionStar: values[exclusiveMissionReceivedStarField(weapon.weaponId)],
  };
}

/** 줄의 전용 무기 칸 세 개. 전용 무기가 없는 히어로는 "—" */
function ExclusiveWeaponCells({
  weapon,
  ownerName,
  weaponValues,
  setValue,
  onOpenOption,
}: {
  weapon: ExclusiveWeapon | undefined;
  ownerName: string;
  weaponValues: WeaponValues;
  setValue: TabPanelProps['setValue'];
  /** 무기 옵션 창 열기 (무기 번호) */
  onOpenOption: (weaponId: string) => void;
}) {
  const { t: translate } = useTranslation();
  if (!weapon) {
    return (
      <Table.Td colSpan={WEAPON_COLUMN_COUNT}>
        <Text size="xs" c="dimmed">
          {translate('calc.heroRoster.noWeapon')}
        </Text>
      </Table.Td>
    );
  }
  const { star, level, missionStar } = weaponValues;
  const owned = !!star;
  return (
    <>
      <Table.Td style={{ borderLeft: WEAPON_DIVIDER }}>
        {/* 초월 ★ 드롭다운: 없음 (미보유) + ★0 ~ 그 무기 최대 ★ */}
        <LazySelect
          size="xs"
          style={{ width: SELECT_WIDTH }}
          aria-label={translate('calc.exclusiveWeapon.starLabel', { name: ownerName })}
          data={[
            { value: NOT_OWNED, label: translate('calc.exclusiveWeapon.notOwned') },
            ...Array.from({ length: weapon.maxStar + 1 }, (_, starNumber) => ({ value: String(starNumber), label: `★${starNumber}` })),
          ]}
          value={star ?? NOT_OWNED}
          allowDeselect={false}
          onChange={(next) => setValue(exclusiveOwnedStarField(weapon.weaponId), next ?? NOT_OWNED)}
        />
      </Table.Td>
      <Table.Td>
        <NumberInput
          size="xs"
          w={NUMBER_WIDTH}
          hideControls
          min={1}
          allowNegative={false}
          allowDecimal={false}
          disabled={!owned}
          aria-label={translate('calc.exclusiveWeapon.levelLabel', { name: ownerName })}
          value={level ?? ''}
          onChange={(next) => setValue(exclusiveOwnedLevelField(weapon.weaponId), String(next))}
        />
      </Table.Td>
      <Table.Td>
        {/* 받은 초월 미션 ★: 비워 두면 초월 ★ 까지 받은 것으로 계산 */}
        <NumberInput
          size="xs"
          w={NUMBER_WIDTH}
          hideControls
          min={0}
          max={weapon.maxStar}
          allowNegative={false}
          allowDecimal={false}
          placeholder={star ?? ''}
          aria-label={translate('calc.exclusiveWeapon.missionStarLabel', { name: ownerName })}
          value={missionStar ?? ''}
          onChange={(next) => setValue(exclusiveMissionReceivedStarField(weapon.weaponId), String(next))}
        />
      </Table.Td>
      <Table.Td>
        {/* 무기 옵션: 줄마다 버튼, 누르면 그 무기 옵션 창 */}
        <Button size="compact-xs" variant="default" disabled={!owned} onClick={() => onOpenOption(weapon.weaponId)}>
          {translate('calc.exclusiveWeapon.optionButton')}
        </Button>
      </Table.Td>
    </>
  );
}

interface HeroRosterRowProps {
  hero: RosterHero;
  /** 칸 값 (등급 · 성 · 캐릭터 각성 · 호감도) */
  grade: string;
  star: string | undefined;
  awaken: string | undefined;
  affinity: string | undefined;
  /** 이 히어로의 전용 무기 (없으면 undefined) 와 그 칸 값 */
  weapon: ExclusiveWeapon | undefined;
  weaponStar: string | undefined;
  weaponLevel: string | undefined;
  weaponMissionStar: string | undefined;
  tables: StatTables;
  setValue: TabPanelProps['setValue'];
  onOpenOption: (weaponId: string) => void;
}

/** 히어로 · 전용 무기 표 한 줄 (memo: 칸 하나를 바꾸면 그 줄만 다시 그린다) */
const HeroRosterRow = memo(function HeroRosterRow({
  hero,
  grade,
  star,
  awaken,
  affinity,
  weapon,
  weaponStar,
  weaponLevel,
  weaponMissionStar,
  tables,
  setValue,
  onOpenOption,
}: HeroRosterRowProps) {
  const { t: translate } = useTranslation();
  const grades = heroGradeChoices(tables, hero.name);
  const stars = grade ? heroStarChoices(tables, hero.name, grade) : [];
  return (
    <Table.Tr style={{ opacity: grade ? undefined : CONSTS.heroWeaponCardPet.ui.UNUSED_OPACITY }}>
      <Table.Td>
        <Group gap={6} wrap="nowrap">
          <HeroImage hero={heroFirstRow(tables, hero.name)} size={ICON_SIZE} />
          <Text size="sm">{hero.name}</Text>
        </Group>
      </Table.Td>
      <Table.Td>
        <LazySelect
          size="xs"
          style={{ width: HERO_GRADE_WIDTH }}
          aria-label={translate('calc.heroRoster.gradeLabel', { name: hero.name })}
          data={[{ value: NOT_OWNED, label: translate('calc.heroRoster.notOwned') }, ...grades.map((choice) => ({ value: choice, label: choice }))]}
          value={grade}
          allowDeselect={false}
          onChange={(next) => {
            const nextGrade = next ?? NOT_OWNED;
            setValue(rosterGradeField(hero.charId), nextGrade);
            // 등급을 바꾸면 성은 그 등급에 있으면 그대로, 없으면 첫 성 (미보유면 비움)
            setValue(
              rosterStarField(hero.charId),
              nextGrade ? resolveChoice(star, heroStarChoices(tables, hero.name, nextGrade)) : '',
            );
          }}
        />
      </Table.Td>
      <Table.Td>
        <LazySelect
          size="xs"
          style={{ width: HERO_STAR_WIDTH }}
          aria-label={translate('calc.heroRoster.starLabel', { name: hero.name })}
          disabled={!grade}
          data={stars}
          value={star || null}
          allowDeselect={false}
          onChange={(next) => next && setValue(rosterStarField(hero.charId), next)}
        />
      </Table.Td>
      <Table.Td>
        <NumberInput
          size="xs"
          w={HERO_AWAKEN_WIDTH}
          hideControls
          min={0}
          allowNegative={false}
          allowDecimal={false}
          disabled={!grade}
          aria-label={translate('calc.heroRoster.awakenLabel', { name: hero.name })}
          value={awaken ?? ''}
          onChange={(next) => setValue(rosterAwakenField(hero.charId), String(next))}
        />
      </Table.Td>
      <Table.Td>
        <NumberInput
          size="xs"
          w={NUMBER_WIDTH}
          hideControls
          min={0}
          max={AFFINITY_MAX_LEVEL}
          allowNegative={false}
          allowDecimal={false}
          disabled={!grade}
          aria-label={translate('calc.heroRoster.affinityLabel', { name: hero.name })}
          value={affinity ?? ''}
          onChange={(next) => setValue(rosterAffinityField(hero.charId), String(next))}
        />
      </Table.Td>
      <ExclusiveWeaponCells
        weapon={weapon}
        ownerName={hero.name}
        weaponValues={{ star: weaponStar, level: weaponLevel, missionStar: weaponMissionStar }}
        setValue={setValue}
        onOpenOption={onOpenOption}
      />
    </Table.Tr>
  );
});

/**
 * 히어로 · 전용 무기 표: 히어로마다 한 줄에
 * 등급 (없음 = 미보유) · 성 · 캐릭터 각성 · 호감도와 그 히어로 전용 무기의 초월 ★ (비우면 미보유) · 강화 레벨 · 받은 초월 미션 ★.
 * 강화 레벨은 장착 효과에만 쓰여 계산에는 1슬롯 히어로 무기 줄 값만 쓰지만, 1슬롯 히어로를 바꿔도 다시 넣지 않게 무기마다 받는다.
 * 주인이 히어로 목록에 없는 전용 무기는 맨 아래에 따로 한 줄씩
 */
export function HeroRosterPanel({ values, setValue, tables, descriptions }: TabPanelProps) {
  const { t: translate, i18n } = useTranslation();
  // 히어로 이름을 화면 언어의 가나다 (알파벳) 순으로 (피규어 탭과 같은 기준)
  const heroes = useMemo(
    () => [...rosterHeroes(tables)].sort((left, right) => left.name.localeCompare(right.name, i18n.language)),
    [tables, i18n.language],
  );
  const weapons = useMemo(() => exclusiveWeapons(tables), [tables]);
  const weaponByHero = useMemo(() => new Map(weapons.map((weapon) => [weapon.charId, weapon])), [weapons]);
  const heroIds = useMemo(() => new Set(heroes.map((hero) => hero.charId)), [heroes]);
  const orphanWeapons = weapons.filter((weapon) => !heroIds.has(weapon.charId));
  /** 옵션 창을 연 무기 (닫혀 있으면 null) */
  const [optionWeaponId, setOptionWeaponId] = useState<string | null>(null);
  return (
    <Stack gap="md">
    {/* 높이가 TABLE_MAX_HEIGHT 를 넘으면 표 안에서 위아래 스크롤, 좁으면 가로 스크롤. 머리줄 (두 단) 은 맨 위 고정 */}
    <Box style={{ overflow: 'auto', maxHeight: TABLE_MAX_HEIGHT }}>
      <Table verticalSpacing={4} horizontalSpacing="xs" miw={TABLE_MIN_WIDTH} stickyHeader>
        <Table.Thead>
          <Table.Tr>
            <Table.Th colSpan={HERO_COLUMN_COUNT}>{translate('calc.heroRoster.heroGroup')}</Table.Th>
            <Table.Th colSpan={WEAPON_COLUMN_COUNT} style={{ borderLeft: WEAPON_DIVIDER }}>
              {translate('calc.heroRoster.weaponGroup')}
            </Table.Th>
          </Table.Tr>
          <Table.Tr>
            <Table.Th>{translate('calc.heroRoster.hero')}</Table.Th>
            <Table.Th>{translate('calc.heroRoster.grade')}</Table.Th>
            <Table.Th>{translate('calc.heroRoster.star')}</Table.Th>
            <Table.Th>{translate('calc.heroRoster.awaken')}</Table.Th>
            <Table.Th>{translate('calc.heroRoster.affinity')}</Table.Th>
            <Table.Th style={{ borderLeft: WEAPON_DIVIDER }}>{translate('calc.exclusiveWeapon.star')}</Table.Th>
            <Table.Th>{translate('calc.exclusiveWeapon.level')}</Table.Th>
            <Table.Th>{translate('calc.exclusiveWeapon.missionStar')}</Table.Th>
            <Table.Th>{translate('calc.exclusiveWeapon.optionColumn')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {heroes.map((hero) => {
            const weapon = weaponByHero.get(hero.charId);
            const weaponValues = weaponValuesOf(values, weapon);
            return (
              <HeroRosterRow
                key={hero.charId}
                hero={hero}
                grade={values[rosterGradeField(hero.charId)] ?? NOT_OWNED}
                star={values[rosterStarField(hero.charId)]}
                awaken={values[rosterAwakenField(hero.charId)]}
                affinity={values[rosterAffinityField(hero.charId)]}
                weapon={weapon}
                weaponStar={weaponValues.star}
                weaponLevel={weaponValues.level}
                weaponMissionStar={weaponValues.missionStar}
                tables={tables}
                setValue={setValue}
                onOpenOption={setOptionWeaponId}
              />
            );
          })}
          {orphanWeapons.map((weapon) => {
            const ownerName = translate('calc.exclusiveWeapon.unknownOwner', { id: weapon.weaponId });
            return (
              <Table.Tr key={`weapon-${weapon.weaponId}`}>
                <Table.Td colSpan={HERO_COLUMN_COUNT}>
                  <Text size="sm">{ownerName}</Text>
                </Table.Td>
                <ExclusiveWeaponCells weapon={weapon} ownerName={ownerName} weaponValues={weaponValuesOf(values, weapon)} setValue={setValue} onOpenOption={setOptionWeaponId} />
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Box>
    <ExclusiveOptionModal
      weaponId={optionWeaponId}
      onClose={() => setOptionWeaponId(null)}
      values={values}
      setValue={setValue}
      tables={tables}
      descriptions={descriptions}
      heroes={heroes}
      weapons={weapons}
    />
    </Stack>
  );
}

/**
 * 전용 무기 옵션 창: 표의 무기 줄 "옵션" 버튼으로 연다 (무기마다 저장).
 * 8칸을 다 보이고, 그 무기 초월 ★ 로 아직 안 열린 칸 (WeaponChar maxOptCnt) 은 흐리게 · 막고 다음 칸이 열리는 ★ 를 적는다.
 * 계산은 넣은 옵션 전부 (게임 m6836)
 */
function ExclusiveOptionModal({
  weaponId,
  onClose,
  values,
  setValue,
  tables,
  descriptions,
  heroes,
  weapons,
}: {
  weaponId: string | null;
  onClose: () => void;
  values: CalcValues;
  tables: StatTables;
  setValue: (fieldId: string, text: string) => void;
  descriptions: StatDescriptions;
  heroes: RosterHero[];
  weapons: ExclusiveWeapon[];
}) {
  const { t: translate } = useTranslation();
  const weapon = weapons.find((candidate) => candidate.weaponId === weaponId);
  const ownerName = weapon ? (heroes.find((hero) => hero.charId === weapon.charId)?.name ?? weapon.charId) : '';
  const star = weaponId ? values[exclusiveOwnedStarField(weaponId)] : undefined;
  const open = weaponId ? optionSlotsForStar(tables, weaponId, star) : 0;
  const nextStar = weaponId ? optionUnlockStar(tables, weaponId, open + 1) : null;
  const rowNumbers = Array.from({ length: OPTION_ROWS }, (_, index) => index + 1);
  return (
    <Modal opened={!!weaponId} onClose={onClose} title={translate('calc.exclusiveWeapon.optionTitle', { name: ownerName })}>
      {weaponId && (
        <Stack gap="xs">
          <Text size="xs" c="dimmed">
            {open < OPTION_ROWS
              ? translate('calc.exclusiveWeapon.optionOpen', { star: star ?? 0, open, next: nextStar ?? '-' })
              : translate('calc.exclusiveWeapon.optionAllOpen', { star, count: OPTION_ROWS })}
          </Text>
          <StatValueRows
            rowNumbers={rowNumbers}
            usableCount={open}
            statField={(index) => exclusiveOptionStatField(weaponId, index)}
            valueField={(index) => exclusiveOptionValueField(weaponId, index)}
            values={values}
            setValue={setValue}
            choices={diceStatChoices(tables, CONSTS.usb.WEAPON_DICE_ID, descriptions)}
            noneLabel={translate('calc.weapon.none')}
            statLabel={(index) => translate('calc.weapon.statLabel', { index })}
            valueLabel={(index) => translate('calc.weapon.valueLabel', { index })}
            valuePlaceholder={translate('calc.weapon.valuePlaceholder')}
          />
        </Stack>
      )}
    </Modal>
  );
}
