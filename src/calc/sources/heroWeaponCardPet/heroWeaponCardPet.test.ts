import { beforeAll, describe, expect, it } from 'vitest';
import i18n from 'i18next';
import '@/i18n';
import CardSetTable from '../../../../public/data/tables/CardSet.json';
import CardStickerSetTable from '../../../../public/data/tables/CardStickerSet.json';
import CardTable from '../../../../public/data/tables/Card.json';
import CharacterTable from '../../../../public/data/tables/Character.json';
import ContentMissionTable from '../../../../public/data/tables/ContentMission.json';
import DiceOptionTable from '../../../../public/data/tables/DiceOption.json';
import LibraryTable from '../../../../public/data/tables/Library.json';
import OptionTable from '../../../../public/data/tables/Option.json';
import PetRegionTable from '../../../../public/data/tables/PetRegion.json';
import PetTable from '../../../../public/data/tables/Pet.json';
import SoulForgeTable from '../../../../public/data/tables/SoulForge.json';
import WeaponCharTable from '../../../../public/data/tables/WeaponChar.json';
import WeaponJobTable from '../../../../public/data/tables/WeaponJob.json';
import WeaponLinkTable from '../../../../public/data/tables/WeaponLink.json';
import WeaponTranscendTable from '../../../../public/data/tables/WeaponTranscend.json';
import RelicTable from '../../../../public/data/tables/Relic.json';
import { tableRows, type StatTables } from '@/data/statTables';
import type { Line } from '@/calc/combine';
import { formatLog } from '@/calc/gameNumber';
import type { CalcValues } from '@/calc/types';
import { cardCountsByGrade, cardSlotGradeStars, cardStackLines, countExpandedLines, sssCardCount } from '@/calc/sources/heroWeaponCardPet/card';
import { EXPECTED_FROM_HTML } from '@/calc/sources/heroWeaponCardPet/expectedFromHtml';
import { equippedPetIds, heroWeaponCardPetTabs } from '@/calc/sources/heroWeaponCardPet/index';
import { libraryArchiveLevel } from '@/calc/sources/heroWeaponCardPet/library';
import { mineMultiplier } from '@/calc/sources/heroWeaponCardPet/mine';
import { maxStagePetCounts, ownedPetField, petLines, petRegionLevelField, petRegionLines, petRegionUnlocked } from '@/calc/sources/heroWeaponCardPet/pet';
import { gradeStarValue, type SourceLabel } from '@/calc/sources/heroWeaponCardPet/shared';
import {
  equipWeaponRelicMultiplier,
  exclusiveWeaponEffectFromValues,
  exclusiveWeaponLines,
  linkLevelField,
  normalWeaponPossessEffect,
  openOptionSlots,
  receivedMissionStar,
  weaponLinkLog,
  weaponTotalAtk,
} from '@/calc/sources/heroWeaponCardPet/weapon';
import { exclusiveMissionReceivedStarField, exclusiveOwnedStarField } from '@/calc/sources/hero/rosterFields';
import { normalWeaponLevelFieldId } from '@/calc/sources/trainingRelic/relic';

/** 기대값은 기존 htmls/stat-calc.html 에 같은 입력을 넣어 읽은 값 (scripts/expected_hero_weapon_card_pet.py) */
const tables = {
  Card: CardTable,
  CardSet: CardSetTable,
  CardStickerSet: CardStickerSetTable,
  Character: CharacterTable,
  ContentMission: ContentMissionTable,
  DiceOption: DiceOptionTable,
  Library: LibraryTable,
  Pet: PetTable,
  SoulForge: SoulForgeTable,
  WeaponChar: WeaponCharTable,
  WeaponJob: WeaponJobTable,
  WeaponTranscend: WeaponTranscendTable,
} as unknown as StatTables;

/** 유물 표는 전용 무기 장착 효과 배수 테스트에서만 붙인다 (다른 기대값은 기존 HTML 이 유물 없이 읽은 값) */
const relicTables = { Relic: RelicTable } as unknown as StatTables;

const label: SourceLabel = (key, params) => i18n.t(key, params);
const LOG_DIGITS = 9;

beforeAll(async () => {
  if (!i18n.isInitialized) await new Promise((resolve) => i18n.on('initialized', resolve));
});

function tabLines(tabId: string, values: CalcValues): Line[] {
  const tab = heroWeaponCardPetTabs.find((candidate) => candidate.id === tabId);
  if (!tab) throw new Error(tabId);
  return tab.lines(values, tables);
}

/** 기존 줄 (값이 없는 쪽은 브라우저에서 읽을 때 null 이 됨) */
interface ExpectedLine {
  source: string;
  stat: string;
  value: number | null;
  log: number | null;
}

/** 출처 글·스탯 (대소문자는 합산 단계가 합치므로 무시)·값이 같은지 */
function expectSameLines(actual: Line[], expected: readonly ExpectedLine[]) {
  expect(actual.map((line) => line.source)).toEqual(expected.map((line) => line.source));
  expected.forEach((expectedLine, index) => {
    const line = actual[index];
    expect(line.stat.toLowerCase()).toBe(expectedLine.stat.toLowerCase());
    if (expectedLine.log !== null) {
      expect(line.value).toBeUndefined();
      expect(line.log).toBeCloseTo(expectedLine.log, LOG_DIGITS);
    } else {
      expect(line.log).toBeUndefined();
      expect(line.value).toBeCloseTo(Number(expectedLine.value), LOG_DIGITS);
    }
  });
}

const TAB_OF_SCENARIO: Record<keyof typeof EXPECTED_FROM_HTML, string> = {
  libraryLow: 'library',
  libraryHigh: 'library',
  weaponWithHero: 'weapon',
  weaponNoHero: 'weapon',
  card: 'card',
  pet: 'pet',
  petAilmentLeader: 'pet',
  mine: 'mine',
};

/**
 * 기존 HTML 과 일부러 다르게 바꾼 경우 (아래 "바뀐 계산" 에서 따로 확인):
 * weaponWithHero = 웨폰 링크를 화면 값 대신 레벨로 계산, card = 등급·성을 고르기 전엔 세트 마크를 세지 않음
 */
const CHANGED_FROM_HTML = new Set(['weaponWithHero', 'card', 'mine', 'weaponNoHero']);

describe('기존 HTML 과 같은 줄', () => {
  it.each((Object.keys(TAB_OF_SCENARIO) as Array<keyof typeof EXPECTED_FROM_HTML>).filter((scenario) => !CHANGED_FROM_HTML.has(scenario)))('%s', (scenario) => {
    const expected = EXPECTED_FROM_HTML[scenario];
    expect(expected.notAccepted).toEqual([]);
    expectSameLines(tabLines(TAB_OF_SCENARIO[scenario], { ...expected.values }), expected.lines);
  });
});

describe('바뀐 계산', () => {
  it('무기 (히어로 없음): 소울포지는 탭 따로 (게임 식으로 바뀜, 아래 소울포지 시험), 무기 옵션은 전용 무기를 끼지 않았으니 칸이 닫혀 줄 없음. 나머지 줄은 기존 HTML 과 같음', () => {
    const expected = EXPECTED_FROM_HTML.weaponNoHero;
    const values = { ...expected.values };
    const isOption = (line: { source: string }) => line.source.startsWith('무기 옵션');
    const isSoulForge = (line: { source: string }) => line.source.startsWith('소울포지');
    expectSameLines(
      tabLines('weapon', values),
      expected.lines.filter((line) => !isOption(line) && !isSoulForge(line)),
    );
    expect(tabLines('weapon', values).filter(isOption)).toEqual([]);
  });

  it('무기 옵션: 전용 무기 장착 + 강화 레벨에 따라 열린 칸만 (레벨 50 = 3칸)', () => {
    const values: CalcValues = {
      charName: '에이카',
      exclusiveEquipped: 'true',
      weaponLevel: '50',
      weaponOptionStat1: '_per_attackDamage',
      weaponOptionValue1: '100%',
      weaponOptionStat3: '_per_hp',
      weaponOptionValue3: '50%',
      weaponOptionStat4: '_per_hp',
      weaponOptionValue4: '70%',
    };
    expect(openOptionSlots(values, tables)).toBe(3);
    const optionLines = tabLines('weapon', values).filter((line) => line.source.startsWith('무기 옵션'));
    expect(optionLines.map((line) => line.source)).toEqual(['무기 옵션 1번', '무기 옵션 3번']);
    expect(openOptionSlots({ ...values, exclusiveEquipped: 'false' }, tables)).toBe(0);
    expect(openOptionSlots({ ...values, weaponLevel: '7500' }, tables)).toBe(8);
  });

  it('전용 무기 초월 스탯 줄 (statType 1~4): 그 히어로가 전용 무기를 장착했을 때만 (게임 @306b564), 같은 스탯은 줄마다 따로', () => {
    const values: CalcValues = { charName: '에이카', exclusiveOwnedStar_1021: '11', exclusiveOwnedLevel_1021: '10' };
    const transcendLines = (input: CalcValues) =>
      exclusiveWeaponLines(input, tables, label).filter((line) => line.source !== label('calc.weapon.sources.exclusive'));
    // ★ 만 있고 장착 안 함 / 장착 껐음 = 초월 줄 없음
    expect(transcendLines(values)).toEqual([]);
    expect(transcendLines({ ...values, exclusiveEquipped: 'false' })).toEqual([]);
    // 장착하면 ★11 이하의 statType 1~4 줄 (교체 스킬 ★2/5/8, 전용 스킬 ★3/6/9, 공격력 ★11)
    const equippedLines = transcendLines({ ...values, exclusiveEquipped: 'true' });
    expect(equippedLines.map((line) => line.stat)).toEqual(
      expect.arrayContaining(['_per_ChangeSkillDamage', '_per_CharSkillDamage', '_per_attackDamage']),
    );
    expect(equippedLines.filter((line) => line.stat === '_per_ChangeSkillDamage')).toHaveLength(3);
    expect(equippedLines.filter((line) => line.stat === '_per_attackDamage').map((line) => line.value)).toEqual([100]);
  });

  it('광산: 투자 레벨 · 광부 각성 총합 → 축복 (이 계정 화면 14·17 = 36.8A%, 14·18 = 38.85A%), 합산에는 화면 값 + 100%', () => {
    const screenOf = (level: string, awakenTotal: string) => {
      const multiplier = mineMultiplier({ mineLevel: level, mineAwakenLevel: awakenTotal })!;
      return formatLog(Math.log10(multiplier - 1) + 2);
    };
    expect(screenOf('14', '17')).toBe('36.80A');
    expect(screenOf('14', '18')).toBe('38.85A');
    const lines = tabLines('mine', { mineLevel: '14', mineAwakenLevel: '18' });
    expect(lines.map((line) => line.stat)).toEqual(['_per_attackDamage', '_per_hp']);
    expect(lines[0].log).toBeCloseTo(Math.log10(38_950), 12);
    expect(tabLines('mine', { mineAwakenLevel: '18' })).toEqual([]);
  });

  it('웨폰 링크: 레벨 + 초월 별 → 직업 행 값 × (1 + 900%) (이 계정 화면 818.2A% / 818A% / 792.6A% / 793A%)', () => {
    const linkTables = { ...tables, WeaponLink: WeaponLinkTable } as unknown as StatTables;
    const values: CalcValues = {
      weaponLinkStar: '1',
      [linkLevelField('Swordsman')]: '192',
      [linkLevelField('Fighter')]: '192',
      [linkLevelField('Archer')]: '191',
      [linkLevelField('Mage')]: '191',
    };
    expect(['Swordsman', 'Fighter', 'Archer', 'Mage'].map((job) => formatLog(weaponLinkLog(values, linkTables, job)!))).toEqual([
      '818.20A',
      '818.00A',
      '792.60A',
      '793.00A',
    ]);
  });
  it('무기 누적 능력치: 보유 전용 무기 ★ → 초월 미션 공격력 보상 곱 (02:48 저장 데이터 trscLv → 화면 1,282% = 1,282.187%)', () => {
    // claude-docs/device_data/2026-10-07_0248_219 Equip.json psCharWeaponDic 의 trscLv 그대로. 장착 여부는 넣지 않음 (보유 효과)
    const starOfWeapon: Record<string, string> = {
      '1005': '5', '1021': '13', '1022': '2', '1031': '1', '1026': '2', '1001': '4', '1025': '1',
      '1019': '1', '1015': '1', '1006': '2', '1020': '1', '1027': '1', '1004': '1',
    };
    const values: CalcValues = Object.fromEntries(
      Object.entries(starOfWeapon).map(([weaponId, star]) => [exclusiveOwnedStarField(weaponId), star]),
    );
    const total = weaponTotalAtk(values, tables)!;
    // 빙결의 숨결 ★13 = 6개, ★4·★5 무기 2개 × 2개, 나머지 ★1·★2 무기 10개 × 1개
    expect(total.missionCount).toBe(20);
    expect(Math.pow(10, total.percentLog)).toBeCloseTo(1282.187013, 5);
    const totalLines = tabLines('weapon', values).filter((line) => line.source === '무기 누적 능력치 (전용 무기 ★)');
    expect(totalLines).toEqual([{ source: '무기 누적 능력치 (전용 무기 ★)', stat: '_per_attackDamage', log: total.percentLog }]);
    // ★ 를 하나도 안 넣으면 줄 없음
    expect(weaponTotalAtk({}, tables)).toBeNull();
  });
  it('무기 누적 능력치: 받은 초월 미션 ★ 칸을 넣으면 그 ★ 까지의 보상만 곱하고, 비우면 초월 ★ 까지 받은 것으로 침 (1.9 받은 미션)', () => {
    const star = { [exclusiveOwnedStarField('1021')]: '13' };
    const allReceived = weaponTotalAtk(star, tables)!;
    expect(allReceived.missionCount).toBe(6);
    // 같은 무기에서 5 번째까지만 받음 → 초월 미션 보상 공격력 줄 수가 ★5 이하로 줄어든다
    const rewardsAtOrBelow = (limit: number) =>
      tableRows(tables.ContentMission).filter(
        (row) =>
          row.groupId === '1021' && row.missionType === 'WeaponChar_Trans' && row.rwdStat === '_per_attackDamage' && Number(row.condValue0) <= limit,
      );
    const partial = weaponTotalAtk({ ...star, [exclusiveMissionReceivedStarField('1021')]: '5' }, tables)!;
    expect(partial.missionCount).toBe(rewardsAtOrBelow(5).length);
    expect(partial.missionCount).toBeLessThan(allReceived.missionCount);
    const expectedLog = rewardsAtOrBelow(5).reduce((sum, row) => sum + Math.log10(1 + Number(row.rwdStatVal) / 100), 0);
    expect(Math.pow(10, partial.percentLog)).toBeCloseTo((Math.pow(10, expectedLog) - 1) * 100, 6);
    // 0 을 넣으면 받은 것이 없어 줄 없음 (비운 칸과 다름)
    expect(weaponTotalAtk({ ...star, [exclusiveMissionReceivedStarField('1021')]: '0' }, tables)).toBeNull();
    expect(receivedMissionStar({ ...star }, '1021')).toBe(13);
    expect(receivedMissionStar({ ...star, [exclusiveMissionReceivedStarField('1021')]: '5' }, '1021')).toBe(5);
  });
  it('일반 무기 보유 효과: 무기 칸에 레벨을 넣으면 그 레벨로 (보유 기본 + 강화당 x 레벨), 비운 칸은 최대 레벨 (1.14)', () => {
    const rows = tableRows(tables.WeaponJob);
    const expectedLog = (levelOf: (row: (typeof rows)[number]) => number) =>
      rows.reduce((sum, row) => sum + Math.log10(1 + (Number(row.possAbilVal1) + Number(row.possAbilEnh1) * levelOf(row)) / 100), 0);
    expect(normalWeaponPossessEffect(tables)!.multiplierLog).toBeCloseTo(expectedLog((row) => Number(row.maxLv)), 9);
    // 모든 무기를 0 레벨로 넣으면 보유 기본값만
    const zeros: CalcValues = Object.fromEntries(rows.map((row) => [normalWeaponLevelFieldId(row.weaponId), '0']));
    expect(normalWeaponPossessEffect(tables, zeros)!.multiplierLog).toBeCloseTo(expectedLog(() => 0), 9);
    expect(normalWeaponPossessEffect(tables, zeros)!.multiplierLog).toBeLessThan(normalWeaponPossessEffect(tables)!.multiplierLog);
    // 한 개만 7 레벨로 넣고 나머지는 비움 (최대)
    const [first] = rows;
    const one = { [normalWeaponLevelFieldId(first.weaponId)]: '7' };
    expect(normalWeaponPossessEffect(tables, one)!.multiplierLog).toBeCloseTo(
      expectedLog((row) => (row === first ? 7 : Number(row.maxLv))),
      9,
    );
    // 무기 탭 줄에도 같은 값이 들어간다
    const possessLine = tabLines('weapon', one).find((line) => line.stat === '_per_hp');
    expect(possessLine?.log).toBeCloseTo(normalWeaponPossessEffect(tables, one)!.percentLog, 9);
  });
  it('몬스터 카드: 등급·성을 고르기 전엔 세트 마크를 세지 않는다', () => {
    expect(tabLines('card', { cardSlot1: '1', cardSetPick1_1: '1' })).toEqual([]);
  });
});

describe('화면 표시 값', () => {
  it('기록 보관소 레벨', () => {
    for (const scenario of ['libraryLow', 'libraryHigh'] as const) {
      const expected = EXPECTED_FROM_HTML[scenario];
      expect(`기록 보관소 레벨 ${libraryArchiveLevel({ ...expected.values })}`).toBe(expected.screen.libraryMainLevel);
    }
  });
  it('전용 무기 장착 효과 표 (★ 상한으로 레벨을 자름)', () => {
    const withHero = exclusiveWeaponEffectFromValues({ ...EXPECTED_FROM_HTML.weaponWithHero.values }, tables);
    expect(`${formatLog(Math.log10(withHero?.percent ?? 0))}%`).toBe('390.41F%');
    expect(withHero?.level).toBe(3400);
    const noHero = exclusiveWeaponEffectFromValues({ ...EXPECTED_FROM_HTML.weaponNoHero.values }, tables);
    expect(EXPECTED_FROM_HTML.weaponNoHero.screen.weaponResult).toBe(
      `장착 효과 공격력 (기본 + 강화당 × 레벨, 화면 확인)${formatLog(Math.log10(noHero?.percent ?? 0))}%강화 레벨 (최대 ${noHero?.maxLv})${noHero?.level}`,
    );
  });
  it('일반 무기 보유 효과', () => {
    const possess = normalWeaponPossessEffect(tables);
    expect(`${possess?.weaponCount}종 만렙: 체력 ×${formatLog(possess?.multiplierLog)}`).toBe(EXPECTED_FROM_HTML.card.screen.possess);
  });
  it('장착 SSS 카드 장수 = 등급이 SSS 이상인 칸 수, 별 무관 (게임 코드 m2688 @33ec108, work_collect/README.md 1-1)', () => {
    // 기존 HTML 은 SSS 등급만 별과 상관없이 셌다 (2장: SSS 1성·2성). 게임은 SSS 이상이라 이 입력의 R 15 칸도 세어 3장
    expect(EXPECTED_FROM_HTML.card.screen.sssCards).toBe(2);
    expect(sssCardCount(cardSlotGradeStars({ ...EXPECTED_FROM_HTML.card.values }, tables))).toBe(3);
    expect(sssCardCount(cardSlotGradeStars({}, tables))).toBe(0);
    // 02:48 편성처럼 SSS 7성 2장 + 6성 1장 → 3장
    const formation: CalcValues = {
      cardSlot1: '36',
      cardSlotGrade1: 'SSS_7',
      cardSlot2: '33',
      cardSlotGrade2: 'SSS_6',
      cardSlot3: '32',
      cardSlotGrade3: 'SSS_7',
    };
    expect(cardSlotGradeStars(formation, tables).slice(0, 3)).toEqual([
      { grade: 'SSS', star: 7 },
      { grade: 'SSS', star: 6 },
      { grade: 'SSS', star: 7 },
    ]);
    expect(sssCardCount(cardSlotGradeStars(formation, tables))).toBe(3);
    // SS 는 세지 않고, SSS 와 그 위 등급 (SSR) 은 별과 상관없이 센다
    expect(
      sssCardCount([
        { grade: 'SSS', star: 10 },
        { grade: 'SSS', star: 6 },
        { grade: 'SSR', star: 10 },
        { grade: 'SS', star: 10 },
        { grade: '', star: 0 },
      ]),
    ).toBe(3);
  });
});

describe('전용 무기 장착 효과 × 유물 _per_<직업>_EquipWeapon (gap-atk-increase-provider.md 4-3)', () => {
  /** 전용 무기가 있는 히어로 하나와 그 직업의 EquipWeapon 유물 (입력은 표에서 골라 테스트 안에서 만든다) */
  function equipScenario() {
    const weaponRow = tableRows(tables.WeaponChar)[0];
    const hero = tableRows(tables.Character).find((row) => row.charId === weaponRow.charId)!;
    const relicRow = tableRows(relicTables.Relic).find((row) => row.statType === `_per_${hero.job}_EquipWeapon`)!;
    const baseValues: CalcValues = {
      charName: hero.name,
      exclusiveEquipped: 'true',
      weaponStar: weaponRow.star,
      weaponLevel: '10',
    };
    const withRelicTables = { ...tables, Relic: relicTables.Relic } as StatTables;
    return { baseValues, relicRow, withRelicTables };
  }
  const equipLineValue = (values: CalcValues, withTables: StatTables) =>
    exclusiveWeaponLines(values, withTables, label).find((line) => line.source === label('calc.weapon.sources.exclusive'))
      ?.value as number;

  it('유물을 안 가졌으면 배수 1, 가졌으면 장착 효과 × (1 + 유물 값 / 100)', () => {
    const { baseValues, relicRow, withRelicTables } = equipScenario();
    const effect = exclusiveWeaponEffectFromValues(baseValues, withRelicTables)!;
    expect(equipWeaponRelicMultiplier(baseValues, withRelicTables)).toBe(1);
    expect(equipLineValue(baseValues, withRelicTables)).toBeCloseTo(effect.percent, 9);
    const owned = { ...baseValues, [`relic_${relicRow.relicId}`]: '5' };
    const relicPercent = Number(relicRow.baseVal) + Number(relicRow.enhVal) * 5;
    expect(equipWeaponRelicMultiplier(owned, withRelicTables)).toBeCloseTo(1 + relicPercent / 100, 9);
    expect(equipLineValue(owned, withRelicTables)).toBeCloseTo(effect.percent * (1 + relicPercent / 100), 6);
  });

  it('유물 표가 없거나 히어로가 없으면 배수 1', () => {
    const { baseValues } = equipScenario();
    expect(equipWeaponRelicMultiplier(baseValues, tables)).toBe(1);
    expect(equipWeaponRelicMultiplier({}, tables)).toBe(1);
  });
});

/** 게임 m6913 @3077214 (stat-provider-formulas.md 3-20절). 표 SoulForge: Lv1 = 기본 40 · 남 20 (bonus 1) · 여 20 (bonus 2), Lv2 = 기본 60 · 불 20 (1) · 물 20 (2) · 땅 20 (3) */
describe('소울포지 (영혼 단조) 게임 식', () => {
  const lineOf = (line: Line) => [line.stat, line.value];

  it('레벨이 비어 있으면 줄 없음, 레벨 1 에서 슬롯을 하나도 안 켜면 줄 없음 (현재 레벨 기본 행은 안 들어감)', () => {
    expect(tabLines('soulForge', {})).toEqual([]);
    expect(tabLines('soulForge', { soulForgeLevel: '1' })).toEqual([]);
  });

  it('낮은 레벨은 슬롯과 상관없이 전부: 기본 행은 표 값 그대로, 슬롯 행은 그 레벨 마지막 행 bonusValue 배 (Lv3 = Lv1 의 2배, Lv2 의 3배)', () => {
    expect(tabLines('soulForge', { soulForgeLevel: '3' }).map(lineOf)).toEqual([
      ['_per_attackDamage', 40],
      ['_per_Male_AttackDamage', 40],
      ['_per_Female_AttackDamage', 40],
      ['_per_attackDamage', 60],
      ['_per_FireHero_AttackDamage', 60],
      ['_per_WaterHero_AttackDamage', 60],
      ['_per_EarthHero_AttackDamage', 60],
    ]);
  });

  it('현재 레벨은 켠 슬롯만, 켠 슬롯 수 k 의 bonusValue 배 (Lv1: 슬롯 1개 → x1, 둘 → x2)', () => {
    const one = tabLines('soulForge', { soulForgeLevel: '1', soulForgeSlot_1: 'true' }).map(lineOf);
    expect(one).toEqual([['_per_Male_AttackDamage', 20]]);
    const both = tabLines('soulForge', { soulForgeLevel: '1', soulForgeSlot_1: 'true', soulForgeSlot_2: 'true' }).map(lineOf);
    expect(both).toEqual([
      ['_per_Male_AttackDamage', 40],
      ['_per_Female_AttackDamage', 40],
    ]);
    // 꺼짐 ('false') 이거나 비어 있으면 안 켜진 것
    expect(tabLines('soulForge', { soulForgeLevel: '1', soulForgeSlot_1: 'false' })).toEqual([]);
  });
});

describe('펫 지역 (T1286 m6886, stat-provider-formulas.md 3-16절 · combat-power-petregion-gamecode.md 3절)', () => {
  const regionTables = { ...tables, PetRegion: PetRegionTable, Option: OptionTable } as unknown as StatTables;
  const petRows = tableRows(tables.Pet);
  const lastStageChoice = (petId: string) => {
    const rows = petRows.filter((row) => row.petId === petId);
    return gradeStarValue(rows[rows.length - 1]);
  };
  const firstPetOf = (attribute: string) => petRows.find((row) => row.attribute === attribute)!.petId;
  const regionLines = (values: CalcValues) => petRegionLines(values, regionTables, label);

  it('마지막 단계 (표에 다음 행이 없는) 펫이 없으면 열리지 않아 줄 없음 (지역 레벨을 넣어도)', () => {
    const waterPet = firstPetOf('Water');
    const notLast = petRows.filter((row) => row.petId === waterPet)[0];
    const values: CalcValues = {
      [ownedPetField(waterPet)]: gradeStarValue(notLast),
      [petRegionLevelField('Fire')]: '10',
      [petRegionLevelField('Water')]: '10',
    };
    expect(petRegionUnlocked(values, regionTables)).toBe(false);
    expect(regionLines(values)).toEqual([]);
  });

  it('지역 레벨 칸이 비어 있으면 열려도 줄 없음 (기본값 비어 있음)', () => {
    const values: CalcValues = { [ownedPetField(firstPetOf('Water'))]: lastStageChoice(firstPetOf('Water')) };
    expect(petRegionUnlocked(values, regionTables)).toBe(true);
    expect(regionLines(values)).toEqual([]);
  });

  it('열리면 속성마다 지역 특성 = 표 traitAtk · traitHp x (1 + f), f = 같은 속성 마지막 단계 펫 수 N 의 PET_PLACEMENT_PER_N / 100 (N = 0 이면 0)', () => {
    const waterPet = firstPetOf('Water');
    const values: CalcValues = {
      [ownedPetField(waterPet)]: lastStageChoice(waterPet),
      [petRegionLevelField('Fire')]: '1',
      [petRegionLevelField('Water')]: '1',
    };
    expect(maxStagePetCounts(values, regionTables)).toEqual({ Water: 1 });
    // 레벨 1 은 traitAtk 8 · traitHp 8, 불 지역은 마지막 단계 불 펫 0마리라 f = 0, 물 지역은 1마리라 f = 100 / 100 = 1 → 16
    expect(regionLines(values).map((line) => [line.stat, line.value])).toEqual([
      ['_per_attackDamage', 8],
      ['_per_hp', 8],
      ['_per_attackDamage', 16],
      ['_per_hp', 16],
    ]);
  });

  it('지역 레벨이 오르면 표 값이 오르고 (레벨 2 는 16), 땅 지역 레벨이 비어 있으면 그 지역만 빠짐', () => {
    const waterPet = firstPetOf('Water');
    const values: CalcValues = {
      [ownedPetField(waterPet)]: lastStageChoice(waterPet),
      [petRegionLevelField('Fire')]: '2',
    };
    expect(regionLines(values).map((line) => [line.stat, line.value])).toEqual([
      ['_per_attackDamage', 16],
      ['_per_hp', 16],
    ]);
  });

  it('펫 탭 줄에 들어가고, 입력이 비면 줄 없음', () => {
    const waterPet = firstPetOf('Water');
    const values: CalcValues = { [ownedPetField(waterPet)]: lastStageChoice(waterPet), [petRegionLevelField('Water')]: '1' };
    const petTab = heroWeaponCardPetTabs.find((candidate) => candidate.id === 'pet')!;
    expect(petTab.tableNames).toEqual(expect.arrayContaining(['PetRegion', 'Option']));
    expect(petTab.lines(values, regionTables).filter((line) => line.source.startsWith('펫 지역'))).toHaveLength(2);
    expect(petTab.lines({}, regionTables)).toEqual([]);
  });
});

describe('입력이 비어 있을 때', () => {
  it('일반 무기 보유 효과 줄만 남는다 (기존 HTML 도 같음)', () => {
    expect(tabLines('library', {})).toEqual([]);
    expect(tabLines('card', {})).toEqual([]);
    expect(tabLines('pet', {})).toEqual([]);
    expect(tabLines('mine', {})).toEqual([]);
    expect(tabLines('weapon', {}).map((line) => line.stat)).toEqual(['_per_hp']);
  });
});

describe('출처 합산 단계용 함수', () => {
  it('SSS 카드 장착 수 줄은 장수만큼 곱하고, 전투 조건 줄은 이름만 모은다 (stat-calc.html countExpandedLines 그대로)', () => {
    const lines: Line[] = [
      { source: '세트', stat: '_per_hp_SSSMonsterCardCnt', value: 10 },
      { source: '카드', stat: '_per_attackDamage_Kill', value: 5 },
      { source: '카드', stat: '_per_attackDamage_MonsterCntLong', value: 7 },
      { source: '그 밖', stat: '_per_hp', value: 3 },
    ];
    const expanded = countExpandedLines(lines, 2, label);
    expect(expanded.lines).toEqual([
      { source: '세트 × SSS 등급 이상 2장', stat: '_per_hp', value: 20 },
      lines[1],
      lines[2],
      lines[3],
    ]);
    expect(expanded.skippedStats).toEqual(['_per_attackDamage_Kill', '_per_attackDamage_MonsterCntLong']);
  });
  it('적 수 5 이상 칸을 켜면 _MonsterCntLong 줄만 꼬리말을 뗀 일반 스탯으로 합산하고, 끄면 지금과 같다 (gap-atk-increase-provider.md 4-5)', () => {
    const lines: Line[] = [
      { source: '카드', stat: '_per_attackDamage_Kill', value: 5 },
      { source: '카드', stat: '_per_attackDamage_MonsterCntLong', value: 700 },
    ];
    expect(countExpandedLines(lines, 0, label, false)).toEqual(countExpandedLines(lines, 0, label));
    const reached = countExpandedLines(lines, 0, label, true);
    expect(reached.lines[0]).toEqual(lines[0]);
    expect(reached.lines[1]).toEqual({ source: '카드 (주위 적 수 조건)', stat: '_per_attackDamage', value: 700 });
    expect(reached.skippedStats).toEqual(['_per_attackDamage_Kill']);
  });
  it('카드 2번 처치 중첩 140% 는 5중첩 선형으로 x8 (공격력 % 700), 카드 3번 스킬 사용 160% 는 x9 (공격력 % 800) (combat0113.py 112~115)', () => {
    const lines: Line[] = [
      { source: '카드 2번', stat: '_per_attackDamage_Kill', value: 140 },
      { source: '카드 3번', stat: 'attackDamage_useSkill', value: 160 },
    ];
    const stacks = cardStackLines(lines, label);
    expect(stacks.map((line) => line.stat)).toEqual(['_per_attackDamage', '_per_attackDamage']);
    expect(stacks[0].value).toBeCloseTo(700, 9);
    expect(stacks[1].value).toBeCloseTo(800, 9);
    expect(Math.log10(1 + (stacks[0].value as number) / 100)).toBeCloseTo(0.90309, 5);
    expect(Math.log10(1 + (stacks[1].value as number) / 100)).toBeCloseTo(0.95424, 5);
  });
  it('같은 이름의 처치 중첩 줄이 둘이면 게임처럼 먼저 곱해 합친 뒤 (v − 1) x 5 (두 장 140%·50% → v = 2.4 x 1.5 = 3.6 → 1 + 2.6 x 5 = 14)', () => {
    const lines: Line[] = [
      { source: '카드 가', stat: '_per_attackDamage_Kill', value: 140 },
      { source: '카드 나', stat: '_per_attackDamage_Kill', value: 50 },
    ];
    const stack = cardStackLines(lines, label)[0];
    expect(1 + (stack.value as number) / 100).toBeCloseTo(14, 9);
  });
  it('처치·스킬 사용 중첩 이름이 없으면 줄 없음', () => {
    expect(cardStackLines([{ source: '카드', stat: '_per_attackDamage', value: 5 }], label)).toEqual([]);
  });
  it('R 이상 · UR 이상 카드 장착 수 이름도 SSS 이상처럼 장수만큼 곱한다 (m2688 의 등급 문턱 6개)', () => {
    const lines: Line[] = [
      { source: '가', stat: '_per_attackDamage_RMonsterCardCnt', value: 10 },
      { source: '나', stat: '_per_attackDamage_URMonsterCardCnt', value: 7 },
      { source: '다', stat: '_per_attackDamage_LRMonsterCardCnt', value: 3 },
    ];
    const counts = { R: 4, UR: 2, LR: 1 };
    const expanded = countExpandedLines(lines, 0, label, false, counts).lines;
    expect(expanded.map((line) => [line.stat, line.value])).toEqual([
      ['_per_attackDamage', 40],
      ['_per_attackDamage', 14],
      ['_per_attackDamage', 3],
    ]);
  });
  it('등급 이상 장수 세기: 등급 순서 B < … < SSS < R < … < UR < URP < XR < LR, 별 무관', () => {
    const slots = [
      { grade: 'SSS', star: 10 },
      { grade: 'R', star: 1 },
      { grade: 'UR', star: 3 },
      { grade: 'XR', star: 1 },
      { grade: 'SS', star: 10 },
      { grade: '', star: 0 },
    ];
    expect(cardCountsByGrade(slots)).toEqual({ SSS: 4, R: 3, UR: 2, URP: 1, XR: 1, LR: 0 });
  });
  it('장착 펫 id (칸 순서, 빈칸은 빈 글)', () => {
    expect(equippedPetIds({ petSlot1: '101', petSlot3: '1' })).toEqual(['101', '', '1', '', '', '']);
  });
});

describe('파생 선택지', () => {
  it('장착한 펫의 옵션 묶음에 없는 능력치는 계산에서 뺀다 (기존 화면은 그런 값을 지움)', () => {
    const values = { pet_101: 'SSS_1', petSlot1: '101', petOption1_1Stat: '_per_FireHero_AttackDamage', petOption1_1Value: '50%' };
    expect(petLines(values, tables, label).map((line) => line.source)).toEqual(['드라코 SSS 1성']);
  });
  it('고른 카드에 없는 등급·성이면 그 칸은 효과 없음', () => {
    expect(tabLines('card', { cardSlot1: '1', cardSlotGrade1: 'NONE_1' })).toEqual([]);
  });
});
