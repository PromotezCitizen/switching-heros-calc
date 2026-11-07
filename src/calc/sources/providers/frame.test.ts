import { describe, expect, it } from 'vitest';
import { frameLines, frameOwnedField, frameRows } from '@/calc/sources/providers/frame';
import { combineLines } from '@/calc/combine';
import { providerTabs } from '@/calc/sources/providers/index';
import { loadTestTables } from '@/test/loadTestTables';
import { frameValues } from '@/usb/saveImport/frameValues';

const tables = loadTestTables();
const label = (key: string, params?: Record<string, unknown>) => `${key}${params ? JSON.stringify(params) : ''}`;

describe('테두리 보유 효과 (5.70 새 제공자)', () => {
  it('효과가 있는 테두리는 1~16번 (0번은 스탯 없음)', () => {
    expect(frameRows(tables).map((row) => row.frameId)).toEqual(Array.from({ length: 16 }, (_, index) => String(index + 1)));
  });

  it('켠 테두리마다 공격력 줄 하나 (장착 여부와 무관, 안 켜면 줄 없음)', () => {
    expect(frameLines({}, tables, label)).toEqual([]);
    const lines = frameLines({ [frameOwnedField('3')]: 'true', [frameOwnedField('5')]: 'false', [frameOwnedField('7')]: 'true' }, tables, label);
    expect(lines.map((line) => [line.stat, line.value])).toEqual([
      ['_per_attackDamage', 100],
      ['_per_attackDamage', 100],
    ]);
  });

  it('_per_ 스탯이라 줄마다 곱해진다 (테두리 2개 = ×4)', () => {
    const lines = frameLines({ [frameOwnedField('1')]: 'true', [frameOwnedField('2')]: 'true' }, tables, label);
    const combined = combineLines(lines);
    expect(combined._per_attackDamage.log).toBeCloseTo(Math.log10(4), 10);
  });

  it('탭 목록에 있고 쓰는 표가 Frame', () => {
    expect(providerTabs.find((tab) => tab.id === 'frame')!.tableNames).toEqual(['Frame']);
  });

  it('가져오기: 보유 목록 [0, 3] → 3번만 켜지고 나머지는 꺼짐', () => {
    const { values, notes } = frameValues({ frameIdList: [0, 3] }, tables);
    expect(notes).toEqual([]);
    expect(values[frameOwnedField('3')]).toBe('true');
    expect(values[frameOwnedField('1')]).toBe('false');
    expect(values[frameOwnedField('0')]).toBe('true');
    expect(frameValues({}, tables).values[frameOwnedField('3')]).toBe('false');
  });
});
