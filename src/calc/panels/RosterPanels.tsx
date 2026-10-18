/** 히어로 표 · 전용 무기 표: 가진 것만 등급·성·각성 / 초월 ★ 를 넣는다 (비우면 미보유) */
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Group, NumberInput, Table, Text } from '@mantine/core';
import { CONSTS } from '@/CONSTS';
import LazySelect from '@/components/LazySelect';
import type { StatTables } from '@/data/statTables';
import { heroFirstRow, heroGradeChoices, heroStarChoices, resolveChoice } from '@/calc/sources/hero/character';
import { HeroImage } from '@/calc/sources/hero/HeroPicker';
import { exclusiveWeapons, rosterHeroes, type ExclusiveWeapon, type RosterHero } from '@/calc/sources/hero/roster';
import {
  exclusiveMissionReceivedStarField,
  exclusiveOwnedLevelField,
  exclusiveOwnedStarField,
  rosterAffinityField,
  rosterAwakenField,
  rosterGradeField,
  rosterStarField,
} from '@/calc/sources/hero/rosterFields';
import type { TabPanelProps } from '@/calc/types';

const {
  ICON_SIZE,
  SELECT_WIDTH,
  NUMBER_WIDTH,
  TABLE_MIN_WIDTH,
  AFFINITY_MAX_LEVEL,
  HERO_GRADE_WIDTH,
  HERO_STAR_WIDTH,
  HERO_AWAKEN_WIDTH,
} = CONSTS.hero.roster;
const NOT_OWNED = '';

interface HeroRosterRowProps {
  hero: RosterHero;
  /** 칸 값 (등급 · 성 · 캐릭터 각성 · 호감도) */
  grade: string;
  star: string | undefined;
  awaken: string | undefined;
  affinity: string | undefined;
  tables: StatTables;
  setValue: TabPanelProps['setValue'];
}

/** 히어로 표 한 줄 (memo: 칸 하나를 바꾸면 그 줄만 다시 그린다) */
const HeroRosterRow = memo(function HeroRosterRow({ hero, grade, star, awaken, affinity, tables, setValue }: HeroRosterRowProps) {
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
    </Table.Tr>
  );
});

/** 히어로 표: 히어로마다 등급 (없음 = 미보유) · 성 · 캐릭터 각성 */
export function HeroRosterPanel({ values, setValue, tables }: TabPanelProps) {
  const { t: translate } = useTranslation();
  const heroes = useMemo(() => rosterHeroes(tables), [tables]);
  return (
    <Table.ScrollContainer minWidth={TABLE_MIN_WIDTH}>
      <Table verticalSpacing={4} horizontalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{translate('calc.heroRoster.hero')}</Table.Th>
            <Table.Th>{translate('calc.heroRoster.grade')}</Table.Th>
            <Table.Th>{translate('calc.heroRoster.star')}</Table.Th>
            <Table.Th>{translate('calc.heroRoster.awaken')}</Table.Th>
            <Table.Th>{translate('calc.heroRoster.affinity')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {heroes.map((hero) => (
            <HeroRosterRow
              key={hero.charId}
              hero={hero}
              grade={values[rosterGradeField(hero.charId)] ?? NOT_OWNED}
              star={values[rosterStarField(hero.charId)]}
              awaken={values[rosterAwakenField(hero.charId)]}
              affinity={values[rosterAffinityField(hero.charId)]}
              tables={tables}
              setValue={setValue}
            />
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

interface ExclusiveWeaponRowProps {
  weapon: ExclusiveWeapon;
  owner: RosterHero | undefined;
  /** 칸 값 (초월 ★ · 강화 레벨) */
  star: string | undefined;
  level: string | undefined;
  /** 받은 초월 미션 ★ (비어 있으면 초월 ★ 까지 받은 것으로 침) */
  missionStar: string | undefined;
  tables: StatTables;
  setValue: TabPanelProps['setValue'];
}

/** 전용 무기 표 한 줄 (memo: 칸 하나를 바꾸면 그 줄만 다시 그린다) */
const ExclusiveWeaponRow = memo(function ExclusiveWeaponRow({
  weapon,
  owner,
  star,
  level,
  missionStar,
  tables,
  setValue,
}: ExclusiveWeaponRowProps) {
  const { t: translate } = useTranslation();
  const ownerName = owner?.name ?? translate('calc.exclusiveWeapon.unknownOwner', { id: weapon.weaponId });
  const starField = exclusiveOwnedStarField(weapon.weaponId);
  const owned = !!star;
  const levelField = exclusiveOwnedLevelField(weapon.weaponId);
  const missionStarField = exclusiveMissionReceivedStarField(weapon.weaponId);
  return (
    <Table.Tr style={{ opacity: owned ? undefined : CONSTS.heroWeaponCardPet.ui.UNUSED_OPACITY }}>
      <Table.Td>
        <Group gap={6} wrap="nowrap">
          <HeroImage hero={owner ? heroFirstRow(tables, owner.name) : undefined} size={ICON_SIZE} />
          <Text size="sm">{ownerName}</Text>
        </Group>
      </Table.Td>
      <Table.Td>
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
          onChange={(next) => setValue(starField, next ?? NOT_OWNED)}
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
          onChange={(next) => setValue(levelField, String(next))}
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
          onChange={(next) => setValue(missionStarField, String(next))}
        />
      </Table.Td>
    </Table.Tr>
  );
});

/**
 * 전용 무기 표: 무기마다 초월 ★ (비우면 미보유) · 강화 레벨. 강화 레벨은 장착 효과에만 쓰여 계산에는 1슬롯 히어로 무기 줄 값만 쓰지만,
 * 1슬롯 히어로를 바꿔도 다시 넣지 않게 무기마다 받는다
 */
export function ExclusiveWeaponRosterPanel({ values, setValue, tables }: TabPanelProps) {
  const { t: translate } = useTranslation();
  const weapons = useMemo(() => exclusiveWeapons(tables), [tables]);
  // 무기 주인 히어로 (히어로 목록은 한 번만 만든다)
  const heroById = useMemo(
    () => new Map(tables.Character ? rosterHeroes(tables).map((hero) => [hero.charId, hero]) : []),
    [tables],
  );
  return (
    <Table.ScrollContainer minWidth={TABLE_MIN_WIDTH}>
      <Table verticalSpacing={4} horizontalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{translate('calc.exclusiveWeapon.owner')}</Table.Th>
            <Table.Th>{translate('calc.exclusiveWeapon.star')}</Table.Th>
            <Table.Th>{translate('calc.exclusiveWeapon.level')}</Table.Th>
            <Table.Th>{translate('calc.exclusiveWeapon.missionStar')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {weapons.map((weapon) => (
            <ExclusiveWeaponRow
              key={weapon.weaponId}
              weapon={weapon}
              owner={heroById.get(weapon.charId)}
              star={values[exclusiveOwnedStarField(weapon.weaponId)]}
              level={values[exclusiveOwnedLevelField(weapon.weaponId)]}
              missionStar={values[exclusiveMissionReceivedStarField(weapon.weaponId)]}
              tables={tables}
              setValue={setValue}
            />
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
