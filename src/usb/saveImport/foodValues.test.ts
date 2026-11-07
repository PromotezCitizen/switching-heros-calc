import { describe, expect, it } from 'vitest';
import { foodValues } from '@/usb/saveImport/foodValues';

/** 2026-10-31 저장 18:14 의 Dispatch 모양: 감자 구이 (16) · 빵 (19) · 토마토 샐러드 (22) 를 18:12 에 먹음 (경험치·골드·정수 음식, 대미지 음식 아님) */
const saved = (uses: { _itemType: number; _useDate: string }[], st = '2026-10-31 18:14:49') => ({
  st,
  myGuildData: { _foodUseList: uses.map((use) => ({ ...use, _useCnt: 1 })) },
});

describe('저장 데이터 → 일반 몬스터 피해 음식', () => {
  it('대미지와 상관없는 음식만 먹었으면 칸을 비운다', () => {
    const uses = [16, 19, 22].map((itemId, index) => ({ _itemType: itemId, _useDate: `2026-10-31 18:12:0${6 + index}` }));
    expect(foodValues(saved(uses)).values).toEqual({ normalMonsterFood: '' });
  });

  it('딸기 타르트 (27) 를 60분 안에 먹었으면 켠다, 60분이 지났으면 끈다', () => {
    expect(foodValues(saved([{ _itemType: 27, _useDate: '2026-10-31 17:30:00' }])).values.normalMonsterFood).toBe('strawberryTart');
    expect(foodValues(saved([{ _itemType: 27, _useDate: '2026-10-31 17:14:48' }])).values.normalMonsterFood).toBe('');
  });

  it('여러 개가 켜져 있으면 가장 센 것 하나', () => {
    const uses = [
      { _itemType: 25, _useDate: '2026-10-31 18:00:00' },
      { _itemType: 27, _useDate: '2026-10-31 18:05:00' },
      { _itemType: 26, _useDate: '2026-10-31 18:10:00' },
    ];
    expect(foodValues(saved(uses)).values.normalMonsterFood).toBe('strawberryTart');
  });

  it('기록이 없는 저장 (옛 형식) 은 아무 칸도 안 건드린다', () => {
    expect(foodValues({})).toEqual({ values: {}, notes: [] });
    expect(foodValues({ st: '2026-10-31 18:14:49' }).values).toEqual({});
  });
});
