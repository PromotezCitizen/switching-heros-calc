import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import cardSetText from '../../../../public/data/tables/CardSet.json?raw';
import cardStickerSetText from '../../../../public/data/tables/CardStickerSet.json?raw';
import cardText from '../../../../public/data/tables/Card.json?raw';
import characterText from '../../../../public/data/tables/Character.json?raw';
import contentMissionText from '../../../../public/data/tables/ContentMission.json?raw';
import diceOptionText from '../../../../public/data/tables/DiceOption.json?raw';
import libraryText from '../../../../public/data/tables/Library.json?raw';
import petText from '../../../../public/data/tables/Pet.json?raw';
import soulForgeText from '../../../../public/data/tables/SoulForge.json?raw';
import weaponCharText from '../../../../public/data/tables/WeaponChar.json?raw';
import weaponJobText from '../../../../public/data/tables/WeaponJob.json?raw';
import weaponTranscendText from '../../../../public/data/tables/WeaponTranscend.json?raw';
import type { RawTable, StatTables } from '@/data/statTables';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { CalcValues } from '@/calc/types';
import { EXPECTED_FROM_HTML } from '@/calc/sources/heroWeaponCardPet/expectedFromHtml';
import { heroWeaponCardPetTabs } from '@/calc/sources/heroWeaponCardPet/index';
import { weaponTotalAtk } from '@/calc/sources/heroWeaponCardPet/weapon';
import { formatLog } from '@/calc/gameNumber';
import { exclusiveOwnedStarField } from '@/calc/sources/hero/rosterFields';

const tables: StatTables = Object.fromEntries(
  Object.entries({
    Card: cardText,
    CardSet: cardSetText,
    CardStickerSet: cardStickerSetText,
    Character: characterText,
    ContentMission: contentMissionText,
    DiceOption: diceOptionText,
    Library: libraryText,
    Pet: petText,
    SoulForge: soulForgeText,
    WeaponChar: weaponCharText,
    WeaponJob: weaponJobText,
    WeaponTranscend: weaponTranscendText,
  }).map(([name, text]) => [name, JSON.parse(text) as RawTable]),
);

function renderTab(tabId: string, values: CalcValues) {
  const tab = heroWeaponCardPetTabs.find((item) => item.id === tabId)!;
  const setValue = vi.fn();
  const Panel = tab.Panel;
  renderWithProviders(<Panel values={values} setValue={setValue} tables={tables} descriptions={{}} />);
  return setValue;
}

describe('히어로의 기록·무기·카드·펫·광산 화면', () => {
  it('빈 입력으로 모든 탭이 그려진다', () => {
    for (const tab of heroWeaponCardPetTabs) renderTab(tab.id, {});
    expect(screen.getByText('레벨 0 (자동)')).toBeTruthy();
    expect(screen.getAllByText('미보유').length).toBeGreaterThan(0);
  });

  it('히어로의 기록: 보관소 레벨과 열린 전승 칸', () => {
    renderTab('library', { ...EXPECTED_FROM_HTML.libraryLow.values });
    expect(screen.getByText('레벨 2 (자동)')).toBeTruthy();
    expect(screen.getAllByLabelText('1번 능력치').length).toBeGreaterThan(0);
    expect(screen.queryAllByLabelText('2번 능력치')).toEqual([]);
  });

  it('무기: 전용 무기를 가졌으면 일반 무기 장착 칸 없음 (장착 효과 표는 화면에서 뺌)', () => {
    renderTab('weapon', { ...EXPECTED_FROM_HTML.weaponWithHero.values });
    expect(screen.queryByText('390.41F%')).toBeNull();
    expect(screen.queryByLabelText('장착 효과 공격력 증가')).toBeNull();
    expect(screen.getByText(EXPECTED_FROM_HTML.weaponWithHero.screen.possess)).toBeTruthy();
  });

  it('무기: 전용 무기가 없으면 (★ 빈칸) 일반 무기 장착 칸이 보인다 (보유한 전용 무기는 늘 낀 것으로 봄)', () => {
    renderTab('weapon', { ...EXPECTED_FROM_HTML.weaponWithHero.values, weaponStar: '' });
    expect(screen.queryByText('390.41F%')).toBeNull();
    expect(screen.getByLabelText('장착 효과 공격력 증가')).toBeTruthy();
  });

  it('무기 누적 능력치: 입력 칸 없이 전용 무기 ★ 에서 계산한 값 (★ 없으면 0%)', () => {
    renderTab('weapon', {});
    expect(screen.getByText('0%')).toBeTruthy();
    expect(screen.queryByPlaceholderText('예: 1,282%')).toBeNull();
    const values: CalcValues = { [exclusiveOwnedStarField('1021')]: '13' };
    renderTab('weapon', values);
    expect(screen.getByText(`${formatLog(weaponTotalAtk(values, tables)!.percentLog)}%`)).toBeTruthy();
  });

  it('몬스터 카드: 마크가 있는 세트만 보인다', () => {
    renderTab('card', { ...EXPECTED_FROM_HTML.card.values });
    // 등급·성을 고른 카드의 마크만 센다 (기존 HTML 은 등급 없는 카드 마크도 셈 → 숫자가 다름)
    const markCounts = screen.getAllByText(/^마크 \d+개$/).map((element) => element.textContent);
    expect(markCounts.length).toBeGreaterThan(0);
    expect(markCounts).not.toContain('마크 0개');
  });

  it('펫: 등급 버튼은 같은 성을 유지하고, 리더 버튼은 켜고 끈다', () => {
    const setValue = renderTab('pet', { ...EXPECTED_FROM_HTML.pet.values });
    // 리더 효과는 보유 펫 카드마다 나온다 (장착 칸에는 다시 쓰지 않음)
    expect(screen.getAllByText(/^리더 효과: /).length).toBeGreaterThan(0);
    const commy = screen.getAllByText('코미')[0].closest('.mantine-Card-root') as HTMLElement;
    fireEvent.click(Array.from(commy.querySelectorAll('button')).find((button) => button.textContent === 'B')!);
    expect(setValue).toHaveBeenCalledWith('pet_1', 'B_2');
    fireEvent.click(screen.getAllByText('리더')[0]);
    expect(setValue).toHaveBeenCalledWith('petLeader', '');
  });
});
