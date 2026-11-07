import { describe, expect, it } from 'vitest';
import attributeRuneText from '../../../../public/data/tables/AttributeRune.json?raw';
import awakenText from '../../../../public/data/tables/Awaken.json?raw';
import characterText from '../../../../public/data/tables/Character.json?raw';
import masteryText from '../../../../public/data/tables/Mastery.json?raw';
import petText from '../../../../public/data/tables/Pet.json?raw';
import skillText from '../../../../public/data/tables/Skill.json?raw';
import weaponCharText from '../../../../public/data/tables/WeaponChar.json?raw';
import weaponTranscendText from '../../../../public/data/tables/WeaponTranscend.json?raw';
import '@/i18n';
import { CONSTS } from '@/CONSTS';
import { loadTestTables } from '@/test/loadTestTables';
import { tableRows, type RawTable, type StatTables } from '@/data/statTables';
import type { Line } from '@/calc/combine';
import { formatLog } from '@/calc/gameNumber';
import type { CalcValues } from '@/calc/types';
import { awakenDetailLevelField, awakenDetailStats } from '@/calc/sources/masteryRuneBuff/awakenDetail';
import { combineLines } from '@/calc/combine';
import {
  attackEventBuffLines,
  attackSpeedPercent,
  berserkStacks,
  buffLines,
  killerApplies,
  doubleAttackFromLines,
  doubleAttackPercent,
  exclusiveStackBuffLines,
  finalAttackMultiplierLines,
  killerLog,
  multiplierPercentLog,
  normalMonsterFoodLines,
  overchargeLog,
  selectedNormalMonsterFood,
  stackLines,
  superCriticalStrikeLines,
} from '@/calc/sources/masteryRuneBuff/buff';
import { battleDamageLines, battleStatLines, chancesWithBattleState, compoundPercent } from '@/calc/sources/masteryRuneBuff/battleState';
import { magicGuardLines } from '@/calc/sources/masteryRuneBuff/battleEffects';
import { chancesFromLines, chanceUltimateLines } from '@/calc/sources/masteryRuneBuff/chances';
import { masteryRuneBuffTabs } from '@/calc/sources/masteryRuneBuff/index';
import { masteryTotals, masteryTraits, plainNumber } from '@/calc/sources/masteryRuneBuff/mastery';
import { attributeRunes, runeLevel, runeLevelLimit, runeValue } from '@/calc/sources/masteryRuneBuff/rune';
import { equippedSkillTypeCounts, hasEquippedActiveSkill } from '@/calc/sources/skill/skill';
import {
  equippedPetIds,
  formationHeroAttributes,
  skippedUltimateNames,
  slotHeroTargetUnit,
  ultimateCounts,
  ultimateLines,
} from '@/calc/sources/masteryRuneBuff/ultimate';

/**
 * 기대값은 기존 htmls/stat-calc.html 을 playwright 로 열어 같은 입력을 넣고,
 * renderSourceSummary 가 묶음마다 합치는 줄 목록 (Calc.combineItems 인자) 과 화면 글을 그대로 읽은 것이다.
 */
/** 표 JSON 은 글로 받아 읽는다 (AttributeRune 2.87MB 의 타입을 TypeScript 가 추론하지 않게) */
function parseTable(text: string): RawTable {
  return JSON.parse(text) as RawTable;
}
const tables: StatTables = {
  Mastery: parseTable(masteryText),
  AttributeRune: parseTable(attributeRuneText),
  Pet: parseTable(petText),
  Character: parseTable(characterText),
  Skill: parseTable(skillText),
};

function masteryValues(levels: Record<string, number>): CalcValues {
  return Object.fromEntries(Object.entries(levels).map(([rNo, level]) => [`mastery_${rNo}`, String(level)]));
}

const SCENARIOS: Record<string, CalcValues> = {
  full: {
    rune_0: '2036', rune_1: '15', rune_2: '', rune_3: '12.7', rune_4: '0', rune_5: '5000', rune_core: '203',
    awakenTotalFinalAtk: '3.56Q', awakenTotalFinalHp: '3.56Q', awakenTotalAtk: '57.79B%', awakenTotalHp: '57.79B%',
    awakenTotalNormal: '47.28B%', awakenTotalBoss: 'abc', awakenTotalHero: '21.95B%',
    killerActive: 'true', berserkStacks: '5', costumeCount: '50',
    petSlot1: '101', petSlot2: '102', petSlot3: '103', petSlot4: '1', petSlot5: '2', petSlot6: '201',
    ...masteryValues({ 0: 1, 1: 20, 2: 99, 3: 5, 10: 3, 51: 1, 53: 20, 102: 20, 103: 7, 1001: 1, 1005: 1, 1003: 1, 1004: 1, 1008: 1, 1012: 1 }),
  },
  empty: {
    killerActive: 'false', costumeCount: '0',
    ...masteryValues({ 103: 20, 1001: 1, 1003: 1 }),
  },
  edge: {
    killerActive: 'true', berserkStacks: '5', costumeCount: '-3', rune_core: '399', rune_2: '1',
    petSlot1: '205', petSlot2: '206',
    ...masteryValues({ 103: 1, 10: 1, 102: 0, 1002: 1, 1007: 1, 1004: 1 }),
  },
};

/** 기존 HTML 시나리오의 프로필 연타 칸 값. 이제 연타는 다른 탭 줄로 계산하므로, 버프 탭에 그 값의 연타 줄 하나를 넘긴다 */
const SCENARIO_DOUBLE_ATTACK: Record<string, number> = { full: 224.49, empty: 95, edge: 115.5 };

function tabsWithDoubleAttack(doubleAttack: number) {
  return masteryRuneBuffTabs(() => [{ source: '연타', stat: 'doubleAttack', value: doubleAttack }]);
}

type ExpectedLine = [source: string, stat: string, kind: 'value' | 'log', amount: number];

const EXPECTED: Record<string, Record<string, ExpectedLine[]>> = {
  full: {
    rune: [
      ['화염의 룬 Lv2036', '_per_FireHero_AttackDamage', 'log', 4.308777773664721],
      ['섬멸의 룬 Lv15', '_per_NormalMonsterDamage', 'log', 2.1760912590556813],
      ['천벌의 룬 Lv12', '_per_BossMonsterDamage', 'log', 2.0791812460476247],
      ['심판의 룬 Lv5000', '_per_HeroMonsterDamage', 'log', 4.6020599913279625],
      ['코어 룬 Lv203', '_per_attackDamage', 'log', 18.073792947667837],
    ],
    mastery: [
      ['재빠른 손놀림 Lv1', 'attackSpeed', 'value', 50],
      ['완력 강화 Lv20', '_per_attackDamage', 'value', 20],
      ['체력 강화 Lv20', '_per_hp', 'value', 20],
      ['예리한 시선 Lv1', 'criticalRate', 'value', 5],
      ['학살 Lv1', 'killer', 'value', 100],
      ['끓어오르는 분노 Lv3', 'berserkSkillUse', 'value', 3],
      ['전장의 열기 Lv20', 'killerAddDmg', 'value', 50],
      ['과충전 연타 Lv20', 'doubleAttackToDmgUp1', 'value', 400],
      ['연타 폭주 Lv7', 'doubleAttackToDmgUp2', 'value', 17.5],
    ],
    // 베르 각성 세부는 레벨 입력 + 표 Awaken 으로 계산 (아래 "베르 각성 세부 능력치" 에서 화면 값과 대조). 이 시나리오 표에는 Awaken 이 없음
    awakenDetail: [],
    ultimate: [
      ['심해의 동반자 (3 ^ 장착 펫 3마리)', '_per_hp', 'log', 3.414973347970818],
      ['패션은 완력 × 보유 코스튬 50개', '_per_attackDamage', 'value', 7500],
      ['스타일은 체력 × 보유 코스튬 50개', '_per_hp', 'value', 15000],
      ['화염의 지배자 (2.4 ^ 장착 펫 2마리)', '_per_attackDamage', 'log', 2.677606952720493],
    ],
    buff: [
      // 광폭화 5중첩 줄 없음: 이 시나리오는 특성 10 (스킬 광폭화) 만 있고 특성 7 (광폭화) 이 없다. 게임은 특성 7 로 켜진다 (2026-11-07, 예전 HTML 은 특성 10)
      ['학살자', '_per_attackDamage', 'log', 2.1760912590556813],
      ['연타 폭주 (공격력 %)', '_per_attackDamage', 'value', 210],
      // 과충전 연타 102 (Lv20 = 400) 는 연타 224.49 가 100 을 넘어서 공격력 % 줄이 생긴다 (combat0113.py 105)
      ['과충전 연타 (연타 224.49%, 100% 초과)', '_per_attackDamage', 'value', 400],
    ],
  },
  empty: {
    rune: [],
    mastery: [['연타 폭주 Lv20', 'doubleAttackToDmgUp2', 'value', 50]],
    awakenDetail: [],
    ultimate: [],
    buff: [],
  },
  edge: {
    rune: [
      ['파도의 룬 Lv1', '_per_WaterHero_AttackDamage', 'log', 1],
      ['코어 룬 Lv399', '_per_attackDamage', 'log', 33.5933171730023],
    ],
    mastery: [
      ['끓어오르는 분노 Lv1', 'berserkSkillUse', 'value', 1],
      ['연타 폭주 Lv1', 'doubleAttackToDmgUp2', 'value', 2.5],
    ],
    awakenDetail: [],
    ultimate: [
      ['대지의 동반자 (3 ^ 장착 펫 2마리)', '_per_hp', 'log', 2.9030899869919438],
      ['대지의 지배자 (2.4 ^ 장착 펫 2마리)', '_per_attackDamage', 'log', 2.677606952720493],
    ],
    buff: [
      // 광폭화 5중첩 줄 없음: 이 시나리오는 특성 10 (스킬 광폭화) 만 있고 특성 7 (광폭화) 이 없다. 게임은 특성 7 로 켜진다 (2026-11-07, 예전 HTML 은 특성 10)
      ['학살자', '_per_attackDamage', 'log', 2],
      ['연타 폭주 (공격력 %)', '_per_attackDamage', 'value', 2.5],
    ],
  },
};

function simplify(lines: Line[]): ExpectedLine[] {
  return lines.map((line) =>
    line.log !== undefined
      ? [line.source, line.stat, 'log', line.log]
      : [line.source, line.stat, 'value', Number(line.value)],
  );
}

describe('탭 목록', () => {
  it('탭 id 와 쓰는 표', () => {
    expect(masteryRuneBuffTabs(() => []).map((tab) => [tab.id, tab.tableNames])).toEqual([
      ['mastery', ['Mastery', 'Pet', 'Character', 'Skill', 'WeaponChar']],
      ['rune', ['AttributeRune', 'AttributeRuneLab']],
      ['awakenDetail', ['Awaken']],
      ['buff', ['Mastery', 'Pet', 'Character', 'Skill', 'WeaponChar', 'AttributeRune', 'AttributeRuneLab', 'Awaken', 'SkillRune', 'Option']],
    ]);
  });
  it('버프 탭은 다른 탭들이 쓰는 표도 같이 부른다 (확률 계산에 다른 탭 줄이 필요)', () => {
    const buff = masteryRuneBuffTabs(() => [], ['Card', 'Pet', 'Relic']).find((tab) => tab.id === 'buff')!;
    expect(buff.tableNames).toEqual([
      'Mastery',
      'Pet',
      'Character',
      'Skill',
      'WeaponChar',
      'AttributeRune',
      'AttributeRuneLab',
      'Awaken',
      'SkillRune',
      'Option',
      'Card',
      'Relic',
    ]);
  });
});

describe.each(Object.keys(SCENARIOS))('기존 HTML 과 같은 줄 (%s)', (scenario) => {
  const tabs = tabsWithDoubleAttack(SCENARIO_DOUBLE_ATTACK[scenario]);
  it.each(tabs.map((tab) => tab.id))('%s', (tabId) => {
    const tab = tabs.find((item) => item.id === tabId)!;
    const actual = simplify(tab.lines(SCENARIOS[scenario], tables));
    // 얼티밋 탭을 없애고 얼티밋 줄을 특성 탭 줄 뒤에 붙였다 (기존 화면 기대값은 탭별로 나뉘어 있음)
    const expected =
      tabId === 'mastery' ? [...EXPECTED[scenario].mastery, ...EXPECTED[scenario].ultimate] : EXPECTED[scenario][tabId];
    expect(actual.map(([source, stat, kind]) => [source, stat, kind])).toEqual(
      expected.map(([source, stat, kind]) => [source, stat, kind]),
    );
    actual.forEach(([, , , amount], index) => expect(amount).toBeCloseTo(expected[index][3], 10));
  });
});

describe('특성 화면 값', () => {
  const traits = masteryTraits(tables.Mastery);
  it('사용 포인트 (기존: 전체 30,839 / 스탯 30,734 / 스킬 0 / 히어로 105)', () => {
    const totals = masteryTotals(traits, SCENARIOS.full);
    expect(plainNumber(totals.points)).toBe('30,839');
    expect(totals.pointsByGroup).toEqual({ Stat: 30734, Battle: 105 });
  });
  it('스탯 합계 순서와 값', () => {
    const totals = masteryTotals(traits, SCENARIOS.full);
    expect(totals.stats.map((entry) => [entry.statName, entry.value])).toEqual([
      ['attackSpeed', 50],
      ['_per_attackDamage', 20],
      ['_per_hp', 20],
      ['criticalRate', 5],
      ['killer', 100],
      ['berserkSkillUse', 3],
      ['killerAddDmg', 50],
      ['doubleAttackToDmgUp1', 400],
      ['doubleAttackToDmgUp2', 17.5],
      ['_pow_hp_EqWaterPetCnt', 3],
      ['_per_attackDamage_HaveCostumeCnt', 150],
      ['_per_hp_HaveCostumeCnt', 300],
      ['_pow_attackDamage_EqFirePetCnt', 2.4],
      ['_pow_attackDamage_EqMaleHeroCnt', 8],
      ['_per_hp_TargetUnitBoss', 50000],
    ]);
    expect(plainNumber(masteryTotals(traits, SCENARIOS.edge).points)).toBe('15,030');
  });
});

describe('룬 화면 값', () => {
  const runes = attributeRunes(tables.AttributeRune);
  it('룬 7개와 최대 레벨', () => {
    expect(runes.map((rune) => [rune.key, rune.stat, rune.maxLevel])).toEqual([
      ['0', '_per_FireHero_AttackDamage', 4000],
      ['1', '_per_NormalMonsterDamage', 4000],
      ['2', '_per_WaterHero_AttackDamage', 4000],
      ['3', '_per_BossMonsterDamage', 4000],
      ['4', '_per_EarthHero_AttackDamage', 4000],
      ['5', '_per_HeroMonsterDamage', 4000],
      ['core', '_per_attackDamage', 399],
    ]);
    expect(attributeRunes(tables.AttributeRune)).toBe(runes);
  });
  it.each([
    ['full', ['20.36A', '150', '-', '120', '-', '40.00A', '1.19F'], [2040, 2040, 2040, 2040, 2040, 2040, 399]],
    ['empty', ['-', '-', '-', '-', '-', '-', '-'], [10, 10, 10, 10, 10, 10, 399]],
    ['edge', ['-', '-', '10', '-', '-', '-', '3.92K'], [4000, 4000, 4000, 4000, 4000, 4000, 399]],
  ])('%s: 누적 값과 레벨 상한', (scenario, effects, limits) => {
    const values = SCENARIOS[scenario as string];
    expect(
      runes.map((rune) => {
        const value = runeValue(rune, runeLevel(values, rune));
        return value ? formatLog(Math.log10(value)) : '-';
      }),
    ).toEqual(effects);
    expect(runes.map((rune) => runeLevelLimit(rune, values))).toEqual(limits);
  });
});

describe('베르 각성 세부 능력치', () => {
  it('이 계정 (XR ★7, 레벨 공격력·체력·보스 50, 일반 19, 히어로 0) 이 각성 화면 누적 값과 같다', () => {
    const values: CalcValues = {
      awakenGrade: 'XR',
      awakenStar: '7',
      [awakenDetailLevelField('_per_attackDamage')]: '50',
      [awakenDetailLevelField('_per_hp')]: '50',
      [awakenDetailLevelField('_per_BossMonsterDamage')]: '50',
      [awakenDetailLevelField('_per_NormalMonsterDamage')]: '19',
      [awakenDetailLevelField('_per_HeroMonsterDamage')]: '0',
    };
    const shown = Object.fromEntries(
      awakenDetailStats(values, { Awaken: parseTable(awakenText) }).map((entry) => [
        entry.stat,
        entry.percentLog === null ? '-' : formatLog(entry.percentLog),
      ]),
    );
    expect(shown).toMatchObject({
      _per_attackDamage: '57.79B',
      _per_NormalMonsterDamage: '47.28B',
      _per_BossMonsterDamage: '39.72B',
      _per_HeroMonsterDamage: '21.95B',
    });
    expect(Object.keys(shown)).not.toContain('_per_hit');
  });
});

describe('버프·얼티밋 안내', () => {
  it('학살자는 칸을 켜고 처치가 있는 일반 대상 (스테이지 · 속성 일반 층) 에만, 보스 · 히어로 · 글로벌 일반 주는 끔', () => {
    const on: CalcValues = { killerActive: 'true' };
    expect(killerApplies(on)).toBe(true);
    expect(killerApplies({ ...on, summaryTarget: 'boss' })).toBe(false);
    for (const target of ['stage', 'attributeNormal']) expect(killerApplies({ ...on, dpmTarget: target }), target).toBe(true);
    for (const target of ['globalRaidNormal', 'stageBoss', 'guildRaid', 'attributeHero', 'pvp']) expect(killerApplies({ ...on, dpmTarget: target }), target).toBe(false);
    expect(killerApplies({ killerActive: 'false', dpmTarget: 'stage' })).toBe(false);
  });
  it('광폭화 중첩 · 학살자 배율 (학살자: 기존 ×2.5 / ×2)', () => {
    // 시나리오는 특성 10 만 있어 광폭화 0 (게임은 특성 7 로 켜짐, 2026-11-07). 특성 7 을 더하면 5
    expect(berserkStacks(tables.Mastery, SCENARIOS.full)).toBe(0);
    expect(berserkStacks(tables.Mastery, { ...SCENARIOS.full, mastery_7: '1' })).toBe(5);
    expect(Number(Math.pow(10, killerLog(tables.Mastery, SCENARIOS.full)).toFixed(3))).toBe(2.5);
    expect(berserkStacks(tables.Mastery, SCENARIOS.empty)).toBe(0);
    expect(Number(Math.pow(10, killerLog(tables.Mastery, SCENARIOS.empty)).toFixed(3))).toBe(2);
    expect(berserkStacks(tables.Mastery, SCENARIOS.edge)).toBe(0);
  });
  it('광폭화 중첩 = 광폭화 특성 (특성 7) 을 찍었으면 늘 5중첩, 스킬 광폭화 (특성 10) 만으로는 0 (게임 코드, 2026-11-07)', () => {
    expect(berserkStacks(tables.Mastery, masteryValues({ 7: 1 }))).toBe(5);
    expect(berserkStacks(tables.Mastery, masteryValues({ 10: 1 }))).toBe(0);
    expect(berserkStacks(tables.Mastery, {})).toBe(0);
    // 특성을 안 찍었으면 광폭화 줄이 없다
    expect(buffLines({}, tables.Mastery, (key) => key, 0)).toEqual([]);
  });
  it('과충전 연타 (Lv20 = 400% → ×5, 연타 100% 이하·레벨 0 이면 없음)', () => {
    expect(overchargeLog(tables.Mastery, SCENARIOS.full, 224.49)).toBeCloseTo(Math.log10(5), 12);
    expect(overchargeLog(tables.Mastery, SCENARIOS.full, 95)).toBe(0);
    expect(overchargeLog(tables.Mastery, SCENARIOS.edge, 115.5)).toBe(0);
  });
  it('개수 대응을 모르는 얼티밋 (기존: 강인한 결속, 왕의 버팀목)', () => {
    const values = SCENARIOS.full;
    const result = ultimateLines(values, tables.Mastery, tables.Pet, equippedPetIds(values), (key) => key);
    // 1008 (남자 히어로 수) 은 1·2슬롯 성별, 1012 (보스 전투 특화) 는 1슬롯 히어로 전투 특화로 계산 (히어로가 없으면 줄 없음)
    expect(result.skipped).toEqual([]);
  });
  it('장착 펫 속성 수 (기존: 물 3, 불 2, 땅 1 순)', () => {
    const counts = ultimateCounts(SCENARIOS.full, tables.Pet, tables.Character);
    expect(Object.entries(counts.petAttributes)).toEqual([
      ['Water', 3],
      ['Fire', 2],
      ['Earth', 1],
    ]);
    expect(counts.heroGenders).toEqual({});
  });
});

/**
 * 연타 = 연타 줄 합 + 연타 추가 + 속도 과열. 값은 저장 데이터 검증 (claude-docs/react-port/verify-2026-10-07-0206.md 2-1·2-2):
 * 에이카 (궁수·물), 공격속도 1,736 = 기본 150 + 481 + 궁수 775 + 물 330, 전투 중 화면 공격속도 2,025 → 연타 217
 */
describe('연타 계산', () => {
  const eikaLines: Line[] = [
    { source: '기본 공격속도', stat: 'attackSpeed', value: 150 },
    { source: '여러 출처', stat: 'attackSpeed', value: 481 },
    { source: '궁수', stat: 'Archer_AttackSpeed', value: 775 },
    { source: '물', stat: 'WaterHero_AttackSpeed', value: 330 },
    { source: '다른 직업', stat: 'Mage_AttackSpeed', value: 999 },
    { source: '다른 속성', stat: 'FireHero_AttackSpeed', value: 999 },
    { source: '기본 연타', stat: 'doubleAttack', value: 10 },
    { source: '연타 추가 특성', stat: 'doubleAttackAddPer', value: 40 },
    { source: '속도 과열 Lv20', stat: 'doubleAttackOverPer', value: 1 },
  ];
  const eika = { charName: '에이카' };

  it('공격속도 = 공격속도 줄 + 1슬롯 히어로 직업·속성 공격속도 (다른 직업·속성 제외)', () => {
    const combined = combineLines(eikaLines);
    expect(attackSpeedPercent(combined, { job: 'Archer', attribute: 'Water' }, false)).toBe(1736);
    expect(attackSpeedPercent(combined, undefined, false)).toBe(631);
  });

  it('특성 42 초월적 기량 (notActiveAttackSpeed 50): 장착 스킬에 액티브가 없을 때만 공격속도에 더함 (m2695 @33f4bdc, 15:28 화면 1,736 → 1,786)', () => {
    const combined = combineLines([...eikaLines, { source: '초월적 기량 Lv20', stat: 'notActiveAttackSpeed', value: 50 }]);
    const archerWater = { job: 'Archer', attribute: 'Water' };
    expect(attackSpeedPercent(combined, archerWater, true)).toBe(1786);
    expect(attackSpeedPercent(combined, archerWater, false)).toBe(1736);
    // 연타도 같은 공격속도로: 속도 과열 floor((1,786 − 350) / 10) = 143 (1,736 이면 138) → 5 늘어남
    const speedUp = combineLines([...eikaLines, { source: '초월적 기량 Lv20', stat: 'notActiveAttackSpeed', value: 50 }]);
    expect(doubleAttackPercent(speedUp, attackSpeedPercent(speedUp, archerWater, true))).toBe(193);
    expect(doubleAttackPercent(speedUp, attackSpeedPercent(speedUp, archerWater, false))).toBe(188);
  });

  it('특성 42 를 적용하는 연타 계산: 장착 스킬 0개면 액티브 없음, 버프 스킬만 있어도 액티브 없음, 액티브가 하나라도 있으면 없음 아님', () => {
    const lines: Line[] = [...eikaLines, { source: '초월적 기량 Lv20', stat: 'notActiveAttackSpeed', value: 50 }];
    expect(doubleAttackFromLines(lines, eika, tables)).toBe(193);
    expect(hasEquippedActiveSkill({}, tables)).toBe(false);
    expect(doubleAttackFromLines(lines, { ...eika, skillLevel_53: '1', skillEquip_1: '53' }, tables)).toBe(188);
    expect(hasEquippedActiveSkill({ skillLevel_53: '1', skillEquip_1: '53' }, tables)).toBe(true);
  });

  it('공격속도 2,025 → 10 + 40 + floor((2,025 − 350) / 10) × 1 = 217', () => {
    expect(doubleAttackPercent(combineLines(eikaLines), 2025)).toBe(217);
  });

  it('다른 탭 줄과 1슬롯 히어로로 계산: 사망 직후 공격속도 1,736 → 188', () => {
    expect(doubleAttackFromLines(eikaLines, eika, tables)).toBe(188);
  });

  it('공격속도가 350% 이하면 속도 과열 없음 (빼지 않음)', () => {
    expect(doubleAttackPercent(combineLines(eikaLines), 100)).toBe(50);
  });

  it('버프 탭: 계산한 연타로 연타 폭주 (Lv20 2.5% × floor((217 − 100) / 10) = 27.5)', () => {
    const spedUp: Line[] = [...eikaLines, { source: '전투 중 공격속도 몫', stat: 'attackSpeed', value: 289 }];
    const tab = masteryRuneBuffTabs(() => spedUp).find((item) => item.id === 'buff')!;
    const lines = tab.lines({ ...eika, ...masteryValues({ 103: 1 }) }, tables);
    expect(lines).toEqual([{ source: '연타 폭주 (공격력 %)', stat: '_per_attackDamage', value: 2.5 * 11 }]);
  });
});

describe('얼티밋: 단순 스탯·편성 히어로 속성', () => {
  const label = (key: string) => key;
  // 에이카·린 모두 물 속성
  const waterPair = ['Water', 'Water'];

  it('개수 조건 없는 _per_ 스탯은 그 스탯 줄 (2001 전용 스킬 데미지 6000%)', () => {
    const result = ultimateLines(masteryValues({ 2001: 1 }), tables.Mastery, tables.Pet, [], label);
    expect(result.lines).toEqual([{ source: 'calc.mastery.names.2001', stat: '_per_CharSkillDamage', value: 6000 }]);
    expect(result.skipped).toEqual([]);
  });

  it('물 속성 히어로 1명마다 × 12 (2004): 1·2슬롯 물 2명 → × 144', () => {
    const result = ultimateLines(masteryValues({ 2004: 1 }), tables.Mastery, tables.Pet, [], label, [], waterPair);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]).toMatchObject({ source: 'calc.ultimate.heroSource', stat: '_per_skillDamage' });
    expect(result.lines[0].log).toBeCloseTo(Math.log10(144 - 1) + 2, 12);
    // 불 속성 수 (2003) 는 0명이라 줄 없음
    expect(ultimateLines(masteryValues({ 2003: 1 }), tables.Mastery, tables.Pet, [], label, [], waterPair).lines).toEqual([]);
  });

  it('같은 속성 히어로 장착 (2006): 두 명이 같은 속성일 때만', () => {
    const values = masteryValues({ 2006: 1 });
    expect(ultimateLines(values, tables.Mastery, tables.Pet, [], label, [], waterPair).lines).toEqual([
      { source: 'calc.mastery.names.2006', stat: '_per_skillDamage', value: 7500 },
    ]);
    expect(ultimateLines(values, tables.Mastery, tables.Pet, [], label, [], ['Water', 'Fire']).lines).toEqual([]);
    expect(ultimateLines(values, tables.Mastery, tables.Pet, [], label, [], ['Water']).lines).toEqual([]);
  });

  it('개수·조건을 모르는 얼티밋은 버리지 않고 이름을 남긴다 (스킬 문양 개수 2012). 연타 150% 초과 3015 는 버프 탭이 계산', () => {
    const values = masteryValues({ 2012: 1, 3015: 1, 3016: 1 });
    const result = ultimateLines(values, tables.Mastery, tables.Pet, [], label);
    expect(result.lines).toEqual([]);
    // 3016 (슈퍼 치명타 150% 초과 → 치명타 데미지) 은 붙는 스탯을 몰라 남긴다
    expect(result.skipped).toEqual(['calc.mastery.names.2012', 'calc.mastery.names.3016']);
    expect(skippedUltimateNames(values, tables.Mastery, label)).toEqual(result.skipped);
  });

  it('1·2슬롯 히어로 속성 (히어로 표에서 고른 이름)', () => {
    expect(formationHeroAttributes({ charName: '에이카', charName2: '린' }, tables)).toEqual(['Water', 'Water']);
    expect(formationHeroAttributes({ charName: '에이카' }, tables)).toEqual(['Water']);
  });
});

describe('얼티밋: 장착 스킬 수·던전 기록·전투 특화', () => {
  const label = (key: string) => key;

  it('장착 5칸의 스킬 종류 수 (보유만, 같은 스킬은 한 번)', () => {
    const values: CalcValues = {
      skillLevel_53: '1', skillLevel_51: '3', skillLevel_1: '2',
      skillEquip_1: '53', skillEquip_2: '51', skillEquip_3: '1', skillEquip_4: '53', skillEquip_5: '3',
    };
    expect(equippedSkillTypeCounts(values, tables)).toEqual({ ActiveSkill: 2, BuffSkill: 1 });
  });

  it('액티브 스킬 1개마다 × 3 (2010), 버프 스킬 (2011): 장착 액티브 2개 → × 9, 버프 0개 → 줄 없음', () => {
    const result = ultimateLines(masteryValues({ 2010: 1, 2011: 1 }), tables.Mastery, tables.Pet, [], label, [], [], {
      skillTypeCounts: { ActiveSkill: 2 },
    });
    expect(result.skipped).toEqual([]);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]).toMatchObject({ source: 'calc.ultimate.skillSource', stat: '_per_skillDamage' });
    expect(result.lines[0].log).toBeCloseTo(multiplierPercentLog(2 * Math.log10(3)), 12);
  });

  it('보물 던전 클리어 단계 × 5% (2015): 유물 연동 칸 120 → 600%. 속성 던전 (2018) 은 칸이 없어 남김', () => {
    const values = { ...masteryValues({ 2015: 1, 2016: 1, 2018: 1 }), relicLink_dungeonGold: '120' };
    const result = ultimateLines(values, tables.Mastery, tables.Pet, [], label);
    expect(result.lines).toEqual([{ source: 'calc.ultimate.dungeonSource', stat: '_per_skillDamage', value: 600 }]);
    expect(result.skipped).toEqual(['calc.mastery.names.2018']);
  });

  it('보스 전투 특화 히어로 체력 50000% (1012): 1슬롯 히어로가 보스 특화일 때만', () => {
    expect(slotHeroTargetUnit({ charName: '에이카' }, tables)).toBe('Boss');
    expect(slotHeroTargetUnit({ charName: '린' }, tables)).toBe('Hero');
    const values = masteryValues({ 1012: 1, 1015: 1 });
    expect(ultimateLines(values, tables.Mastery, tables.Pet, [], label, [], [], { targetUnit: 'Boss' }).lines).toEqual([
      { source: 'calc.ultimate.targetUnitSource', stat: '_per_hp', value: 50000 },
      { source: 'calc.ultimate.targetUnitSource', stat: '_per_attackDamage', value: 20000 },
    ]);
    expect(ultimateLines(values, tables.Mastery, tables.Pet, [], label, [], [], { targetUnit: 'Hero' }).lines).toEqual([]);
  });
});

/**
 * 확률 = 기본 + 추가 (+ 초과 규칙). 값은 저장 데이터 검증 (verify-2026-10-07-0206.md 2-1): 에이카·린 (둘 다 물),
 * 연타 217, 슈퍼 치명타 96.37, 관통 75.13, 스위칭 55.15, 스킬 콤보 38.37 (기본 10 + 추가 특성 20 + 연성 8.37), 무자비 113.65, 매직 가드 46.75
 */
describe('확률 계산·확률 문턱 얼티밋·중첩', () => {
  const formation = { charName: '에이카', charName2: '린' };
  const chanceLines: Line[] = [
    { source: '기본 공격속도', stat: 'attackSpeed', value: 150 },
    { source: '여러 출처', stat: 'attackSpeed', value: 770 },
    { source: '궁수', stat: 'Archer_AttackSpeed', value: 775 },
    { source: '물', stat: 'WaterHero_AttackSpeed', value: 330 },
    { source: '기본 연타', stat: 'doubleAttack', value: 10 },
    { source: '연타 추가 특성', stat: 'doubleAttackAddPer', value: 40 },
    { source: '속도 과열', stat: 'doubleAttackOverPer', value: 1 },
    { source: '치명타', stat: 'criticalRate', value: 218.3 },
    { source: '궁수 치명타', stat: 'Archer_Critical', value: 165 },
    { source: '물 치명타', stat: 'WaterHero_Critical', value: 105 },
    { source: '슈퍼 치명타', stat: 'superCritical', value: 18.37 },
    { source: '슈퍼 치명타 추가', stat: 'superCriticalAddPer', value: 40 },
    { source: '슈퍼 치명타 초과', stat: 'superCriticalOverPer', value: 1 },
    { source: '관통', stat: 'spearAttack', value: 10 },
    { source: '관통 추가', stat: 'spearAttackAddPer', value: 40 },
    { source: '연성 관통', stat: 'spearAttack', value: 25.13 },
    { source: '스위칭', stat: 'switchingBoost', value: 35.15 },
    { source: '스위칭 추가', stat: 'switchingBoostAddPer', value: 20 },
    { source: '다른 속성 장착', stat: 'equipHeroToSwitchingBoostUp2', value: 10 },
    { source: '스킬 콤보', stat: 'skillCombo', value: 10 },
    { source: '스킬 콤보 추가 특성', stat: 'skillComboAddPer', value: 20 },
    { source: '연성 스킬 콤보', stat: 'skillCombo', value: 8.37 },
    { source: '무자비', stat: 'smite', value: 93.65 },
    { source: '무자비 추가', stat: 'smiteAddPer', value: 20 },
    { source: '매직 가드', stat: 'barrier', value: 26.75 },
    { source: '매직 가드 전환율', stat: 'barrierAddVal', value: 20 },
  ];

  it('다른 탭 줄 → 확률 (공격속도 2,025 → 연타 217)', () => {
    const chances = chancesFromLines(chanceLines, formation, tables);
    const expected: Record<string, number> = {
      doubleAttack: 217,
      superCritical: 96.37,
      spearAttack: 75.13,
      // 두 히어로가 같은 물 속성이라 다른 속성 특성 (+10) 은 안 더함
      switchingBoost: 55.15,
      skillCombo: 38.37,
      smite: 113.65,
      barrier: 46.75,
    };
    for (const [chance, value] of Object.entries(expected)) expect(chances[chance]).toBeCloseTo(value, 10);
    // 다른 속성 히어로를 2슬롯에 두면 더한다
    const otherAttributeHero = tableRows(tables.Character).find((row) => row.attribute !== 'Water')!.name;
    expect(
      chancesFromLines(chanceLines, { charName: '에이카', charName2: otherAttributeHero }, tables).switchingBoost,
    ).toBeCloseTo(65.15, 10);
  });

  it('확률 문턱 얼티밋: 연타 217 → 150% 초과 (3015) · 200% 초과 (3024), 스킬 콤보 38.37 → 문턱 못 넘음 (3013)', () => {
    const chances = chancesFromLines(chanceLines, formation, tables);
    const values = masteryValues({ 3015: 1, 3024: 1, 3013: 1 });
    expect(chanceUltimateLines(values, tables.Mastery, chances, (key) => key)).toEqual([
      { source: 'calc.ultimate.chanceSource', stat: '_per_attackDamage', value: 12000 },
      { source: 'calc.ultimate.chanceSource', stat: '_per_attackDamage', value: 20000 },
    ]);
    // 끈 얼티밋은 줄 없음
    expect(chanceUltimateLines(masteryValues({}), tables.Mastery, chances, (key) => key)).toEqual([]);
  });

  it('확률 초과 개수 얼티밋 (3001 · 3007, artifact-unique-over-2026-11-05.md): 최종 확률 7종 중 문턱 초과 (같으면 안 셈) 종류 수 k → 공격력 증가 × 값^k', () => {
    // 120 초과: 연타 · 관통 · 무자비 (3종), 정확히 120 인 슈퍼 치명타는 안 셈. 80 초과: 그 3종 + 슈퍼 치명타 (120) · 스킬 콤보 · 매직 가드 (6종)
    const chances = { doubleAttack: 300, superCritical: 120, spearAttack: 121, switchingBoost: 50, skillCombo: 100, smite: 500, barrier: 80.5 };
    const learned = masteryValues({ 3001: 1, 3007: 1 });
    const lines = chanceUltimateLines(learned, tables.Mastery, chances, (key) => key);
    expect(lines.map((line) => line.source)).toEqual(['calc.ultimate.chanceCountSource', 'calc.ultimate.chanceCountSource']);
    expect(lines.every((line) => line.stat === '_per_attackDamage')).toBe(true);
    expect(lines[0].log).toBeCloseTo(multiplierPercentLog(6 * Math.log10(2.5)), 12);
    expect(lines[1].log).toBeCloseTo(multiplierPercentLog(3 * Math.log10(5)), 12);
    // 넘은 종류가 없으면 줄 없음, 계산 못 한 얼티밋 목록에도 없다
    expect(chanceUltimateLines(learned, tables.Mastery, { doubleAttack: 80 }, (key) => key)).toEqual([]);
    expect(skippedUltimateNames(learned, tables.Mastery, (key) => key)).toEqual([]);
  });

  it('스위칭 부스트 문턱 얼티밋 (3012 · 3021): 교체 켜짐 비율 칸이 0 이면 확률이 문턱을 넘어도 줄이 없고, 교체가 있으면 생긴다', () => {
    const chances = { switchingBoost: 250 };
    const learned = masteryValues({ 3012: 1, 3021: 1 });
    expect(chanceUltimateLines(learned, tables.Mastery, chances, (key) => key)).toEqual([]);
    const withSwap = { ...learned, [CONSTS.masteryRuneBuff.SWAP_UPTIME_FIELD]: '100' };
    const lines = chanceUltimateLines(withSwap, tables.Mastery, chances, (key) => key);
    expect(lines).toHaveLength(2);
    expect(lines.every((line) => line.stat === '_per_attackDamage')).toBe(true);
    // 다른 확률 (연타) 은 교체와 상관없이 줄이 생긴다
    expect(chanceUltimateLines(masteryValues({ 3015: 1 }), tables.Mastery, { doubleAttack: 217 }, (key) => key)).toHaveLength(1);
  });

  it('연타·스킬 콤보 중첩은 늘 최대: 가속 Lv20 60% × 10, 연타의 분노 Lv20 500%, 스킬 콤보 액티브 최종 × 8', () => {
    const values = masteryValues({ 14: 20, 104: 20 });
    const lines = stackLines(values, tables.Mastery, (key) => key, 217, 100);
    expect(lines.slice(0, 2)).toEqual([
      { source: 'calc.buff.doubleAttackStackSource', stat: '_per_attackDamage', value: 600 },
      { source: 'calc.buff.doubleAttackFullStackSource', stat: '_per_attackDamage', value: 500 },
    ]);
    expect(lines[2]).toMatchObject({ source: 'calc.buff.skillComboStackSource', stat: '_per_ActiveSkillDamage' });
    expect(lines[2].log).toBeCloseTo(Math.log10(8 - 1) + 2, 12);
    // 확률이 100 미만이면 중첩이 효과 0 이라 줄이 없다, 0 이어도 없다
    expect(stackLines(values, tables.Mastery, (key) => key, 217, 38.37)).toHaveLength(2);
    expect(stackLines(values, tables.Mastery, (key) => key, 99.99, 99.99)).toEqual([]);
    expect(stackLines(values, tables.Mastery, (key) => key, 0, 0)).toEqual([]);
  });

  it('버프 탭 줄: 다른 탭 줄로 계산한 확률로 중첩·문턱 얼티밋 줄 (스킬 콤보 38.37% 는 100 미만이라 줄 없음)', () => {
    const tab = masteryRuneBuffTabs(() => chanceLines).find((item) => item.id === 'buff')!;
    const lines = tab.lines({ ...formation, ...masteryValues({ 3015: 1 }) }, tables);
    expect(lines.map((line) => line.stat)).toEqual(['_per_attackDamage']);
    expect(lines[0].value).toBe(12000);
  });
});

describe('전투 버프 줄: 초월의 일격 · 최종 공격력 ×5', () => {
  const label = (key: string) => key;

  it('특성 107 초월의 일격: 슈퍼 치명타 확률이 100% 를 넘을 때만 치명타 데미지 곱 계열에 Lv20 값 200% (× 3, m2710 @33fc5d8)', () => {
    const values = masteryValues({ 107: 20 });
    expect(superCriticalStrikeLines(values, tables.Mastery, label, 100)).toEqual([]);
    expect(superCriticalStrikeLines(masteryValues({}), tables.Mastery, label, 130.91)).toEqual([]);
    const lines = superCriticalStrikeLines(values, tables.Mastery, label, 130.91);
    expect(lines).toEqual([{ source: 'calc.buff.superCriticalStrikeSource', stat: '_per_criticalDmg', value: 200 }]);
    expect(Math.pow(10, combineLines(lines)._per_criticalDmg.log)).toBeCloseTo(3, 12);
  });

  // 에이카 = 전용 무기 1021 (표 WeaponChar). 입력은 테스트 안에서 만든다
  const weaponTables: StatTables = {
    ...tables,
    WeaponChar: parseTable(weaponCharText),
    WeaponTranscend: parseTable(weaponTranscendText),
  };
  const equipped = (star: string): CalcValues => ({ charName: '에이카', exclusiveEquipped: 'true', exclusiveOwnedStar_1021: star });

  it('최종 공격력 ×5 (_multiply_AttackDamage): 1슬롯 히어로가 전용 무기 1021 을 장착하고 ★10 이상일 때만', () => {
    expect(finalAttackMultiplierLines({}, label, weaponTables)).toEqual([]);
    expect(finalAttackMultiplierLines(equipped('9'), label, weaponTables)).toEqual([]);
    // 무기 미보유 (★ 빈칸) / 다른 히어로 / 다른 무기 ★ 는 줄 없음 (보유한 전용 무기는 늘 낀 것으로 봄)
    expect(finalAttackMultiplierLines({ ...equipped('13'), exclusiveOwnedStar_1021: '' }, label, weaponTables)).toEqual([]);
    expect(finalAttackMultiplierLines({ ...equipped('13'), charName: '린' }, label, weaponTables)).toEqual([]);
    expect(finalAttackMultiplierLines({ charName: '에이카', exclusiveEquipped: 'true', exclusiveOwnedStar_1022: '13' }, label, weaponTables)).toEqual([]);
    expect(finalAttackMultiplierLines(equipped('10'), label, weaponTables)).toEqual([
      { source: 'calc.buff.finalAttackMultiplierSource', stat: '_multiply_AttackDamage', value: 5 },
    ]);
  });

  it('★7 공격력 중첩 (statType 30002): 장착 + ★7 이상일 때 표 행 val2 (5) × val3 (10) = +50%, 늘 최대 중첩 (23:05 실측 ×1.5001)', () => {
    const row = tableRows(weaponTables.WeaponTranscend).find((record) => record.weaponType === '1021' && record.statType === '30002')!;
    expect([row.star, row.val1, row.val2, row.val3]).toEqual(['7', '40', '5', '10']);
    expect(exclusiveStackBuffLines(equipped('6'), label, weaponTables)).toEqual([]);
    expect(exclusiveStackBuffLines({ ...equipped('13'), exclusiveOwnedStar_1021: '' }, label, weaponTables)).toEqual([]);
    expect(exclusiveStackBuffLines(equipped('13'), label, { ...weaponTables, WeaponTranscend: undefined as unknown as RawTable })).toEqual([]);
    const lines = exclusiveStackBuffLines(equipped('7'), label, weaponTables);
    expect(lines).toEqual([{ source: 'calc.buff.exclusiveStackSource', stat: '_per_attackDamage', value: 50 }]);
    // 합산하면 × (1 + 50/100) = ×1.5
    expect(Math.pow(10, combineLines(lines)._per_attackDamage.log)).toBeCloseTo(1.5, 9);
  });

  it('버프 탭 줄: 다른 탭 줄의 슈퍼 치명타로 초월의 일격, 장착한 무기 ★13 으로 ★7 +50% 와 ×5 (특성 표 없이도)', () => {
    const tab = masteryRuneBuffTabs(() => [{ source: '슈퍼 치명타', stat: 'superCritical', value: 130.91 }]).find(
      (item) => item.id === 'buff',
    )!;
    const values = { ...masteryValues({ 107: 20 }), ...equipped('13') };
    const exclusiveLines = [
      { source: '전용 무기 초월 ★7 공격력 10중첩 (최대)', stat: '_per_attackDamage', value: 50 },
      { source: '전용 무기 초월 ★10 최대 중첩 공격력 ×5', stat: '_multiply_AttackDamage', value: 5 },
    ];
    expect(tab.lines(values, weaponTables)).toEqual([
      { source: '초월의 일격 (슈퍼 치명타 130.91%, 100% 초과)', stat: '_per_criticalDmg', value: 200 },
      ...exclusiveLines,
    ]);
    // 특성 표 없이도 전용 무기 줄은 나온다. 무기가 없으면 (★ 빈칸) 없다
    const { Mastery: _mastery, ...withoutMastery } = weaponTables;
    expect(tab.lines(values, withoutMastery)).toEqual(exclusiveLines);
    expect(tab.lines({ ...values, exclusiveOwnedStar_1021: '' }, withoutMastery)).toEqual([]);
  });
});

const { NORMAL_MONSTER_FOODS } = CONSTS.masteryRuneBuff;

describe('음식 효과 (일반 몬스터 피해 3종, 하나만) · 공격력 이벤트 버프', () => {
  it('처음 상태 (빈칸)·모르는 값이면 없음, 고르면 Item 표 값 (딸기잼 100 / 딸기 주스 250 / 딸기 타르트 600)', () => {
    const label = (key: string, params?: Record<string, string | number>) => (params ? `${key} ${params.food}` : key);
    expect(selectedNormalMonsterFood({})).toBeUndefined();
    expect(normalMonsterFoodLines({}, label)).toEqual([]);
    expect(normalMonsterFoodLines({ normalMonsterFood: 'abc' }, label)).toEqual([]);
    expect(
      ['strawberryJam', 'strawberryJuice', 'strawberryTart'].map(
        (food) => normalMonsterFoodLines({ normalMonsterFood: food }, label)[0].value,
      ),
    ).toEqual([100, 250, 600]);
    expect(normalMonsterFoodLines({ normalMonsterFood: 'strawberryTart' }, label)).toEqual([
      { source: 'calc.buff.foodSource calc.buff.foods.strawberryTart', stat: '_per_NormalMonsterDamage', value: 600 },
    ]);
  });

  it('음식은 일반 몬스터 피해 3종뿐이고 공격력 버프는 음식 선택지가 아니다', () => {
    const label = (key: string, params?: Record<string, string | number>) => (params ? `${key} ${params.food}` : key);
    expect(NORMAL_MONSTER_FOODS.map((food) => food.stat)).toEqual([
      '_per_NormalMonsterDamage',
      '_per_NormalMonsterDamage',
      '_per_NormalMonsterDamage',
    ]);
    expect(normalMonsterFoodLines({ normalMonsterFood: 'attackBuff' }, label)).toEqual([]);
  });

  it('음식끼리는 중첩되지 않는다: 칸이 하나뿐이라 어떤 값이어도 음식 줄은 최대 1개 (두 음식을 동시에 넣을 수 없음)', () => {
    const label = (key: string, params?: Record<string, string | number>) => (params ? `${key} ${params.food}` : key);
    for (const food of NORMAL_MONSTER_FOODS) {
      expect(normalMonsterFoodLines({ normalMonsterFood: food.id }, label)).toHaveLength(1);
    }
    // 다른 음식 칸 이름을 써서 둘째 음식을 넣으려 해도 읽지 않는다
    const lines = normalMonsterFoodLines({ normalMonsterFood: 'strawberryTart', normalMonsterFood2: 'strawberryJam' }, label);
    expect(lines.map((line) => line.value)).toEqual([600]);
    // 칸 값에 둘을 이어 붙여도 모르는 값이라 없음
    expect(normalMonsterFoodLines({ normalMonsterFood: 'strawberryTart,strawberryJam' }, label)).toEqual([]);
    // 버프 탭 줄에서도 음식 줄은 1개
    const tab = masteryRuneBuffTabs(() => []).find((item) => item.id === 'buff')!;
    expect(tab.lines({ normalMonsterFood: 'strawberryJam' }, {})).toHaveLength(1);
  });

  it('공격력 이벤트 버프 (Item 표 15, 공격력 +200%): 처음 = 꺼짐, 켜면 공격력 % 줄 (2026-10-12 01:54 화면 일치로 확인)', () => {
    expect(attackEventBuffLines({}, (key) => key)).toEqual([]);
    expect(attackEventBuffLines({ attackEventBuff: 'true' }, (key) => key)).toEqual([
      { source: 'calc.buff.attackEventBuffSource', stat: '_per_attackDamage', value: 200 },
    ]);
  });

  it('공격력 이벤트 버프는 음식과 같이 켜진다 (음식이 아님): 버프 탭에 두 줄 모두 들어간다', () => {
    const tab = masteryRuneBuffTabs(() => []).find((item) => item.id === 'buff')!;
    expect(tab.lines({ normalMonsterFood: 'strawberryTart', attackEventBuff: 'true' }, {})).toEqual([
      { source: '음식 효과: 딸기 타르트', stat: '_per_NormalMonsterDamage', value: 600 },
      { source: '공격력 이벤트 버프', stat: '_per_attackDamage', value: 200 },
    ]);
  });

  it('버프 탭 줄에 들어가고 (특성 표가 없어도), 출처 글은 번역', () => {
    const tab = masteryRuneBuffTabs(() => []).find((item) => item.id === 'buff')!;
    expect(tab.lines({ normalMonsterFood: 'strawberryTart' }, tables)).toEqual([
      { source: '음식 효과: 딸기 타르트', stat: '_per_NormalMonsterDamage', value: 600 },
    ]);
    expect(tab.lines({ normalMonsterFood: 'strawberryJam' }, {})).toEqual([
      { source: '음식 효과: 딸기잼', stat: '_per_NormalMonsterDamage', value: 100 },
    ]);
    expect(tab.lines({}, tables)).toEqual([]);
  });
});

/**
 * 전투 중 최대 상태 몫 (: 입력 칸 없이 최대 중첩). 기대값은 게임 식 스크립트 combat0113.py · crit_check.py 의 값
 * (복리 10중첩: 204 값 10 → +159.37, 309 값 5 → +62.89, 109 값 20 → +519.17. 곱: 63 값 50 → ×1.5, 102·202·307 값 400 → ×5, 108 값 50 x 1단계 → ×1.5).
 * 입력은 이 테스트 안에서 만든다 (기본값에 기대지 않음)
 */
describe('전투 중 최대 상태 몫 (battleState.ts)', () => {
  const label = (key: string) => key;
  const level20 = (...rNos: number[]) => masteryValues(Object.fromEntries(rNos.map((rNo) => [rNo, 20])));
  const sumOf = (lines: Line[], stat: string) => lines.filter((line) => line.stat === stat).reduce((sum, line) => sum + Number(line.value), 0);

  it('복리 중첩 % = ((1 + 값/100)^10 − 1) x 100', () => {
    expect(compoundPercent(10)).toBeCloseTo(159.3742, 4);
    expect(compoundPercent(5)).toBeCloseTo(62.8895, 4);
    expect(compoundPercent(20)).toBeCloseTo(519.1736, 4);
    expect(compoundPercent(0)).toBe(0);
  });

  it('특성 Lv20 값: 204 = 10, 309 = 5, 109 = 20, 13 = 100 (발동 확률), 9 = 30, 58 = 50, 63 = 50, 108 = 50', () => {
    const traits = masteryTraits(tables.Mastery);
    const valueOf = (rNo: string) => {
      const trait = traits.find((item) => item.rNo === rNo)!;
      return trait.statValue + trait.statUpValue * 19;
    };
    expect([204, 309, 109, 13, 9, 58, 63, 108, 102, 202, 307].map((rNo) => valueOf(String(rNo)))).toEqual([
      10, 5, 20, 100, 30, 50, 50, 50, 400, 400, 400,
    ]);
  });

  it('공격속도: 204 복리 +159.37, 추진력 13 은 표 값 100 이 아니라 고정 +50, 9 +30, 58 +50 (합 289.37)', () => {
    const lines = battleStatLines(level20(204, 13, 9, 58), tables.Mastery, label);
    expect(lines.every((line) => line.stat === 'attackSpeed')).toBe(true);
    expect(lines.map((line) => Number(line.value))).toEqual([expect.closeTo(159.3742, 4), 50, 30, 50]);
    expect(sumOf(lines, 'attackSpeed')).toBeCloseTo(289.3742, 4);
  });

  it('치명타 확률은 309 복리 +62.89, 치명타 데미지는 109 복리 합 계열 +519.17', () => {
    const lines = battleStatLines(level20(309, 109), tables.Mastery, label);
    expect(sumOf(lines, 'criticalRate')).toBeCloseTo(62.8895, 4);
    expect(sumOf(lines, 'criticalDmg')).toBeCloseTo(519.1736, 4);
  });

  it('특성을 안 찍었으면 줄 없음 (기본값 0)', () => {
    expect(battleStatLines({}, tables.Mastery, label)).toEqual([]);
    expect(battleDamageLines({}, tables.Mastery, label, { doubleAttack: 999, superCritical: 999, spearAttack: 999, smite: 999 })).toEqual([]);
  });

  it('63 흘러넘치는 체력 값 50 → 공격력 ×1.5 (확률과 상관없이 항상 켜짐)', () => {
    const lines = battleDamageLines(level20(63), tables.Mastery, label, {});
    expect(lines).toEqual([{ source: 'calc.buff.battle.barrierFullSource', stat: '_per_attackDamage', value: 50 }]);
    expect(Math.pow(10, combineLines(lines)._per_attackDamage.log)).toBeCloseTo(1.5, 12);
  });

  it('매직 가드 기본 항이 0 이면 (magicGuardOn false) 흘러넘치는 체력도 꺼진다 (게임 m2137 이 32e1d5c 에서 끝남)', () => {
    expect(battleDamageLines(level20(63), tables.Mastery, label, {}, false)).toEqual([]);
  });

  it('매직 가드 312 · 313 · 314 (consts MAGIC_GUARD): 전환율 135 → 312 400, 313 3단계 × 50, 314 500 × (5초 / 필드 18초 × 교체 켜짐 100%)', () => {
    const values = { ...level20(312, 313, 314), [CONSTS.masteryRuneBuff.SWAP_UPTIME_FIELD]: '100' };
    // 교체 간격 (Option 표 hero_swap_cool → 18게임초) 이 필요해 전체 표를 쓴다
    const fullTables = loadTestTables();
    const lines = magicGuardLines(values, fullTables, tables.Mastery, { barrier: 135 }, true, label);
    expect(lines.map((line) => line.source)).toEqual([
      'calc.buff.battle.magicGuardOverSource',
      'calc.buff.battle.magicGuardStepSource',
      'calc.buff.battle.magicGuardBurstSource',
    ]);
    expect(lines.every((line) => line.stat === '_per_attackDamage')).toBe(true);
    expect(lines[0].value).toBeCloseTo(400, 9);
    expect(lines[1].value).toBeCloseTo(150, 9);
    expect(lines[2].value).toBeCloseTo((500 * 5) / 18, 9);
    // 전환율 100 이하면 312 · 313 없음, 교체가 없으면 314 없음, 기본 항 0 이면 모두 없음
    expect(magicGuardLines(level20(312, 313, 314), fullTables, tables.Mastery, { barrier: 100 }, true, label)).toEqual([]);
    expect(magicGuardLines(values, fullTables, tables.Mastery, { barrier: 135 }, false, label)).toEqual([]);
  });

  it('매직 가드 문턱 얼티밋 (3018 · 3027) 도 기본 항이 0 이면 꺼진다', () => {
    const learned = masteryValues({ 3018: 1, 3027: 1 });
    expect(chanceUltimateLines(learned, tables.Mastery, { barrier: 250 }, (key) => key)).toHaveLength(2);
    expect(chanceUltimateLines(learned, tables.Mastery, { barrier: 250 }, (key) => key, false)).toEqual([]);
  });

  it('102 과충전 연타 400 → ×5 는 연타가 100 을 넘을 때만 (100 이하면 없음)', () => {
    const values = level20(102);
    const over = battleDamageLines(values, tables.Mastery, label, { doubleAttack: 100.01 });
    expect(Math.pow(10, combineLines(over)._per_attackDamage.log)).toBeCloseTo(5, 12);
    expect(battleDamageLines(values, tables.Mastery, label, { doubleAttack: 100 })).toEqual([]);
  });

  it('202 초과된 힘 400 → ×5 는 관통이 100 을 넘을 때, 307 무자비 폭주 400 → ×5 는 무자비가 100 을 넘을 때 (상태이상 조건 없음)', () => {
    const values = level20(202, 307);
    const both = battleDamageLines(values, tables.Mastery, label, { spearAttack: 103.01, smite: 102.9 });
    expect(both.map((line) => line.value)).toEqual([400, 400]);
    expect(Math.pow(10, combineLines(both)._per_attackDamage.log)).toBeCloseTo(25, 9);
    expect(battleDamageLines(values, tables.Mastery, label, { spearAttack: 100, smite: 99 })).toEqual([]);
    expect(battleDamageLines(values, tables.Mastery, label, { spearAttack: 103.01 }).map((line) => line.value)).toEqual([400]);
  });

  it('108 한계 돌파: floor((슈퍼 치명타 − 100) / 10) 단계 x 값 (118.68 → 1단계 ×1.5, 130.91 → 3단계 ×2.5, 100.4 → 없음)', () => {
    const values = level20(108);
    const factorOf = (superCritical: number) => {
      const lines = battleDamageLines(values, tables.Mastery, label, { superCritical });
      return lines.length ? Math.pow(10, combineLines(lines)._per_attackDamage.log) : 1;
    };
    expect(factorOf(118.68)).toBeCloseTo(1.5, 12);
    expect(factorOf(130.91)).toBeCloseTo(2.5, 12);
    expect(factorOf(100.4)).toBe(1);
  });

  it('버프 탭 줄과 확률: 01:54 계정 규칙 — 공격속도 정적 1904 + 289.37 → 속도 과열 184단계, 연타 251.69, 치명타 확률 548.3 + 62.89 → 슈퍼 치명타 118.68 (combat_0154.txt)', () => {
    const other: Line[] = [
      { source: '공격속도 합', stat: 'attackSpeed', value: 1904 },
      { source: '연타', stat: 'doubleAttack', value: 27.69 },
      { source: '연타 추가', stat: 'doubleAttackAddPer', value: 40 },
      { source: '속도 과열', stat: 'doubleAttackOverPer', value: 1 },
      { source: '치명타 확률 합', stat: 'criticalRate', value: 548.3 },
      { source: '슈퍼 치명타', stat: 'superCritical', value: 27.68 },
      { source: '슈퍼 치명타 추가', stat: 'superCriticalAddPer', value: 40 },
      { source: '꿰뚫기', stat: 'superCriticalOverPer', value: 1 },
    ];
    const values = { ...level20(204, 13, 9, 58, 309, 102, 108), skillLevel_53: '1', skillEquip_1: '53' };
    // 액티브 스킬 하나를 장착해 초월적 기량 42 가 끼지 않게 한다
    const { chances, battleLines } = chancesWithBattleState(other, values, tables, tables.Mastery, label);
    expect(chances.doubleAttack).toBeCloseTo(251.69, 9);
    expect(chances.superCritical).toBeCloseTo(118.68, 9);
    expect(battleLines.length).toBe(5);
    // 버프 탭 전체 줄에 battleLines 가 들어가고, 과충전 (연타 251.69 > 100) 과 한계 돌파 (1단계) 가 이어서 붙는다
    const tab = masteryRuneBuffTabs(() => other).find((item) => item.id === 'buff')!;
    const buffTabLines = tab.lines(values, tables);
    expect(buffTabLines.filter((line) => line.stat === 'attackSpeed').length).toBe(4);
    expect(buffTabLines.some((line) => line.source.startsWith('calc.buff.battle.overchargeSource') || line.source.startsWith('과충전 연타'))).toBe(true);
  });
});
