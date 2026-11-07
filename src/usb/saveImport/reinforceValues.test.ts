import { describe, expect, it } from 'vitest';
import { loadTestTables } from '@/test/loadTestTables';
import { reinforceValues, type ReinforceSave } from '@/usb/saveImport/reinforceValues';

const tables = loadTestTables();

/** 특성만 있는 최소 저장: 프리셋 2 는 특성 1 (레벨 20) · 특성 2001 (레벨 0), 프리셋 3 은 특성 2006 (레벨 1) */
const save = {
  masteryDatas: {
    k: [2, 3],
    v: [
      { k: [1, 2001], v: [{ lv: 20 }, { lv: 0 }] },
      { k: [2006], v: [{ lv: 1 }] },
    ],
  },
} as unknown as ReinforceSave;

describe('저장 데이터 → 특성 칸', () => {
  it('쓰는 프리셋의 레벨은 그대로, 레벨 없는 특성은 칸을 비운다 (전에 불러온 값이 남지 않게)', () => {
    const { values } = reinforceValues(save, 2, tables);
    expect(values.mastery_1).toBe('20');
    expect(values.mastery_2001).toBe('');
    // 다른 프리셋에만 있는 특성도 비운다
    expect(values.mastery_2006).toBe('');
  });
});
