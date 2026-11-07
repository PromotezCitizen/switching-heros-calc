import { describe, expect, it } from 'vitest';
import '@/i18n';
import AttributeRuneLabTable from '../../../../public/data/tables/AttributeRuneLab.json';
import CharacterTable from '../../../../public/data/tables/Character.json';
import CoreMasteryTable from '../../../../public/data/tables/CoreMastery.json';
import FigureStatTable from '../../../../public/data/tables/FigureStat.json';
import { tableRows, type StatTables } from '@/data/statTables';
import type { CalcValues } from '@/calc/types';
import { runeLabField, runeLabLines } from '@/calc/sources/masteryRuneBuff/rune';
import { coreMasteryLines, coreMasterySelectField, maxCoreMasteryLevel } from '@/calc/sources/providers/coreMastery';
import { figureLevelField, figureLines, figureRow, figures } from '@/calc/sources/providers/figure';
import { providerTabs } from '@/calc/sources/providers/index';

/**
 * 입력은 전부 테스트 안에서 만든다 (기본값 = 비어 있음). 표 값은 서버 표 그대로:
 * CoreMastery Lv1 = 모든 항목 33.3521, Lv2 = 77.8279 (5.70 앱 내장 표) / FigureStat 1번 Lv1 = `_per_targetHero0_hp` 100, Lv2 = 141.42
 */
const tables = {
  AttributeRuneLab: AttributeRuneLabTable,
  Character: CharacterTable,
  CoreMastery: CoreMasteryTable,
  FigureStat: FigureStatTable,
} as unknown as StatTables;
const label = (key: string, params?: Record<string, string | number>) => `${key} ${JSON.stringify(params ?? {})}`;

describe('코어 특성 (T1271, stat-provider-formulas.md 10-4절)', () => {
  it('레벨이 비어 있거나 항목을 하나도 안 켜면 줄 없음 (기본값 비어 있음 · 꺼짐)', () => {
    expect(coreMasteryLines({}, tables, label)).toEqual([]);
    expect(coreMasteryLines({ coreMasteryLevel: '1' }, tables, label)).toEqual([]);
    expect(coreMasteryLines({ [coreMasterySelectField(2)]: 'true' }, tables, label)).toEqual([]);
  });

  it('켠 항목 k 마다 그 레벨 행의 k 번째 스탯 · 값을 한 번씩 (Lv1: 2번 물 속성 공격력, 8번 히어로 대상 공격력 33.3521)', () => {
    const values: CalcValues = {
      coreMasteryLevel: '1',
      [coreMasterySelectField(2)]: 'true',
      [coreMasterySelectField(8)]: 'true',
    };
    const lines = coreMasteryLines(values, tables, label);
    expect(lines.map((line) => [line.stat, line.value])).toEqual([
      ['_per_WaterHero_AttackDamage', 33.3521],
      ['_per_attackDamage_TargetUnitHero', 33.3521],
    ]);
  });

  it('레벨이 오르면 그 레벨 행의 값 (Lv2 = 77.8279), 표 범위를 벗어나면 줄 없음', () => {
    const select = { [coreMasterySelectField(1)]: 'true' };
    expect(coreMasteryLines({ ...select, coreMasteryLevel: '2' }, tables, label)[0].value).toBe(77.8279);
    expect(maxCoreMasteryLevel(tables)).toBe(150);
    expect(coreMasteryLines({ ...select, coreMasteryLevel: '151' }, tables, label)).toEqual([]);
  });

  it('탭 목록에 있고 쓰는 표가 CoreMastery', () => {
    const tab = providerTabs.find((candidate) => candidate.id === 'coreMastery')!;
    expect(tab.tableNames).toEqual(['CoreMastery']);
    expect(tab.lines({ coreMasteryLevel: '1', [coreMasterySelectField(2)]: 'true' }, tables)).toHaveLength(1);
  });
});

describe('피규어 (T1276, stat-provider-formulas.md 10-5절)', () => {
  /** 일반 공격력 % (`_per_attackDamage`) 를 첫 스탯으로 주는 피규어 */
  const plain = figures(tables).find((figure) => figure.firstStat === '_per_attackDamage')!;
  const cardSetPoint = figures(tables).find((figure) => figure.firstStat === '_per_attackDamage_CardSetPoint')!;

  it('피규어 108종, 레벨이 비어 있으면 줄 없음', () => {
    expect(figures(tables)).toHaveLength(108);
    expect(figureLines({}, tables, label)).toEqual([]);
  });

  /** 행의 슬롯 3개 중 스탯이 있고 값이 0 이 아닌 것 (표 그대로) */
  const slotPairs = (row: Record<string, string>) =>
    [1, 2, 3]
      .filter((slot) => row[`statType${slot}`] !== 'None' && Number(row[`statValue${slot}`]) !== 0)
      .map((slot) => [row[`statType${slot}`], Number(row[`statValue${slot}`])]);

  it('레벨을 넣은 피규어마다 (번호, 레벨) 행의 슬롯 스탯 · 값 (표 값 그대로)', () => {
    const row = figureRow(tables, plain.figureId, 3)!;
    const lines = figureLines({ [figureLevelField(plain.figureId)]: '3' }, tables, label);
    expect(lines.map((line) => [line.stat, line.value])).toEqual(slotPairs(row));
    expect(lines[0].stat).toBe('_per_attackDamage');
  });

  it('최대 레벨을 넘긴 값은 최대 레벨 행, 0 은 미보유', () => {
    const top = figureRow(tables, plain.figureId, plain.maxLevel)!;
    const over = figureLines({ [figureLevelField(plain.figureId)]: '9999' }, tables, label);
    expect(over.map((line) => [line.stat, line.value])).toEqual(slotPairs(top));
    expect(figureLines({ [figureLevelField(plain.figureId)]: '0' }, tables, label)).toEqual([]);
  });

  it('히어로 번호가 붙은 체력 증가는 1슬롯 히어로 번호가 같을 때만 체력 % 로 (1번 피규어 = 히어로 0 체력, Lv2 = 141.42)', () => {
    const rinOwned: CalcValues = { charName: '린', heroOwnedGrade_0: 'SSS', [figureLevelField('1')]: '2' };
    expect(figureLines(rinOwned, tables, label).map((line) => [line.stat, line.value])).toEqual([['_per_hp', 141.42]]);
    const eikaOwned: CalcValues = { charName: '에이카', heroOwnedGrade_205: 'SSS', [figureLevelField('1')]: '2' };
    expect(figureLines(eikaOwned, tables, label)).toEqual([]);
    expect(figureLines({ [figureLevelField('1')]: '2' }, tables, label)).toEqual([]);
  });

  it('카드 세트 점수 이름은 값 x 카드 탭 세트 보너스 합계 % 로 공격력 증가에 (세트 점수가 비면 줄 없음)', () => {
    const row = figureRow(tables, cardSetPoint.figureId, 1)!;
    const base: CalcValues = { [figureLevelField(cardSetPoint.figureId)]: '1' };
    expect(figureLines(base, tables, label).some((line) => line.stat === '_per_attackDamage')).toBe(false);
    const lines = figureLines({ ...base, relicLink_cardSetBonus: '460' }, tables, label);
    expect(lines.map((line) => [line.stat, line.value])).toContainEqual(['_per_attackDamage', Number(row.statValue1) * 460]);
    expect(lines.some((line) => line.stat === '_per_attackDamage_CardSetPoint')).toBe(false);
  });

  it('탭 목록에 있고 쓰는 표가 FigureStat · Character', () => {
    const tab = providerTabs.find((candidate) => candidate.id === 'figure')!;
    expect(tab.tableNames).toEqual(['FigureStat', 'Character']);
  });
});

describe('속성 룬 연구실 (T1262 (다), stat-provider-formulas.md 3-3절)', () => {
  const rows = tableRows(tables.AttributeRuneLab);
  const labRow = (attribute: string, level: number) =>
    rows.find((row) => row.attType === attribute && Number(row.lv) === level)!;

  it('연구실 레벨이 비어 있거나 1 이하면 줄 없음 (레벨 1 행은 보상 없음)', () => {
    expect(runeLabLines({}, tables, label)).toEqual([]);
    expect(runeLabLines({ [runeLabField('Fire')]: '1' }, tables, label)).toEqual([]);
    expect(runeLabLines({ [runeLabField('Fire')]: '0' }, tables, label)).toEqual([]);
  });

  it('속성마다 (속성, 레벨) 행 하나의 보상 스탯 · 값 (낮은 레벨 행을 더하지 않음)', () => {
    const lines = runeLabLines({ [runeLabField('Fire')]: '5', [runeLabField('Water')]: '2' }, tables, label);
    expect(lines.map((line) => [line.stat, line.value])).toEqual([
      ['_per_FireHero_AttackDamage', Number(labRow('Fire', 5).rwdValue)],
      ['_per_WaterHero_AttackDamage', Number(labRow('Water', 2).rwdValue)],
    ]);
  });

  it('표가 없으면 줄 없음', () => {
    expect(runeLabLines({ [runeLabField('Fire')]: '5' }, {}, label)).toEqual([]);
  });
});
