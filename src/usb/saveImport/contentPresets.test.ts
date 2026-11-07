import { describe, expect, it } from 'vitest';
import { presetDiff, targetPresetKey, valuesForTarget } from '@/usb/saveImport/contentPresets';

describe('콘텐츠별 프리셋', () => {
  const values = {
    charName: '티르',
    mastery_1: '20',
    contentPresets: JSON.stringify({ presetId: 2, bossId: 3, dungeonId1: 6, dungeonId11: 5 }),
    presetOverrides: JSON.stringify({ 6: { mastery_1: '0', mastery_2: '5' }, 3: { charName: '에이카' } }),
  };

  it('대상 → 프리셋: 각성 = dungeonId1, 스테이지 보스 = bossId, 스테이지는 현재 그대로 (null)', () => {
    expect(targetPresetKey(values, 'awaken')).toBe(6);
    expect(targetPresetKey(values, 'stageBoss')).toBe(3);
    expect(targetPresetKey(values, 'stage')).toBeNull();
  });

  it('대상 프리셋의 다른 칸을 덮는다. 다른 칸이 없는 프리셋 (악몽 5) · 정보 없는 대상은 그대로', () => {
    expect(valuesForTarget(values, 'awaken')).toMatchObject({ charName: '티르', mastery_1: '0', mastery_2: '5' });
    expect(valuesForTarget(values, 'stageBoss').charName).toBe('에이카');
    expect(valuesForTarget(values, 'nightmare')).toBe(values);
    expect(valuesForTarget({ charName: '티르' }, 'awaken')).toEqual({ charName: '티르' });
  });

  it('다른 칸만: 값이 바뀐 칸, 다른 프리셋에만 있는 칸, 현재에만 있는 칸 (빈칸으로)', () => {
    expect(presetDiff({ a: '1', b: '2', c: '3' }, { a: '1', b: '9', d: '4' })).toEqual({ b: '9', c: '', d: '4' });
  });
});
