import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import attributeRuneText from '../../../../public/data/tables/AttributeRune.json?raw';
import awakenText from '../../../../public/data/tables/Awaken.json?raw';
import characterText from '../../../../public/data/tables/Character.json?raw';
import masteryText from '../../../../public/data/tables/Mastery.json?raw';
import petText from '../../../../public/data/tables/Pet.json?raw';
import type { RawTable, StatTables } from '@/data/statTables';
import { useCalcStore } from '@/store/useCalcStore';
import { renderWithProviders } from '@/test/renderWithProviders';
import { CALC_KEY_PREFIX, calcValuesOf } from '@/calc/storeKeys';
import type { Line } from '@/calc/combine';
import type { CalcTab } from '@/calc/types';
import { masteryRuneBuffTabs } from '@/calc/sources/masteryRuneBuff/index';

const tables: StatTables = {
  Mastery: JSON.parse(masteryText) as RawTable,
  AttributeRune: JSON.parse(attributeRuneText) as RawTable,
  Pet: JSON.parse(petText) as RawTable,
  Character: JSON.parse(characterText) as RawTable,
  Awaken: JSON.parse(awakenText) as RawTable,
};

/** 화면처럼 저장소 값을 읽고 저장소에 쓰는 패널 (테스트가 저장소에 넣은 값이 패널에 보이도록) */
function StoreBoundPanel({ tab }: { tab: CalcTab }) {
  const storeValues = useCalcStore((state) => state.values);
  const setStoreValue = useCalcStore((state) => state.setValue);
  return (
    <tab.Panel
      values={calcValuesOf(storeValues)}
      setValue={(fieldId, text) => setStoreValue(CALC_KEY_PREFIX + fieldId, text)}
      tables={tables}
      descriptions={{}}
    />
  );
}

/** 특성 탭은 칸이 많아, 전체 테스트를 함께 돌리면 첫 렌더 테스트가 기본 제한 5초를 넘는다 (단독 실행은 통과) */
const MASTERY_FIRST_RENDER_TIMEOUT_MS = 20000;

function renderTab(tabId: string, otherLines: Line[] = []) {
  const tab = masteryRuneBuffTabs(() => otherLines).find((item) => item.id === tabId)!;
  return renderWithProviders(<StoreBoundPanel tab={tab} />);
}

describe('특성·룬·버프 화면', () => {
  beforeEach(() => {
    useCalcStore.getState().reset();
  });

  it('특성: 레벨 칸 입력은 칸 mastery_<번호> 에 저장하고, 최대를 넘지 않는다', () => {
    renderTab('mastery');
    fireEvent.change(screen.getByLabelText('완력 강화 레벨'), { target: { value: '5' } });
    expect(useCalcStore.getState().values['calc.mastery_1']).toBe('5');
    fireEvent.change(screen.getByLabelText('완력 강화 레벨'), { target: { value: '99' } });
    expect(useCalcStore.getState().values['calc.mastery_1']).toBe('20');
    // 열마다 (스탯·스킬·히어로) 초기화 버튼이 있고, 첫 열 = 스탯
    fireEvent.click(screen.getAllByText('이 종류 초기화')[0]);
    expect(useCalcStore.getState().values['calc.mastery_1']).toBe('');
  }, MASTERY_FIRST_RENDER_TIMEOUT_MS);

  it('특성: 얼티밋은 켜면 레벨 1', () => {
    renderTab('mastery');
    fireEvent.click(screen.getByLabelText('화염의 동반자'));
    expect(useCalcStore.getState().values['calc.mastery_1000']).toBe('1');
  });

  it('룬: 레벨 입력 → 누적 값, 속성 룬 상한은 (코어 + 1) × 10', () => {
    useCalcStore.getState().setValue('calc.rune_0', '2036');
    useCalcStore.getState().setValue('calc.rune_core', '203');
    renderTab('rune');
    expect(screen.getByText('누적 효과 20.36A%')).toBeTruthy();
    expect(screen.getAllByText('/ 2040')).toHaveLength(6);
    expect(screen.getByText('/ 399')).toBeTruthy();
  });

  it('버프: 학살자 칸과 광폭화 안내 (스킬 광폭화 특성을 찍었으면 늘 5중첩, 중첩 칸 없음)', () => {
    useCalcStore.getState().setValue('calc.mastery_10', '3');
    renderTab('buff');
    fireEvent.click(screen.getByLabelText('학살자 발동'));
    expect(useCalcStore.getState().values['calc.killerActive']).toBe('true');
    expect(screen.getByText(/^광폭화 5중첩 · 학살자 공격력 ×/)).toBeTruthy();
    expect(screen.queryByLabelText(/광폭화 중첩/)).toBeNull();
  });

  it('버프: 연타·스킬 콤보 % 를 다른 탭 줄로 계산해 늘 보여 준다 (저장 데이터 검증 217 / 38.37)', () => {
    useCalcStore.getState().setValue('calc.charName', '에이카');
    renderTab('buff', [
      { source: '공격속도', stat: 'attackSpeed', value: 920 },
      { source: '궁수', stat: 'Archer_AttackSpeed', value: 775 },
      { source: '물', stat: 'WaterHero_AttackSpeed', value: 330 },
      { source: '연타', stat: 'doubleAttack', value: 10 },
      { source: '연타 추가', stat: 'doubleAttackAddPer', value: 40 },
      { source: '속도 과열', stat: 'doubleAttackOverPer', value: 1 },
      { source: '스킬 콤보', stat: 'skillCombo', value: 10 },
      { source: '스킬 콤보 추가', stat: 'skillComboAddPer', value: 20 },
      { source: '연성 스킬 콤보', stat: 'skillCombo', value: 8.37 },
    ]);
    expect(screen.getByText('연타 217% · 스킬 콤보 38.37%')).toBeTruthy();
  });

  it('버프: 다른 탭 줄이 없으면 0% 로 보인다', () => {
    renderTab('buff');
    expect(screen.getByText('연타 0% · 스킬 콤보 0%')).toBeTruthy();
  });

  it('특성: 켠 얼티밋 중 계산하지 못하는 것을 보여 준다 (문양 집중), 계산하는 것 (연격 해방) 은 빠진다', () => {
    useCalcStore.getState().setValue('calc.mastery_2012', '1');
    useCalcStore.getState().setValue('calc.mastery_3015', '1');
    renderTab('mastery');
    expect(screen.getByText('아직 계산에 넣지 않은 얼티밋: 문양 집중')).toBeTruthy();
  });

  it('특성: 일반 특성 아이콘을 누르면 최대, 최대에서 한 번 더 누르면 0', () => {
    renderTab('mastery');
    fireEvent.click(screen.getByLabelText('완력 강화 최대 레벨로 채우기'));
    expect(useCalcStore.getState().values['calc.mastery_1']).toBe('20');
    fireEvent.click(screen.getByLabelText('완력 강화 최대 레벨로 채우기'));
    expect(useCalcStore.getState().values['calc.mastery_1']).toBe('0');
  });

  it('베르 각성: 등급·별 드롭다운과 단계, 지금 단계의 세부 스탯 레벨 칸 (명중 칸 없음)', () => {
    useCalcStore.getState().setValue('calc.awakenGrade', 'XR');
    useCalcStore.getState().setValue('calc.awakenStar', '7');
    renderTab('awakenDetail');
    expect(screen.getByText('각성 97단계')).toBeTruthy();
    // 설명 문구 없이 그리면 스탯 이름이 그대로 나온다: 공격력·체력·명중·일반·보스·히어로 중 명중만 칸이 없음
    const levelInputs = screen.getAllByLabelText(/ 레벨$/).map((element) => element.getAttribute('aria-label'));
    expect(levelInputs.length).toBe(5);
    expect(levelInputs.some((label) => /hit/i.test(label ?? ''))).toBe(false);
  });
});
