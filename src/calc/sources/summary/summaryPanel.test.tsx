import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { RawTable, StatTables } from '@/data/statTables';
import { useCalcStore } from '@/store/useCalcStore';
import { renderWithProviders } from '@/test/renderWithProviders';
import SummaryPanel from '@/calc/panels/SummaryPanel';
import { CALC_KEY_PREFIX } from '@/calc/storeKeys';
import { CALC_TABS } from '@/calc/tabs';
import type { CalcValues } from '@/calc/types';
import savedValues from '@/calc/sources/summary/testValues0213.json';

const TABLE_FILES = import.meta.glob<string>('../../../../public/data/tables/*.json', { query: '?raw', import: 'default' });

const tables: StatTables = {};
beforeAll(async () => {
  for (const name of new Set(CALC_TABS.flatMap((tab) => [...tab.tableNames]))) {
    const load = TABLE_FILES[`../../../../public/data/tables/${name}.json`];
    if (load) tables[name] = JSON.parse(await load()) as RawTable;
  }
});

afterEach(() => useCalcStore.getState().reset());

function renderPanel(screenValues: CalcValues, setValue = vi.fn()) {
  const storeValues = Object.fromEntries(
    Object.entries({ ...(savedValues.values as CalcValues), ...screenValues }).map(([fieldId, text]) => [
      CALC_KEY_PREFIX + fieldId,
      text,
    ]),
  );
  useCalcStore.getState().setValues(storeValues);
  renderWithProviders(<SummaryPanel values={screenValues} setValue={setValue} tables={tables} descriptions={{}} />);
}

describe('종합 탭 화면', () => {
  it('프로필 줄마다 계산 값, 화면 값을 넣은 줄만 비교', () => {
    renderPanel({ summaryScreen_hpIncrease: '1.38AX%', summaryScreen_attackSpeed: '2,025%' });
    const hpRow = screen.getByText('체력 증가', { selector: 'p' }).closest('tr') as HTMLElement;
    expect(within(hpRow).getByText('같음')).toBeTruthy();
    const speedRow = screen.getByText('공격속도', { selector: 'p' }).closest('tr') as HTMLElement;
    // 전투 중 최대 상태 공격속도 (관통의 맹공 204 복리 +159.37 · 추진력 +50 · 야성 강화 +30 · 우격다짐 +50 = +289.37) 가 들어와 1,736 → 2,025.37 이 되어 전투 중 화면 2,025 와 같다
    expect(within(speedRow).getByText(/^2,025/)).toBeTruthy();
    expect(within(speedRow).getByText('같음')).toBeTruthy();
    // 이번 검증 (01:54 프로필 17줄 일치) 으로 맞춰 본 줄이 되어 "추정" 표시가 없다
    expect(screen.queryAllByText('추정').length).toBe(0);
  });

  it('공격 대상 칸: 처음 값은 일반, 고르면 summaryTarget 칸에 저장, 일반이 아니면 화면 비교 안내', () => {
    const setValue = vi.fn();
    renderPanel({}, setValue);
    expect((screen.getByRole('radio', { name: '일반 몬스터' }) as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByText(/화면 값 비교는 일반 몬스터일 때/)).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: '보스 몬스터' }));
    expect(setValue).toHaveBeenCalledWith('summaryTarget', 'boss');
  });

  it('공격 대상이 보스면 안내가 보인다', () => {
    renderPanel({ summaryTarget: 'boss' });
    expect((screen.getByRole('radio', { name: '보스 몬스터' }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText(/게임 화면 값과 비교는 일반 몬스터일 때만/)).toBeTruthy();
  });

  it('하위 탭 소계 표', () => {
    renderPanel({});
    expect(screen.getByText('하위 탭 소계')).toBeTruthy();
    expect(screen.getByText('합계')).toBeTruthy();
    expect(screen.getAllByText('히어로').length).toBeGreaterThan(0);
  });
});
