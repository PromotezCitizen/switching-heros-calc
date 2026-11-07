/* 처음 기대값은 기존 htmls/stat-calc.html 에 같은 입력을 넣고 읽은 값이다
   (claude-docs/react-port/expect_training_relic.py → make_training_relic_test.py 로 생성).
   그 뒤 히어로·전용 무기·직업 무기 표 자동 계산과 유물 101 ÷100 (gap-atk-increase-provider.md 4-4) 을 손으로 반영해
   지금은 손으로 관리하는 파일이다. 생성 스크립트로 다시 만들면 이 변경이 사라지니 다시 만들지 말 것 */
import { describe, expect, it } from 'vitest';
import { combineLines, type CombinedStat, type Line } from '@/calc/combine';
import { tableRows, type RawTable, type StatTables } from '@/data/statTables';
import relicTable from '../../../../public/data/tables/Relic.json';
import trainingTable from '../../../../public/data/tables/Training.json';
import weaponJobTable from '../../../../public/data/tables/WeaponJob.json';
import characterTable from '../../../../public/data/tables/Character.json';
import weaponCharTable from '../../../../public/data/tables/WeaponChar.json';
import relicText from '@/i18n/calc/relic.ko.json';
import {
  lowerGradeRelicFill,
  maxNormalWeaponLevelSum,
  normalWeaponLevel,
  normalWeaponLevelFieldId,
  normalWeaponLevelSum,
  relicLines,
  relicMultiplier,
  relicTargetStat,
} from '@/calc/sources/trainingRelic/relic';
import { trainingLines, trainingMaxStage, trainingSlotRows } from '@/calc/sources/trainingRelic/training';

/**
 * 직업 일반 무기 합산 레벨은 입력 칸 없이 실제 표 WeaponJob 의 최대 레벨 합으로 자동 계산한다
 * (직업마다 30종 × 최대 레벨 = 7,750 → 게임 코드 m2690 은 100으로 나눠 77). 무기 연동 유물 4종 기대값은 이 77 로 바꿨다
 * (서버 문구 "10당" 과 코드가 다름, gap-atk-increase-provider.md 4-4. 기존 화면은 입력값으로 계산, 이전 기대값은 775)
 */
/**
 * SS·SSS 이상 히어로 수, ★10 전용 무기 수는 히어로 표·전용 무기 표에서 센다. 기존 화면 기대값 (5 / 3 / 2) 이 나오게
 * 입력은 SSS 3명 + SS 2명, ★10·★12 무기 2개로 넣었다
 */
const tables: StatTables = {
  Relic: relicTable as RawTable,
  Training: trainingTable as RawTable,
  WeaponJob: weaponJobTable as RawTable,
  Character: characterTable as RawTable,
  WeaponChar: weaponCharTable as RawTable,
};
const relicNames = relicText.names as Record<string, string>;
const trainingSource = (stage: number) => `훈련 ${stage}단계`;
const relicSources = {
  relic: (relicId: string, level: number, multiplier: number | null) =>
    `${relicNames[relicId]} Lv${level}` + (multiplier === null ? '' : ` × ${multiplier}`),
  blessing: '유물의 축복',
};

function expectNear(actual: number, wanted: number) {
  expect(Math.abs(actual - wanted)).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(wanted)));
}
function expectCombined(lines: Line[], wanted: Record<string, CombinedStat>) {
  const combined = combineLines(lines);
  expect(Object.keys(combined)).toEqual(Object.keys(wanted));
  for (const [stat, entry] of Object.entries(wanted)) {
    expect(combined[stat].kind).toBe(entry.kind);
    expect(combined[stat].count).toBe(entry.count);
    expectNear(combined[stat].log, entry.log);
    expectNear(combined[stat].sum, entry.sum);
  }
}
/** 대소문자만 다른 스탯 (기존 화면은 한 철자로 바꿔 줄에 넣음) 은 소문자로 묶어 비교한다 */
function statSums(lines: Line[]): Record<string, number> {
  const sums: Record<string, number> = {};
  for (const line of lines) sums[line.stat.toLowerCase()] = (sums[line.stat.toLowerCase()] ?? 0) + Number(line.value);
  return sums;
}

describe('유물 101 일반 무기 합산 레벨 개수', () => {
  it('개수 = floor(직업별 일반 무기 최대 레벨 합 / 100) (서버 문구 "10당" 과 달리 게임 코드 m2690 을 따름, gap-atk-increase-provider.md 4-4)', () => {
    for (const job of ['Swordsman', 'Fighter', 'Archer', 'Mage']) {
      const levelSum = maxNormalWeaponLevelSum(tables, job);
      expect(levelSum).toBeGreaterThan(0);
      expect(relicMultiplier(`_per_${job}_HaveWeaponsLv100`, {}, tables)).toBe(Math.floor(levelSum / 100));
    }
    expect(maxNormalWeaponLevelSum(tables, 'Archer')).toBe(7750);
    expect(relicMultiplier('_per_Archer_HaveWeaponsLv100', {}, tables)).toBe(77);
  });
});

describe('유물 99·100·101·102 일반 무기 합산 레벨: 4직업 모두 공격력 % 에 곱함 + 실제 강화 레벨 합 (m2690)', () => {
  const JOBS = ['Swordsman', 'Fighter', 'Archer', 'Mage'];
  const jobRows = (job: string) => tableRows(tables.WeaponJob).filter((row) => row.job === job);
  /** 그 직업 무기의 강화 레벨을 앞 무기부터 최대 레벨로 채워 합이 total 이 되게 하고 나머지는 0 으로 둔 입력 (테스트 안에서 만든 입력) */
  function levelsSummingTo(job: string, total: number): Record<string, string> {
    let remaining = total;
    const values: Record<string, string> = {};
    for (const row of jobRows(job)) {
      const level = Math.min(Number(row.maxLv), remaining);
      values[normalWeaponLevelFieldId(row.weaponId)] = String(level);
      remaining -= level;
    }
    return values;
  }

  it('무기 칸을 비우면 최대 레벨 합 7,750 → N = 77, 직업마다 같음 (예전 가정과 같은 값)', () => {
    for (const job of JOBS) {
      expect(normalWeaponLevelSum({}, tables, job)).toBe(maxNormalWeaponLevelSum(tables, job));
      expect(relicMultiplier(`_per_${job}_HaveWeaponsLv100`, {}, tables)).toBe(77);
    }
  });

  it('실제 강화 레벨 합 1,234 → N = 12, 다른 직업은 칸이 비어 그대로 77', () => {
    const values = levelsSummingTo('Swordsman', 1234);
    expect(normalWeaponLevelSum(values, tables, 'Swordsman')).toBe(1234);
    expect(relicMultiplier('_per_Swordsman_HaveWeaponsLv100', values, tables)).toBe(12);
    expect(relicMultiplier('_per_Archer_HaveWeaponsLv100', values, tables)).toBe(77);
  });

  it('칸에 0 을 넣으면 그 무기는 0 레벨 (비운 칸과 다름), 최대 레벨 넘는 값은 최대로 자름', () => {
    const [first] = jobRows('Mage');
    const zero = { [normalWeaponLevelFieldId(first.weaponId)]: '0' };
    expect(normalWeaponLevelSum(zero, tables, 'Mage')).toBe(maxNormalWeaponLevelSum(tables, 'Mage') - Number(first.maxLv));
    expect(normalWeaponLevel({ [normalWeaponLevelFieldId(first.weaponId)]: '99999' }, first)).toBe(Number(first.maxLv));
  });

  it('직업별 유물 4개가 모두 _per_attackDamage 에 값 x N 으로 들어간다 (직업 이름 공격력 아님)', () => {
    expect(relicTargetStat('_per_Swordsman_HaveWeaponsLv100')).toBe('_per_attackDamage');
    expect(relicTargetStat('_per_Fighter_HaveWeaponsLv100')).toBe('_per_attackDamage');
    expect(relicTargetStat('_per_Archer_HaveWeaponsLv100')).toBe('_per_attackDamage');
    expect(relicTargetStat('_per_Mage_HaveWeaponsLv100')).toBe('_per_attackDamage');
    const weaponRelics = tableRows(tables.Relic).filter((row) => /_HaveWeaponsLv100$/.test(row.statType));
    expect(weaponRelics.map((row) => row.statType).sort()).toEqual(JOBS.map((job) => `_per_${job}_HaveWeaponsLv100`).sort());
    const values: Record<string, string> = Object.fromEntries(weaponRelics.map((row) => [`relic_${row.relicId}`, '5']));
    const lines = relicLines(values, tables, relicSources).filter((line) => line.source.includes('× 77'));
    expect(lines).toHaveLength(4);
    for (const line of lines) {
      expect(line.stat).toBe('_per_attackDamage');
      expect(line.value).toBeCloseTo(22.1375, 9);
    }
    // 4개를 곱하면 직업 하나에만 들어가던 예전보다 크다 (x10101-1057-gamecode.md: 다른 3직업 몫 로그 0.74392)
    const combined = combineLines(lines);
    expect(combined._per_attackDamage.log).toBeCloseTo(4 * Math.log10(1 + 22.1375 / 100), 9);
  });
});

describe('훈련', () => {
  it('최대 단계 (수치표 grade)', () => {
    expect(trainingMaxStage(tables)).toBe(1582);
  });

  it("trainingMid {\"trainingStage\": \"177\", \"trainingLevel1\": \"37\", \"trainingLevel2\": \"120\", \"trainingLevel3\": \"5\", \"trainingLevel4\": \"999\"}", () => {
    const values = {"trainingStage": "177", "trainingLevel1": "37", "trainingLevel2": "120", "trainingLevel3": "5", "trainingLevel4": "999"};
    const lines = trainingLines(values, tables, trainingSource);
    expect(lines.length).toBe(530);
    expect(lines.slice(0, 3)).toEqual([{ source: "훈련 1단계", stat: "_per_attackDamage", value: 18 }, { source: "훈련 1단계", stat: "_per_hp", value: 18 }, { source: "훈련 2단계", stat: "_per_attackDamage", value: 18 }]);
    expect(lines.slice(-3)).toEqual([{ source: "훈련 177단계", stat: "_per_attackDamage", value: 0.5549999999999999 }, { source: "훈련 177단계", stat: "_per_hp", value: 1.7999999999999998 }, { source: "훈련 177단계", stat: "_per_CharSkillDamage", value: 14.985 }]);
    const sums = statSums(lines);
    const wantedSums: Record<string, number> = {"_per_attackdamage": 9354.555, "_per_hp": 9355.8, "attackspeed": 333, "criticalrate": 166.8, "criticaldmg": 834, "_per_normalmonsterdamage": 1008, "_per_bossmonsterdamage": 996, "_per_heromonsterdamage": 1002, "hitdamagereduction": 19.799999999999997, "_per_buffandactivedmg": 1026, "_per_charskilldamage": 986.985, "_per_changeskilldamage": 972};
    for (const [stat, sum] of Object.entries(wantedSums)) expectNear(sums[stat], sum);
    expectCombined(lines, {
      "_per_attackDamage": { kind: "multiply", log: 32.538192439009364, sum: 0, count: 177 },
      "_per_hp": { kind: "multiply", log: 32.54353654666788, sum: 0, count: 177 },
      "attackSpeed": { kind: "sum", log: 0, sum: 333, count: 19 },
      "criticalRate": { kind: "sum", log: 0, sum: 166.8, count: 19 },
      "criticalDmg": { kind: "sum", log: 0, sum: 834, count: 19 },
      "_per_NormalMonsterDamage": { kind: "multiply", log: 3.508911883426553, sum: 0, count: 19 },
      "_per_BossMonsterDamage": { kind: "multiply", log: 3.4687946602185704, sum: 0, count: 19 },
      "_per_HeroMonsterDamage": { kind: "multiply", log: 3.489316327363172, sum: 0, count: 19 },
      "hitDamageReduction": { kind: "sum", log: 0, sum: 19.799999999999997, count: 6 },
      "_per_buffAndActiveDmg": { kind: "multiply", log: 3.5628936958927984, sum: 0, count: 19 },
      "_per_CharSkillDamage": { kind: "multiply", log: 3.436014164608914, sum: 0, count: 19 },
      "_per_ChangeSkillDamage": { kind: "multiply", log: 3.3753729750563353, sum: 0, count: 18 },
    });
    /* 화면에 보이는 항목 칸의 최대 레벨 (null = 숨김: 행 없음 또는 명중) */
    expect(trainingSlotRows(values, tables).map((row) => (row ? Number(row.maxLevel) : null))).toEqual([3000, 3000, null, 3000]);
  });

  it("trainingFirst {\"trainingStage\": \"1\", \"trainingLevel1\": \"150\", \"trainingLevel2\": \"3\"}", () => {
    const values = {"trainingStage": "1", "trainingLevel1": "150", "trainingLevel2": "3"};
    const lines = trainingLines(values, tables, trainingSource);
    expect(lines.length).toBe(2);
    expect(lines.slice(0, 3)).toEqual([{ source: "훈련 1단계", stat: "_per_attackDamage", value: 15 }, { source: "훈련 1단계", stat: "_per_hp", value: 0.30000000000000004 }]);
    expect(lines.slice(-3)).toEqual([{ source: "훈련 1단계", stat: "_per_attackDamage", value: 15 }, { source: "훈련 1단계", stat: "_per_hp", value: 0.30000000000000004 }]);
    const sums = statSums(lines);
    const wantedSums: Record<string, number> = {"_per_attackdamage": 15, "_per_hp": 0.30000000000000004};
    for (const [stat, sum] of Object.entries(wantedSums)) expectNear(sums[stat], sum);
    expectCombined(lines, {
      "_per_attackDamage": { kind: "multiply", log: 0.06069784035361173, sum: 0, count: 1 },
      "_per_hp": { kind: "multiply", log: 0.001300933020418072, sum: 0, count: 1 },
    });
    /* 화면에 보이는 항목 칸의 최대 레벨 (null = 숨김: 행 없음 또는 명중) */
    expect(trainingSlotRows(values, tables).map((row) => (row ? Number(row.maxLevel) : null))).toEqual([150, 150, null, null]);
  });

  it("trainingOver {\"trainingStage\": \"99999\", \"trainingLevel1\": \"1\"}", () => {
    // 옛 표 (790단계까지) 에서 99999 → 791 로 잘리던 시나리오. 서버 최신 표는 1,582단계까지라 791 을 직접 넣어 같은 줄인지 본다
    const values = {"trainingStage": "791", "trainingLevel1": "1"};
    const lines = trainingLines(values, tables, trainingSource);
    expect(lines.length).toBe(2370);
    expect(lines.slice(0, 3)).toEqual([{ source: "훈련 1단계", stat: "_per_attackDamage", value: 18 }, { source: "훈련 1단계", stat: "_per_hp", value: 18 }, { source: "훈련 2단계", stat: "_per_attackDamage", value: 18 }]);
    expect(lines.slice(-3)).toEqual([{ source: "훈련 790단계", stat: "_per_hp", value: 54 }, { source: "훈련 790단계", stat: "_per_ChangeSkillDamage", value: 54 }, { source: "훈련 791단계", stat: "_per_attackDamage", value: 0.015 }]);
    const sums = statSums(lines);
    const wantedSums: Record<string, number> = {"_per_attackdamage": 42510.015, "_per_hp": 42510, "attackspeed": 1557, "criticalrate": 778.8, "criticaldmg": 3894, "_per_normalmonsterdamage": 4680, "_per_bossmonsterdamage": 4668, "_per_heromonsterdamage": 4674, "hitdamagereduction": 19.799999999999997, "_per_buffandactivedmg": 4698, "_per_charskilldamage": 4698, "_per_changeskilldamage": 4698};
    for (const [stat, sum] of Object.entries(wantedSums)) expectNear(sums[stat], sum);
    expectCombined(lines, {
      "_per_attackDamage": { kind: "multiply", log: 147.67357650154054, sum: 0, count: 791 },
      "_per_hp": { kind: "multiply", log: 147.67351136225358, sum: 0, count: 790 },
      "attackSpeed": { kind: "sum", log: 0, sum: 1557, count: 87 },
      "criticalRate": { kind: "sum", log: 0, sum: 778.8, count: 87 },
      "criticalDmg": { kind: "sum", log: 0, sum: 3894, count: 87 },
      "_per_NormalMonsterDamage": { kind: "multiply", log: 16.260320900306052, sum: 0, count: 87 },
      "_per_BossMonsterDamage": { kind: "multiply", log: 16.22020367709807, sum: 0, count: 87 },
      "_per_HeroMonsterDamage": { kind: "multiply", log: 16.240725344242673, sum: 0, count: 87 },
      "hitDamageReduction": { kind: "sum", log: 0, sum: 19.799999999999997, count: 6 },
      "_per_buffAndActiveDmg": { kind: "multiply", log: 16.3143027127723, sum: 0, count: 87 },
      "_per_CharSkillDamage": { kind: "multiply", log: 16.3143027127723, sum: 0, count: 87 },
      "_per_ChangeSkillDamage": { kind: "multiply", log: 16.3143027127723, sum: 0, count: 87 },
    });
    /* 화면에 보이는 항목 칸의 최대 레벨 (null = 숨김: 행 없음 또는 명중) */
    expect(trainingSlotRows(values, tables).map((row) => (row ? Number(row.maxLevel) : null))).toEqual([3000, 3000, null, 3000]);
  });

  it("trainingEmpty {\"trainingLevel1\": \"5\"}", () => {
    const values = {"trainingLevel1": "5"};
    const lines = trainingLines(values, tables, trainingSource);
    expect(lines.length).toBe(0);
    expect(lines.slice(0, 3)).toEqual([]);
    expect(lines.slice(-3)).toEqual([]);
    const sums = statSums(lines);
    const wantedSums: Record<string, number> = {};
    for (const [stat, sum] of Object.entries(wantedSums)) expectNear(sums[stat], sum);
    expectCombined(lines, {
    });
  });
});

describe('유물', () => {

  it("relicAll", () => {
    const values: Record<string, string> = {"relicLink_dispatchLevel": "37", "relicLink_cardSetBonus": "12", "heroOwnedGrade_0": "SSS", "heroOwnedGrade_1": "SSS", "heroOwnedGrade_2": "SSS", "heroOwnedGrade_3": "SS", "heroOwnedGrade_100": "SS", "skillEquip_1": "1", "skillEquip_2": "3", "skillEquip_3": "5", "skillEquip_4": "7", "skillEquip_5": "9", "skillLevel_1": "50", "skillLevel_3": "50", "skillLevel_5": "50", "skillLevel_7": "50", "skillLevel_9": "50", "relicLink_weaponLevelSwordsman": "1234", "relicLink_weaponLevelFighter": "567", "relicLink_weaponLevelArcher": "89", "relicLink_weaponLevelMage": "10", "relicLink_dungeonGold": "40", "relicLink_dungeonEquip": "30", "relicLink_dungeonRelic": "20", "relicLink_rCards": "15", "relicLink_ssrCards": "7", "exclusiveOwnedStar_1001": "10", "exclusiveOwnedStar_1002": "12", "rune_core": "203", "rune_0": "100", "rune_1": "200", "rune_2": "300", "rune_3": "400", "rune_4": "500", "rune_5": "600", "library_Swordsman": "11", "library_Fighter": "22", "library_Archer": "33", "library_Mage": "44", "trainingStage": "177", "relic_101": "5", "relic_100": "5", "relic_102": "5", "relic_99": "5", "relic_320": "5", "relic_301": "5", "relic_345": "5", "relic_74": "5", "relic_448": "5", "relic_450": "5", "relic_409": "5", "relic_384": "5", "relic_429": "5", "relic_365": "5", "relic_71": "5", "relic_97": "5", "relic_473": "5", "relic_73": "5", "relic_98": "5", "relic_321": "5", "relic_302": "5", "relic_346": "5", "relic_75": "5", "relic_449": "5", "relic_451": "5", "relic_410": "5", "relic_385": "5", "relic_430": "5", "relic_366": "5", "relic_72": "5", "relic_96": "5", "relic_474": "5", "relic_161": "5", "relic_162": "5", "relic_139": "5", "relic_140": "5", "relic_181": "5", "relic_182": "5", "relic_201": "5", "relic_203": "5", "relic_221": "5", "relic_223": "5", "relic_241": "5", "relic_243": "5", "relic_202": "5", "relic_204": "5", "relic_222": "5", "relic_224": "5", "relic_242": "5", "relic_244": "5", "relic_141": "5", "relic_142": "5", "relic_1": "10", "relic_2": "99", "relic_4": "3.7", "relic_5": "1", "relic_50": "7", "relic_150": "12", "relic_300": "40", "relic_400": "2", "relic_460": "1"};
    const lines = relicLines(values, tables, relicSources);
    expect(lines).toEqual([
      { source: "지혜의 서 Lv10", stat: "_per_attackDamage", value: 30 },
      { source: "망각의 물약 Lv10", stat: "_per_hp", value: 30 },
      { source: "오라클의 눈 Lv3", stat: "attackSpeed", value: 4.75 },
      { source: "조르크의 심장 Lv1", stat: "criticalRate", value: 0.8125 },
      { source: "네빌의 감옥 Lv7", stat: "_per_hp", value: 30.5 },
      { source: "네빌의 왕관 Lv5 × 5", stat: "_per_attackDamage", value: 11.25 },
      { source: "불멸의 심장 Lv5 × 5", stat: "_per_hp", value: 11.25 },
      { source: "빛의 인장 Lv5 × 5", stat: "_per_hit", value: 11.25 },
      { source: "마도사의 수기 Lv5 × 250", stat: "_per_attackDamage", value: 45 },
      { source: "재생의 깃털 Lv5 × 250", stat: "_per_hp", value: 45 },
      { source: "마칸의 심장 Lv5 × 3", stat: "_per_hp", value: 0.8624999999999999 },
      { source: "빛을 잃은 펜던트 Lv5 × 3", stat: "_per_attackDamage", value: 0.8624999999999999 },
      { source: "영혼의 파편 Lv5 × 3", stat: "_per_hit", value: 0.8624999999999999 },
      { source: "절망의 가시 Lv5 × 77", stat: "_per_attackDamage", value: 22.1375 },
      { source: "천둥의 깃 Lv5 × 77", stat: "_per_attackDamage", value: 22.1375 },
      { source: "바포메트의 두상 Lv5 × 77", stat: "_per_attackDamage", value: 22.1375 },
      { source: "깃털 가면 Lv5 × 77", stat: "_per_attackDamage", value: 22.1375 },
      { source: "보라 포도송이 Lv5 × 37", stat: "_per_attackDamage", value: 103.6 },
      { source: "염소 해골 잎 Lv5 × 37", stat: "_per_hp", value: 103.6 },
      { source: "봉인된 서판 Lv5 × 176", stat: "_per_attackDamage", value: 96.80000000000001 },
      { source: "불꽃 조각 Lv5 × 176", stat: "_per_hp", value: 96.80000000000001 },
      { source: "흰 뿔 해골 가면 Lv12", stat: "_per_Mage_HeroMonsterDamage", value: 77.5 },
      { source: "하얀 석판 Lv5 × 12", stat: "_per_attackDamage", value: 1.92 },
      { source: "고급 보물 상자 Lv5 × 12", stat: "_per_hp", value: 1.92 },
      { source: "용암 큐브 V2 Lv5 × 203", stat: "_per_attackDamage", value: 133.98 },
      { source: "흰색 치즈 Lv5 × 203", stat: "_per_hp", value: 133.98 },
      { source: "빙결 코인 Lv5 × 100", stat: "_per_attackDamage", value: 8 },
      { source: "고대 화살 판 Lv5 × 100", stat: "_per_hp", value: 8 },
      { source: "흰빛 원반 Lv5 × 200", stat: "_per_attackDamage", value: 16 },
      { source: "마법 목걸이 Lv5 × 200", stat: "_per_hp", value: 16 },
      { source: "별 문양 브로치 Lv5 × 300", stat: "_per_attackDamage", value: 16.5 },
      { source: "마법 경첩 Lv5 × 300", stat: "_per_hp", value: 16.5 },
      { source: "태양 엠블럼 v2 Lv5 × 400", stat: "_per_attackDamage", value: 22 },
      { source: "고 서 Lv5 × 400", stat: "_per_hp", value: 22 },
      { source: "잠긴 보물 상자 Lv5 × 500", stat: "_per_attackDamage", value: 15.000000000000002 },
      { source: "양모 뭉치 Lv5 × 500", stat: "_per_hp", value: 15.000000000000002 },
      { source: "크리스탈 구슬 Lv5 × 600", stat: "_per_attackDamage", value: 18 },
      { source: "크리스탈 구슬 Lv5 × 600", stat: "_per_hp", value: 18 },
      { source: "은총의 밀라의 보석홀 Lv40", stat: "_per_Mage_CriticalDmg", value: 81 },
      { source: "격렬한 불의 심장석 Lv5 × 40", stat: "_per_attackDamage", value: 8.200000000000001 },
      { source: "정지된 얼어붙은 달의 눈물 Lv5 × 40", stat: "_per_hp", value: 16.400000000000002 },
      { source: "혼돈의 파멸의 속삭임 Lv5 × 30", stat: "_per_attackDamage", value: 6.15 },
      { source: "심연의 고요한 심해의 진주 Lv5 × 30", stat: "_per_hp", value: 12.3 },
      { source: "몽환의 깃털 가면 Lv5 × 20", stat: "_per_attackDamage", value: 4.1000000000000005 },
      { source: "매혹의 비단뱀 귀찌 Lv5 × 20", stat: "_per_hp", value: 8.200000000000001 },
      { source: "영원의 꽃잎다발 Lv5 × 11", stat: "_per_attackDamage", value: 9.020000000000001 },
      { source: "가을의 단풍잎묶음 Lv5 × 11", stat: "_per_hp", value: 18.040000000000003 },
      { source: "봉인된 고대 서판 Lv5 × 22", stat: "_per_attackDamage", value: 18.040000000000003 },
      { source: "타오르는 불꽃 조각 Lv5 × 22", stat: "_per_hp", value: 36.080000000000005 },
      { source: "정밀한 조준 병 Lv2", stat: "_per_WaterHero_BossMonsterDamage", value: 67.4 },
      { source: "강렬한 루비 도장 Lv5 × 33", stat: "_per_attackDamage", value: 17.325 },
      { source: "은밀한 푸른 표범 가면 Lv5 × 33", stat: "_per_hp", value: 34.65 },
      { source: "신비로운 보라 결정석 Lv5 × 44", stat: "_per_attackDamage", value: 23.1 },
      { source: "암흑의 검은 악마 두상 Lv5 × 44", stat: "_per_hp", value: 46.2 },
      { source: "잊혀진 잉크 책 Lv5 × 15", stat: "_per_attackDamage", value: 82.5 },
      { source: "심장의 하트 수정 Lv5 × 15", stat: "_per_hp", value: 275.625 },
      { source: "순수한 파란 마나 구슬 Lv5 × 7", stat: "_per_attackDamage", value: 73.5 },
      { source: "자유의 날개 목걸이 Lv5 × 7", stat: "_per_hp", value: 147 },
      { source: "분노의 붉은 가면 Lv1", stat: "_per_Fighter_BossMonsterDamage", value: 121.1 },
      { source: "붉은 십자가 목걸이 Lv5 × 2", stat: "_per_attackDamage", value: 10.5 },
      { source: "루비 수정 목걸이 Lv5 × 2", stat: "_per_hp", value: 21 },
      // 게임 m2690 은 유물 474 체력을 ★5 이상 전용 무기 수로 한 번 더 곱한다 (html-verify-A-2026-11-07.md D10). 여기선 ★10 · ★12 둘 다 ★5 이상
      { source: "루비 수정 목걸이 Lv5 × 2", stat: "_per_hp", value: 21 },
      { source: "유물의 축복", stat: "_per_attackDamage", value: 44281426111100080 },
      { source: "유물의 축복", stat: "_per_hp", value: 44281426111100080 },
    ]);
    expectCombined(lines, {
      /* 직업 일반 무기 합산 레벨 유물 4개 (각 log 0.086849026292592) 가 직업 이름이 아니라 공격력 % 에 곱해져 29줄 */
      "_per_attackDamage": { kind: "multiply", log: 17.22565767868552 + 4 * 0.086849026292592, sum: 0, count: 29 },
      /* 유물 474 체력 ★5 이상 수 줄 (+21%) 이 하나 더 (게임 m2690) */
      "_per_hp": { kind: "multiply", log: 18.151335623371367 + Math.log10(1.21), sum: 0, count: 27 },
      "attackSpeed": { kind: "sum", log: 0, sum: 4.75, count: 1 },
      "criticalRate": { kind: "sum", log: 0, sum: 0.8125, count: 1 },
      "_per_hit": { kind: "multiply", log: 0.05002974812757109, sum: 0, count: 2 },
      "_per_Mage_HeroMonsterDamage": { kind: "multiply", log: 0.24919835739111293, sum: 0, count: 1 },
      "_per_Mage_CriticalDmg": { kind: "multiply", log: 0.2576785748691845, sum: 0, count: 1 },
      "_per_WaterHero_BossMonsterDamage": { kind: "multiply", log: 0.22375545365724117, sum: 0, count: 1 },
      "_per_Fighter_BossMonsterDamage": { kind: "multiply", log: 0.34458874257871397, sum: 0, count: 1 },
    });
    /* 기존 화면의 유물의 축복 칸: 유물의 축복44.28E / 보이는 연동 칸: relicLink_dispatchLevel, relicLink_ssHeroes, relicLink_sssHeroes, relicLink_equipSkillLevel, relicLink_weaponLevelSwordsman, relicLink_weaponLevelFighter, relicLink_weaponLevelArcher, relicLink_weaponLevelMage, relicLink_dungeonGold, relicLink_dungeonEquip, relicLink_dungeonRelic, relicLink_rCards, relicLink_ssrCards, relicLink_star10Weapons, relicLink_cardSetBonus */
  });

  it("relicMaxSsr", () => {
    const values: Record<string, string> = {"relicLink_dispatchLevel": "37", "relicLink_cardSetBonus": "12", "heroOwnedGrade_0": "SSS", "heroOwnedGrade_1": "SSS", "heroOwnedGrade_2": "SSS", "heroOwnedGrade_3": "SS", "heroOwnedGrade_100": "SS", "skillEquip_1": "1", "skillEquip_2": "3", "skillEquip_3": "5", "skillEquip_4": "7", "skillEquip_5": "9", "skillLevel_1": "50", "skillLevel_3": "50", "skillLevel_5": "50", "skillLevel_7": "50", "skillLevel_9": "50", "relicLink_weaponLevelSwordsman": "1234", "relicLink_weaponLevelFighter": "567", "relicLink_weaponLevelArcher": "89", "relicLink_weaponLevelMage": "10", "relicLink_dungeonGold": "40", "relicLink_dungeonEquip": "30", "relicLink_dungeonRelic": "20", "relicLink_rCards": "15", "relicLink_ssrCards": "7", "exclusiveOwnedStar_1001": "10", "exclusiveOwnedStar_1002": "12", "rune_core": "203", "rune_0": "100", "rune_1": "200", "rune_2": "300", "rune_3": "400", "rune_4": "500", "rune_5": "600", "library_Swordsman": "11", "library_Fighter": "22", "library_Archer": "33", "library_Mage": "44", "trainingStage": "177", "relicMaxGrade": "SSR", "relic_101": "5", "relic_100": "5", "relic_102": "5", "relic_99": "5", "relic_320": "5", "relic_301": "5", "relic_345": "5", "relic_74": "5", "relic_448": "5", "relic_450": "5", "relic_409": "5", "relic_384": "5", "relic_429": "5", "relic_365": "5", "relic_71": "5", "relic_97": "5", "relic_473": "5", "relic_73": "5", "relic_98": "5", "relic_321": "5", "relic_302": "5", "relic_346": "5", "relic_75": "5", "relic_449": "5", "relic_451": "5", "relic_410": "5", "relic_385": "5", "relic_430": "5", "relic_366": "5", "relic_72": "5", "relic_96": "5", "relic_474": "5", "relic_161": "5", "relic_162": "5", "relic_139": "5", "relic_140": "5", "relic_181": "5", "relic_182": "5", "relic_201": "5", "relic_203": "5", "relic_221": "5", "relic_223": "5", "relic_241": "5", "relic_243": "5", "relic_202": "5", "relic_204": "5", "relic_222": "5", "relic_224": "5", "relic_242": "5", "relic_244": "5", "relic_141": "5", "relic_142": "5", "relic_1": "10", "relic_2": "99", "relic_4": "3.7", "relic_5": "1", "relic_50": "7", "relic_150": "12", "relic_300": "40", "relic_400": "2", "relic_460": "1"};
    const lines = relicLines(values, tables, relicSources);
    expect(lines).toEqual([
      { source: "지혜의 서 Lv10", stat: "_per_attackDamage", value: 30 },
      { source: "망각의 물약 Lv10", stat: "_per_hp", value: 30 },
      { source: "오라클의 눈 Lv3", stat: "attackSpeed", value: 4.75 },
      { source: "조르크의 심장 Lv1", stat: "criticalRate", value: 0.8125 },
      { source: "네빌의 감옥 Lv7", stat: "_per_hp", value: 30.5 },
      { source: "네빌의 왕관 Lv5 × 5", stat: "_per_attackDamage", value: 11.25 },
      { source: "불멸의 심장 Lv5 × 5", stat: "_per_hp", value: 11.25 },
      { source: "빛의 인장 Lv5 × 5", stat: "_per_hit", value: 11.25 },
      { source: "마도사의 수기 Lv5 × 250", stat: "_per_attackDamage", value: 45 },
      { source: "재생의 깃털 Lv5 × 250", stat: "_per_hp", value: 45 },
      { source: "마칸의 심장 Lv5 × 3", stat: "_per_hp", value: 0.8624999999999999 },
      { source: "빛을 잃은 펜던트 Lv5 × 3", stat: "_per_attackDamage", value: 0.8624999999999999 },
      { source: "영혼의 파편 Lv5 × 3", stat: "_per_hit", value: 0.8624999999999999 },
      { source: "절망의 가시 Lv5 × 77", stat: "_per_attackDamage", value: 22.1375 },
      { source: "천둥의 깃 Lv5 × 77", stat: "_per_attackDamage", value: 22.1375 },
      { source: "바포메트의 두상 Lv5 × 77", stat: "_per_attackDamage", value: 22.1375 },
      { source: "깃털 가면 Lv5 × 77", stat: "_per_attackDamage", value: 22.1375 },
      { source: "보라 포도송이 Lv5 × 37", stat: "_per_attackDamage", value: 103.6 },
      { source: "염소 해골 잎 Lv5 × 37", stat: "_per_hp", value: 103.6 },
      { source: "봉인된 서판 Lv5 × 176", stat: "_per_attackDamage", value: 96.80000000000001 },
      { source: "불꽃 조각 Lv5 × 176", stat: "_per_hp", value: 96.80000000000001 },
      { source: "흰 뿔 해골 가면 Lv12", stat: "_per_Mage_HeroMonsterDamage", value: 77.5 },
      { source: "하얀 석판 Lv5 × 12", stat: "_per_attackDamage", value: 1.92 },
      { source: "고급 보물 상자 Lv5 × 12", stat: "_per_hp", value: 1.92 },
      { source: "유물의 축복", stat: "_per_attackDamage", value: 7725080 },
      { source: "유물의 축복", stat: "_per_hp", value: 7725080 },
    ]);
    expectCombined(lines, {
      "_per_attackDamage": { kind: "multiply", log: 5.824311992882753 + 4 * 0.086849026292592, sum: 0, count: 12 },
      "_per_hp": { kind: "multiply", log: 5.939922504557052, sum: 0, count: 9 },
      "attackSpeed": { kind: "sum", log: 0, sum: 4.75, count: 1 },
      "criticalRate": { kind: "sum", log: 0, sum: 0.8125, count: 1 },
      "_per_hit": { kind: "multiply", log: 0.05002974812757109, sum: 0, count: 2 },
      "_per_Mage_HeroMonsterDamage": { kind: "multiply", log: 0.24919835739111293, sum: 0, count: 1 },
    });
    /* 기존 화면의 유물의 축복 칸: 유물의 축복7.73B / 보이는 연동 칸: relicLink_dispatchLevel, relicLink_ssHeroes, relicLink_sssHeroes, relicLink_equipSkillLevel, relicLink_weaponLevelSwordsman, relicLink_weaponLevelFighter, relicLink_weaponLevelArcher, relicLink_weaponLevelMage, relicLink_cardSetBonus */
  });

  it('최대 등급 SR 을 고르면 낮은 등급의 레벨 0 유물을 1 로 채운다 (이미 4 인 relic_1 은 그대로)', () => {
    const changes = lowerGradeRelicFill({ relic_1: '4' }, tables, 'SR');
    /* 기존 화면: 값이 있는 유물 칸 140개 (relic_1 = 4 포함) */
    expect(Object.keys(changes).length).toBe(139);
    expect(changes.relic_1).toBeUndefined();
    expect(Object.values(changes).every((text) => text === '1')).toBe(true);
  });
  it('최대 등급이 가장 낮은 등급이면 채우지 않는다', () => {
    /* 기존 화면: [["relic_1", "4"]] */
    expect(lowerGradeRelicFill({ relic_1: '4' }, tables, 'D')).toEqual({});
  });
});
