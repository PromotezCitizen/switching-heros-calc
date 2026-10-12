import { beforeAll, describe, expect, it } from 'vitest';
import i18n from 'i18next';
import '../../../i18n';
import CardSetTable from '../../../../public/data/tables/CardSet.json';
import CardStickerSetTable from '../../../../public/data/tables/CardStickerSet.json';
import CardTable from '../../../../public/data/tables/Card.json';
import CharacterTable from '../../../../public/data/tables/Character.json';
import ContentMissionTable from '../../../../public/data/tables/ContentMission.json';
import DiceOptionTable from '../../../../public/data/tables/DiceOption.json';
import LibraryTable from '../../../../public/data/tables/Library.json';
import PetTable from '../../../../public/data/tables/Pet.json';
import SoulForgeTable from '../../../../public/data/tables/SoulForge.json';
import WeaponCharTable from '../../../../public/data/tables/WeaponChar.json';
import WeaponJobTable from '../../../../public/data/tables/WeaponJob.json';
import WeaponLinkTable from '../../../../public/data/tables/WeaponLink.json';
import WeaponTranscendTable from '../../../../public/data/tables/WeaponTranscend.json';
import RelicTable from '../../../../public/data/tables/Relic.json';
import { tableRows, type StatTables } from '../../../data/statTables';
import type { Line } from '../../combine';
import { formatLog } from '../../gameNumber';
import type { CalcValues } from '../../types';
import { cardSlotGradeStars, countExpandedLines, sssCardCount } from './card';
import { EXPECTED_FROM_HTML } from './expectedFromHtml';
import { equippedPetIds, heroWeaponCardPetTabs } from './index';
import { libraryArchiveLevel } from './library';
import { mineMultiplier } from './mine';
import { petLines } from './pet';
import type { SourceLabel } from './shared';
import {
  equipWeaponRelicMultiplier,
  exclusiveWeaponEffectFromValues,
  exclusiveWeaponLines,
  linkLevelField,
  normalWeaponPossessEffect,
  openOptionSlots,
  weaponLinkLog,
  weaponTotalAtk,
} from './weapon';
import { exclusiveOwnedStarField } from '../hero/rosterFields';

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
  it('무기 (히어로 없음): 소울포지는 탭 따로, 무기 옵션은 전용 무기를 끼지 않았으니 칸이 닫혀 줄 없음. 나머지 줄은 기존 HTML 과 같음', () => {
    const expected = EXPECTED_FROM_HTML.weaponNoHero;
    const values = { ...expected.values };
    const isOption = (line: { source: string }) => line.source.startsWith('무기 옵션');
    expectSameLines(
      [...tabLines('weapon', values), ...tabLines('soulForge', values)],
      expected.lines.filter((line) => !isOption(line)),
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
    const totalLines = tabLines('weapon', values).filter((line) => line.source === '무기 누적 능력치 (전용 무기 ★ 에서 계산)');
    expect(totalLines).toEqual([{ source: '무기 누적 능력치 (전용 무기 ★ 에서 계산)', stat: '_per_attackDamage', log: total.percentLog }]);
    // ★ 를 하나도 안 넣으면 줄 없음
    expect(weaponTotalAtk({}, tables)).toBeNull();
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
      { source: '세트 × SSS 등급 이상 2장 (별 무관)', stat: '_per_hp', value: 20 },
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
    expect(reached.lines[1]).toEqual({ source: '카드 (적 수 조건 충족)', stat: '_per_attackDamage', value: 700 });
    expect(reached.skippedStats).toEqual(['_per_attackDamage_Kill']);
  });
  it('장착 펫 id (칸 순서, 빈칸은 빈 글)', () => {
    expect(equippedPetIds({ petSlot1: '101', petSlot3: '1' })).toEqual(['101', '', '1', '', '', '']);
  });
});

describe('파생 선택지', () => {
  it('장착한 펫의 옵션 묶음에 없는 능력치는 계산에서 뺀다 (기존 화면은 그런 값을 지움)', () => {
    const values = { pet_101: 'SSS_1', petSlot1: '101', petOption1_1Stat: '_per_FireHero_AttackDamage', petOption1_1Value: '50%' };
    expect(petLines(values, tables, label).map((line) => line.source)).toEqual(['드라코 SSS 1성 보유']);
  });
  it('고른 카드에 없는 등급·성이면 그 칸은 효과 없음', () => {
    expect(tabLines('card', { cardSlot1: '1', cardSlotGrade1: 'NONE_1' })).toEqual([]);
  });
});
