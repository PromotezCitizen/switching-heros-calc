import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import coreMasteryText from '../../../../public/data/tables/CoreMastery.json?raw';
import figureStatText from '../../../../public/data/tables/FigureStat.json?raw';
import attributeRuneText from '../../../../public/data/tables/AttributeRune.json?raw';
import attributeRuneLabText from '../../../../public/data/tables/AttributeRuneLab.json?raw';
import characterText from '../../../../public/data/tables/Character.json?raw';
import skillText from '../../../../public/data/tables/Skill.json?raw';
import type { RawTable, StatTables } from '@/data/statTables';
import { renderWithProviders } from '@/test/renderWithProviders';
import { masteryRuneBuffTabs } from '@/calc/sources/masteryRuneBuff';
import { skillTab } from '@/calc/sources/skill';
import type { CalcValues } from '@/calc/types';
import { providerTabs } from '@/calc/sources/providers/index';

/** 새로 만든 칸이 그려지고 값을 바꾸면 setValue 가 맞는 칸 이름으로 불리는지 (입력은 시험 안에서 넣음) */
const tables: StatTables = Object.fromEntries(
  Object.entries({
    CoreMastery: coreMasteryText,
    FigureStat: figureStatText,
    AttributeRune: attributeRuneText,
    AttributeRuneLab: attributeRuneLabText,
    Character: characterText,
    Skill: skillText,
  }).map(([name, text]) => [name, JSON.parse(text) as RawTable]),
);

function renderTab(tab: { Panel: (typeof providerTabs)[number]['Panel'] }, values: CalcValues) {
  const setValue = vi.fn();
  const Panel = tab.Panel;
  renderWithProviders(<Panel values={values} setValue={setValue} tables={tables} descriptions={{}} />);
  return setValue;
}

describe('코어 특성 · 피규어 · 룬 연구실 · 스킬 옵션 화면', () => {
  it('코어 특성: 레벨이 비면 항목 칸이 없고, 레벨을 넣으면 그 레벨 행의 항목 13개가 꺼진 채로 보인다', () => {
    const coreMastery = providerTabs.find((tab) => tab.id === 'coreMastery')!;
    const setValue = renderTab(coreMastery, {});
    expect(screen.queryAllByRole('checkbox')).toEqual([]);
    fireEvent.change(screen.getByLabelText('코어 특성 레벨'), { target: { value: '3' } });
    expect(setValue).toHaveBeenCalledWith('coreMasteryLevel', '3');
  });

  it('코어 특성: 레벨 1 이면 항목 13개 체크 칸 (처음 꺼짐), 누르면 coreMasterySelect_n 칸 이름', () => {
    const coreMastery = providerTabs.find((tab) => tab.id === 'coreMastery')!;
    renderTab(coreMastery, { coreMasteryLevel: '1' });
    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(boxes).toHaveLength(13);
    expect(boxes.every((box) => !box.checked)).toBe(true);
  });

  it('피규어: 펼친 채로 공용 · 히어로 전용 카드 (이름 · 레벨 칸), 108종', () => {
    const figure = providerTabs.find((tab) => tab.id === 'figure')!;
    const setValue = renderTab(figure, {});
    expect(screen.getByText('공용 피규어 (46종)')).toBeTruthy();
    expect(screen.getByText('히어로 전용 피규어 (62종)')).toBeTruthy();
    expect(screen.getByText('<버서커> 티르')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('<버서커> 티르 레벨'), { target: { value: '5' } });
    expect(setValue).toHaveBeenCalledWith('figureLevel_108', '5');
  });

  it('룬 탭: 속성 룬 연구실 레벨 칸 세 개 (비어 있음) 가 보이고 입력하면 runeLab_<속성> 칸 이름', () => {
    const rune = masteryRuneBuffTabs(() => []).find((tab) => tab.id === 'rune')!;
    const setValue = renderTab(rune, {});
    const fire = screen.getByLabelText('불 연구실 레벨') as HTMLInputElement;
    expect(fire.value).toBe('');
    expect(screen.getByLabelText('물 연구실 레벨')).toBeTruthy();
    expect(screen.getByLabelText('땅 연구실 레벨')).toBeTruthy();
    fireEvent.change(fire, { target: { value: '7' } });
    expect(setValue).toHaveBeenCalledWith('runeLab_Fire', '7');
  });

  it('스킬 탭: 장착 1~5번 칸은 아이콘으로 고르고, 보유 스킬은 직업별 카드 4장 (스킬 옵션 칸 없음)', () => {
    renderTab(skillTab, {});
    for (const slot of [1, 2, 3, 4, 5]) expect(screen.getByRole('button', { name: `${slot}번 칸` })).toBeTruthy();
    for (const job of ['검사', '격투가', '궁수', '마법사']) expect(screen.getByText(job)).toBeTruthy();
    expect(screen.queryByText(/다발 화살 옵션/)).toBeNull();
  });
});
