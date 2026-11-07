import { describe, expect, it } from 'vitest';
import awakenTable from '../../../../public/data/tables/Awaken.json';
import characterTable from '../../../../public/data/tables/Character.json';
import type { RawTable, StatTables } from '@/data/statTables';
import { formatLog } from '@/calc/gameNumber';
import type { CalcValues } from '@/calc/types';
import {
  awakenFinalCheck,
  awakenGradeChoices,
  awakenStages,
  awakenStarChoices,
  baseCheck,
  characterBase,
  classHpLog,
  heroBase,
  heroBaseAttackSpeedLines,
  heroBaseCriticalLines,
  heroGradeChoices,
  heroNames,
  heroStarChoices,
  heroTabs,
  selectedAwakenStage,
  selectedHero,
} from '@/calc/sources/hero/index';

/**
 * 기대값 = 기존 htmls/stat-calc.html 을 Playwright 로 열어 (계정 기본값 빈 값) 같은 입력을 넣고
 * StatCalc.characterBase / awakenStages, 기본값 확인 표 (#baseCheck), 각성 단계·확인 문구, 선택 칸 목록을 읽은 값 (2026-10-06,
 * claude-docs/react-port/expect_hero.py)
 */
const tables: StatTables = {
  Character: characterTable as RawTable,
  Awaken: awakenTable as RawTable,
};

/** 기존 화면 #baseCheck 의 줄 [이름, 수치표 기본값, 화면 값, 같음/다름] 과 같은 모양으로 */
function baseCheckCells(values: CalcValues) {
  const labels = { atk: '공격력', hp: '체력' };
  return baseCheck(values, tables)?.map((row) => [
    labels[row.stat],
    formatLog(row.tableLog),
    formatLog(row.screenLog),
    row.same ? '같음' : '다름',
  ]);
}

describe('히어로 선택', () => {
  it('히어로 이름 목록 (표 순서, 31명 — 서버 최신 표)', () => {
    const names = heroNames(tables);
    expect(names.length).toBe(31);
    expect(names.slice(0, 3)).toEqual(['린', '카이토', '라스칼']);
    expect(names.at(-1)).toBe('미르');
  });

  it('등급·성 선택지', () => {
    expect(heroGradeChoices(tables, '셰나')).toEqual(['C', 'B', 'A', 'S', 'SS', 'SSS']);
    expect(heroGradeChoices(tables, '린')).toEqual(['D', 'C', 'B', 'A', 'S', 'SS', 'SSS']);
    expect(heroGradeChoices(tables, '레이')).toEqual(['SS', 'SSS']);
    expect(heroStarChoices(tables, '셰나', 'S')).toEqual(['0', '1', '2']);
    expect(heroGradeChoices(tables, '')).toEqual([]);
  });

  it('두 히어로: 셰나 S 2성 기본값 (공격력 같음, 체력 다름)', () => {
    const values: CalcValues = { charName: '셰나', charName2: '루피아', charGrade: 'S', charStar: '2', atk: '735.70A', hp: '1.5A' };
    const base = heroBase(values, tables)!;
    expect(base.atk).toBeCloseTo(5.866698394777513, 12);
    expect(base.hp).toBeCloseTo(7.042789653833195, 12);
    expect(baseCheckCells(values)).toEqual([
      ['공격력', '735.70A', '735.70A', '같음'],
      ['체력', '11.04B', '1,500', '다름'],
    ]);
  });

  it('등급·성을 안 고르면 첫 선택지 (린 D 0성)', () => {
    const values: CalcValues = { charName: '린', atk: '100', hp: '1,500' };
    expect(selectedHero(values, tables)).toEqual({ name: '린', grade: 'D', star: '0' });
    const base = heroBase(values, tables)!;
    expect(base.atk).toBeCloseTo(2, 12);
    expect(base.hp).toBeCloseTo(3.1760912590556813, 12);
    expect(baseCheckCells(values)).toEqual([
      ['공격력', '100', '100', '같음'],
      ['체력', '1,500', '1,500', '같음'],
    ]);
  });

  it('히어로를 바꿔도 그 히어로에 있는 등급·성은 유지, 프로필 빈칸이면 다름', () => {
    const values: CalcValues = { charName: '레이', charGrade: 'SS', charStar: '1' };
    expect(selectedHero(values, tables)).toEqual({ name: '레이', grade: 'SS', star: '1' });
    const base = heroBase(values, tables)!;
    expect(base.atk).toBeCloseTo(7.246909636489119, 12);
    expect(base.hp).toBeCloseTo(7.820940904216838, 12);
    expect(baseCheckCells(values)).toEqual([
      ['공격력', '17.66B', '-', '다름'],
      ['체력', '66.21B', '-', '다름'],
    ]);
  });

  it('없는 등급이 저장돼 있으면 첫 등급으로', () => {
    expect(selectedHero({ charName: '레이', charGrade: 'D', charStar: '2' }, tables)).toEqual({
      name: '레이',
      grade: 'SS',
      star: '2',
    });
  });

  it('1슬롯 히어로가 없으면 기본값 확인 없음 (2슬롯만 골라도)', () => {
    const values: CalcValues = { charName2: '에이카', atk: '423.76B', hp: '6.36C' };
    expect(heroBase(values, tables)).toBeNull();
    expect(baseCheck(values, tables)).toBeNull();
    expect(characterBase(tables, '없는이름', 'S', 0)).toBeNull();
  });
});

describe('베르 각성 단계', () => {
  it('단계 288개, 등급 35개, 등급별 별', () => {
    const stages = awakenStages(tables);
    expect(stages.length).toBe(1116);
    const grades = awakenGradeChoices(stages);
    expect(grades.length).toBe(127);
    expect(grades.slice(0, 8)).toEqual(['D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'R']);
    expect(grades.at(-1)).toBe('MAX100');
    expect(awakenStarChoices(stages, 'LR')).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8']);
    expect(awakenStarChoices(stages, 'D')).toEqual(['0', '1']);
  });

  it('LR ★5 = 113단계, 최종 배율과 화면 확인 문구', () => {
    const values: CalcValues = { awakenGrade: 'LR', awakenStar: '5', awakenTotalFinalAtk: '153.30S', awakenTotalFinalHp: '3.56Q' };
    const stage = selectedAwakenStage(values, tables)!;
    expect(stage.awakenLv).toBe(113);
    expect(stage.finalAtk).toBeCloseTo(59.185542154854375, 12);
    expect(stage.finalHp).toBeCloseTo(59.185542154854375, 12);
    // 기존: "최종 공격력: 화면 ×153.30S / 수치표 ×153.30S 같음 · 최종 체력: 화면 ×3.56Q / 수치표 ×153.30S 다름"
    const check = awakenFinalCheck(values, stage).map((row) => [row.target, formatLog(row.screenLog), formatLog(row.tableLog), row.same]);
    expect(check).toEqual([
      ['finalAtk', '153.30S', '153.30S', true],
      ['finalHp', '3.56Q', '153.30S', false],
    ]);
  });

  it('별을 안 고르면 그 등급 첫 별 (SSS ★0 = 27단계), 화면 칸이 비면 확인 문구 없음', () => {
    const stage = selectedAwakenStage({ awakenGrade: 'SSS' }, tables)!;
    expect(stage.awakenLv).toBe(27);
    expect(stage.finalAtk).toBeCloseTo(15.577392521180512, 12);
    expect(awakenFinalCheck({}, stage)).toEqual([]);
  });

  it('MAX8 ★8 = 287단계, 아무것도 안 고르면 D ★0 = 0단계 (배율 ×1)', () => {
    const last = selectedAwakenStage({ awakenGrade: 'MAX8', awakenStar: '8' }, tables)!;
    expect(last.awakenLv).toBe(287);
    expect(last.finalAtk).toBeCloseTo(142.2046625117482, 12);
    const first = selectedAwakenStage({}, tables)!;
    expect(first.awakenLv).toBe(0);
    expect(first.finalAtk).toBe(0);
    expect(first.finalHp).toBe(0);
  });
});

describe('직업·속성 체력 %', () => {
  it('1슬롯 히어로의 직업·속성 체력 % 줄만 곱한다', () => {
    // 셰나 = 물 속성 마법사: _per_Mage_Hp 100% (×2) × _per_WaterHero_Hp 50% (×1.5), 다른 직업·속성 줄은 무시.
    // 기대값 0.47712125471966244 = 기존 페이지에서 같은 식 (캐릭터 표 + StatCalc.combineItems) 으로 계산한 값
    const lines = [
      { source: 'a', stat: '_per_Mage_Hp', value: 100 },
      { source: 'b', stat: '_per_WaterHero_Hp', value: 50 },
      { source: 'c', stat: '_per_Archer_Hp', value: 900 },
      { source: 'd', stat: '_per_FireHero_Hp', value: 900 },
    ];
    expect(classHpLog(tables, '셰나', lines)).toBeCloseTo(0.47712125471966244, 12);
    expect(classHpLog(tables, '셰나', [])).toBe(0);
    expect(classHpLog(tables, '', lines)).toBeNull();
  });
});

describe('히어로 탭', () => {
  it('탭: 캐릭터 각성 · 히어로 표 · 전용 무기 표. 캐릭터 각성 레벨이 없으면 기본 공격속도·치명타 줄만 있다', () => {
    // 히어로 · 전용 무기는 한 탭 (사용자 결정 2026-11-07)
    expect(heroTabs.map((tab) => tab.id)).toEqual(['hero', 'heroRoster']);
    const lines = heroTabs[0].lines({ charName: '셰나' }, tables);
    expect(lines.map((line) => [line.stat, line.value])).toEqual([
      ['attackSpeed', 150],
      ['criticalRate', 1],
      ['criticalDmg', 120],
    ]);
    expect(heroTabs[0].lines({}, tables)).toEqual([]);
  });

  it('기본 공격속도 = 1슬롯 히어로 Character 표 atkSpd (에이카 150)', () => {
    const lines = heroBaseAttackSpeedLines({ charName: '에이카' }, tables, (key, params) => `${key} ${params?.hero}`);
    expect(lines).toEqual([{ source: 'calc.hero.sources.baseAttackSpeed 에이카', stat: 'attackSpeed', value: 150 }]);
  });

  it('기본 치명타 확률 1 · 치명타 데미지 합 계열 120 (둘 다 게임 코드 기본 상수, 히어로를 안 고르면 없음)', () => {
    const label = (key: string, params?: Record<string, string | number>) => `${key} ${params?.hero}`;
    expect(heroBaseCriticalLines({ charName: '에이카' }, tables, label)).toEqual([
      { source: 'calc.hero.sources.baseCriticalRate 에이카', stat: 'criticalRate', value: 1 },
      { source: 'calc.hero.sources.baseCriticalDamage 에이카', stat: 'criticalDmg', value: 120 },
    ]);
    expect(heroBaseCriticalLines({}, tables, label)).toEqual([]);
    expect(heroBaseCriticalLines({ charName: '없는 히어로' }, tables, label)).toEqual([]);
  });
});
