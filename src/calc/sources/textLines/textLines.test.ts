import { describe, expect, it } from 'vitest';
import adsBuffTable from '../../../../public/data/tables/AdsBuff.json';
import characterTable from '../../../../public/data/tables/Character.json';
import characterAffinityTable from '../../../../public/data/tables/CharacterAffinity.json';
import characterAwakenTable from '../../../../public/data/tables/CharacterAwaken.json';
import diaryStatTable from '../../../../public/data/tables/DiaryStat.json';
import type { RawTable, StatTables } from '@/data/statTables';
import { combineLines, type Line } from '@/calc/combine';
import type { CalcValues } from '@/calc/types';
import { diaryLines, diarySlotResults } from '@/calc/sources/textLines/diary';
import i18n from '@/i18n';
import { textLinesTabs } from '@/calc/sources/textLines/index';
import { heroAwakenLines } from '@/calc/sources/textLines/other';
import { parseProfile, profilePercent } from '@/calc/sources/textLines/profile';

/**
 * 기대값 = 기존 htmls/stat-calc.html 을 Playwright 로 열어 같은 입력을 넣고
 * StatCalcSources.render() 의 줄과 StatCalc.combineItems 결과를 읽은 값 (2026-10-06).
 */
const tables: StatTables = {
  AdsBuff: adsBuffTable as RawTable,
  Character: characterTable as RawTable,
  CharacterAwaken: characterAwakenTable as RawTable,
  CharacterAffinity: characterAffinityTable as RawTable,
};

function tabLines(tabId: string, values: CalcValues): Line[] {
  const tab = textLinesTabs.find((candidate) => candidate.id === tabId);
  if (!tab) throw new Error(`탭 없음: ${tabId}`);
  return tab.lines(values, tables);
}

/** 옛 "기타" 칸 줄 = 프로필 아이콘 · 호감도 · 캐릭터 각성 (히어로 탭) · 요정의 축복 칸 줄을 이 순서로 (기존 화면 기대값 순서) */
function formerOtherLines(values: CalcValues): Line[] {
  return [
    ...tabLines('profileIcon', values),
    ...tabLines('affinity', values),
    ...heroAwakenLines(values, tables, (key, params) => i18n.t(key, params ?? {})),
    ...tabLines('fairy', values),
  ];
}

type ExpectedLine = [source: string, stat: string, kind: 'log' | 'value', amount: number];

function expectLines(actual: Line[], expected: ExpectedLine[]) {
  expect(actual.map((line) => [line.source, line.stat])).toEqual(expected.map(([source, stat]) => [source, stat]));
  expected.forEach(([, , kind, amount], index) => {
    if (kind === 'log') {
      expect(actual[index].log).toBeCloseTo(amount, 10);
      expect(actual[index].value).toBeUndefined();
    } else {
      expect(actual[index].value).toBe(amount);
      expect(actual[index].log).toBeUndefined();
    }
  });
}

function expectCombined(lines: Line[], expected: Record<string, [log: number, count: number]>) {
  const combined = combineLines(lines);
  expect(Object.keys(combined)).toEqual(Object.keys(expected));
  for (const [stat, [log, count]] of Object.entries(expected)) {
    expect(combined[stat].log).toBeCloseTo(log, 9);
    expect(combined[stat].count).toBe(count);
  }
}

const FILLED: CalcValues = {
  charName: '린',
  diaryEffect1: '12.3A%',
  diaryEffect2: '5%',
  diaryEffect3: 'abc',
  diaryEffect4: '1,234.5%',
  diaryEffect5: '7.77B%',
  diaryEffect6: '3.2C%',
  diaryEffect7: '40%',
  diaryEffect8: '9.9D%',
  diaryEffect9: '1.1E%',
  diaryEffect10: '2.22F%',
  diaryEffect11: '0',
  diaryEffect12: '88.8G%',
  costumeAtk: '13.08L%',
  costumeCount: '57',
  encyclopediaAtk: '47.75d%',
  encyclopediaHp: '99.62b%',
  titleAtk: '96.09C%',
  titleHp: '',
  profileIconAtk: '5,019%',
  fairyBlessingOn: 'true',
  fairyBondLevel: '627',
  heroAwakenLevel: '10',
};

describe('일기장 (책 번호 + 슬롯 레벨)', () => {
  /** 화면 누적 12개: 2026-10-06 12:5x 캡처 (claude-docs/diary_formula_check.py 와 같은 기대값) */
  const SCREEN_PERCENT = [
    176.7544, 169.5217, 180.3707, 195.1908, 195.1908, 190.6731, 202.5847, 202.5847, 202.5847, 261.5596, 261.5596,
    261.5596,
  ];
  const DIARY_VALUES: CalcValues = {
    diaryBook: '10',
    diarySlotLevel1: '2',
    diarySlotLevel3: '3',
    diarySlotLevel4: '1',
    diarySlotLevel5: '1',
  };
  const diaryTables: StatTables = { DiaryStat: diaryStatTable as RawTable };

  it('화면 누적 능력치와 소수 넷째 자리까지 맞는다', () => {
    const results = diarySlotResults(DIARY_VALUES, diaryTables);
    expect(results).toHaveLength(12);
    results.forEach((result, index) => {
      expect(Math.abs(result.cumulativePercent - SCREEN_PERCENT[index])).toBeLessThan(0.0006);
    });
  });
  it('슬롯 스탯 이름은 서버 표 그대로 쓴다', () => {
    const lines = diaryLines(DIARY_VALUES, diaryTables, (key) => key);
    expect(lines).toHaveLength(12);
    expect(lines[6].stat).toBe('_per_buffAndActiveDmg');
    expect(lines[9].stat).toBe('_per_attackDamage');
  });
  it('책 번호가 비어 있으면 줄이 없다', () => {
    expect(diaryLines({}, diaryTables, (key) => key)).toEqual([]);
    expect(diaryLines({ diarySlotLevel1: '5' }, diaryTables, (key) => key)).toEqual([]);
  });
});

describe('코스튬·도감·칭호 (기존 HTML 한 탭 → 세 탭)', () => {
  it('세 탭의 줄을 합치면 기존 collection 탭과 같다', () => {
    const costume = tabLines('costume', FILLED);
    const encyclopedia = tabLines('collection', FILLED);
    const title = tabLines('title', FILLED);
    expectLines(costume, [['코스튬 누적 능력치', '_per_attackDamage', 'log', 37.11660774398825]]);
    expectLines(encyclopedia, [
      ['도감 효과', '_per_attackDamage', 'log', 13.678973375919766],
      ['도감 효과', '_per_hp', 'log', 7.9983465373963645],
    ]);
    expectLines(title, [['칭호 누적 능력치', '_per_attackDamage', 'log', 10.982678193383485]]);
    expectCombined([...costume, ...encyclopedia, ...title], {
      _per_attackDamage: [55.77825931374437, 3],
      _per_hp: [5.998346973347242, 1],
    });
  });
  it('칭호 체력만 넣은 경우', () => {
    const title = tabLines('title', { titleHp: '40.99C%' });
    expectLines(title, [['칭호 누적 능력치', '_per_hp', 'log', 10.612677918316502]]);
    expectCombined(title, { _per_hp: [8.612677919376015, 1] });
  });
});

describe('기타', () => {
  it('화면 값 · 히어로 각성 · 요정의 축복 (켜짐)', () => {
    const lines = formerOtherLines(FILLED);
    expectLines(lines, [
      ['프로필 아이콘', '_per_attackDamage', 'log', 3.700617195682057],
      ['히어로 각성 Lv10 (린)', '_per_attackDamage', 'value', 132],
      ['별자리 요정의 축복 (요정의 유대 Lv 627)', '_per_attackDamage', 'value', 656],
      ['별자리 요정의 축복 (요정의 유대 Lv 627)', '_per_hp', 'value', 656],
    ]);
    // 기존 기대값 (호감도 화면 값 15.7C% / 18.81B% 포함) 에서 호감도 배율만 뺀 값 (호감도는 히어로 표 레벨로 바뀜)
    const formerAffinityAtkLog = Math.log10(1 + 10 ** 10.195899652409233 / 100);
    const formerAffinityHpLog = Math.log10(1 + 10 ** 7.2743887955503785 / 100);
    expectCombined(lines, {
      _per_attackDamage: [11.149094565117792 - formerAffinityAtkLog, 3],
      _per_hp: [6.152912899894368 - formerAffinityHpLog, 1],
    });
  });

  it('호감도: 히어로 표의 호감도 레벨 → 히어로마다 그 레벨의 누적 공격력·체력 % (서버 표 CharacterAffinity)', () => {
    // 린 (charId 0) Lv2 = 공격력 60 · 체력 30, 카이토 (charId 1) Lv15 = 600 · 300, 레벨 0 은 줄 없음
    const lines = tabLines('affinity', { heroOwnedAffinity_0: '2', heroOwnedAffinity_1: '15', heroOwnedAffinity_2: '0' });
    expectLines(lines, [
      ['호감도 린 Lv2', '_per_attackDamage', 'value', 60],
      ['호감도 린 Lv2', '_per_hp', 'value', 30],
      ['호감도 카이토 Lv15', '_per_attackDamage', 'value', 600],
      ['호감도 카이토 Lv15', '_per_hp', 'value', 300],
    ]);
    expectCombined(lines, {
      _per_attackDamage: [Math.log10(1.6 * 7), 2],
      _per_hp: [Math.log10(1.3 * 4), 2],
    });
  });
  it('축복 꺼짐 · 히어로 없음이면 줄이 없다', () => {
    expect(
      formerOtherLines({ fairyBlessingOn: 'false', fairyBondLevel: '1000', heroAwakenLevel: '10' }),
    ).toEqual([]);
  });
  it('소수 레벨은 버림 (972.9 → 972, 2.7 → 2)', () => {
    const lines = formerOtherLines({
      charName: '린',
      fairyBlessingOn: 'true',
      fairyBondLevel: '972.9',
      heroAwakenLevel: '2.7',
    });
    expectLines(lines, [
      ['히어로 각성 Lv2 (린)', '_per_attackDamage', 'value', 24],
      ['별자리 요정의 축복 (요정의 유대 Lv 972)', '_per_attackDamage', 'value', 1010],
      ['별자리 요정의 축복 (요정의 유대 Lv 972)', '_per_hp', 'value', 1010],
    ]);
    expectCombined(lines, {
      _per_attackDamage: [1.1387446639488927, 2],
      _per_hp: [1.0453229787866576, 1],
    });
  });
});

describe('프로필 창 값', () => {
  it('줄을 만들지 않는다', () => {
    expect(tabLines('profile', { atk: '423.76B' })).toEqual([]);
  });
  it('화면 값을 log10 으로 읽는다 (빈칸·해석 불가는 null)', () => {
    const parsed = parseProfile({ atk: '423.76B', hp: 'abc' });
    expect(parsed.atk).toBeCloseTo(8.62712, 4);
    expect(parsed.hp).toBeNull();
    // 연타 칸은 없앴다 (연타는 다른 탭 줄로 계산)
    expect(Object.keys(parsed)).toEqual(['atk', 'hp']);
    expect(profilePercent({ atk: '423.76' }, 'atk')).toBeCloseTo(423.76, 10);
    expect(profilePercent({}, 'atk')).toBe(0);
  });
});
