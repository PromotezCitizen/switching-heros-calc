import { useState } from 'react';
import { useCalcStore } from '../store/useCalcStore';
import { calcValuesOf } from './storeKeys';
import type { CalcValues } from './types';

/** 읽은 칸 값들을 한 글로 이어 붙일 때 쓰는 구분 글자 (칸 값에 나올 일이 없는 글자) */
const VALUE_SEPARATOR = '\u0000';

let cachedStoreValues: Record<string, string> | null = null;
let cachedCalcValues: CalcValues = {};

/** 저장소 값 → 계산식 확인기 칸 값. 저장소가 바뀔 때 한 번만 만들고 모든 탭이 같이 쓴다 */
export function sharedCalcValues(storeValues: Record<string, string>): CalcValues {
  if (storeValues !== cachedStoreValues) {
    cachedStoreValues = storeValues;
    cachedCalcValues = calcValuesOf(storeValues);
  }
  return cachedCalcValues;
}

/**
 * 여러 칸 값을 글 하나로 묶는다 (빈 칸 = ''). 패널이 줄·카드 단위 memo 컴포넌트에 칸 값을 넘길 때 쓴다:
 * 글이 같으면 memo 가 같은 props 로 보고 그 줄을 다시 그리지 않는다
 */
export function joinFieldValues(values: CalcValues, fieldIds: readonly string[]): string {
  return fieldIds.map((fieldId) => values[fieldId] ?? '').join(VALUE_SEPARATOR);
}

/** joinFieldValues 로 묶은 글 → 칸 값 (같은 칸 이름 순서로). 빈 칸은 '' 로 들어간다 */
export function splitFieldValues(joined: string, fieldIds: readonly string[]): CalcValues {
  const texts = joined.split(VALUE_SEPARATOR);
  return Object.fromEntries(fieldIds.map((fieldId, index) => [fieldId, texts[index] ?? '']));
}

interface ReadTracker {
  readKeys: Set<string>;
  readsAllKeys: boolean;
  /** 탭을 마지막으로 그릴 때의 칸 값. 패널에 넘기는 Proxy 는 늘 이 값을 읽는다 */
  snapshot: CalcValues;
  /** 패널에 넘기는 칸 값 (탭이 살아 있는 동안 같은 객체) */
  trackedValues: CalcValues;
}

function createTracker(): ReadTracker {
  const tracker: ReadTracker = {
    readKeys: new Set(),
    readsAllKeys: false,
    snapshot: {},
    trackedValues: {},
  };
  tracker.trackedValues = new Proxy<CalcValues>(
    {},
    {
      get(_target, key) {
        if (typeof key === 'string') tracker.readKeys.add(key);
        return Reflect.get(tracker.snapshot, key);
      },
      has(_target, key) {
        if (typeof key === 'string') tracker.readKeys.add(key);
        return Reflect.has(tracker.snapshot, key);
      },
      ownKeys() {
        tracker.readsAllKeys = true;
        return Reflect.ownKeys(tracker.snapshot);
      },
      getOwnPropertyDescriptor(_target, key) {
        const descriptor = Reflect.getOwnPropertyDescriptor(tracker.snapshot, key);
        // 빈 대상 객체에 없는 칸을 있다고 알려야 하므로 고칠 수 있는 칸으로 알린다 (Proxy 규칙)
        return descriptor ? { ...descriptor, configurable: true } : undefined;
      },
    },
  );
  return tracker;
}

/**
 * 탭이 실제로 읽은 칸만 구독한다: 패널·계산이 읽은 칸 이름을 모아 두고, 그 칸 값이 바뀔 때만 다시 그린다.
 * 다른 탭 칸을 읽어도 (특성 ← 펫 장착 등) 읽은 칸이면 같이 구독된다.
 * 칸 이름 목록 전체를 훑으면 (Object.keys 등) 어떤 칸이 필요한지 알 수 없으므로 모든 칸을 구독한다.
 *
 * 돌려주는 객체는 탭이 살아 있는 동안 늘 같은 객체이고, 읽을 때마다 탭을 마지막으로 그린 때의 값을 돌려준다.
 * 다시 그릴 때마다 새 객체를 넘기면 React 개발판이 다시 그린 컴포넌트의 이전·새 props 를 `for...in` 으로 비교하면서
 * 칸 이름 목록을 훑어 (ownKeys) 모든 칸이 구독되어 버린다. 같은 객체면 props 가 같다고 보고 안을 훑지 않는다
 */
export function useTrackedCalcValues(): CalcValues {
  const [tracker] = useState(createTracker);
  useCalcStore((state) => {
    const values = sharedCalcValues(state.values);
    if (tracker.readsAllKeys) return values;
    return [...tracker.readKeys].map((key) => values[key] ?? '').join(VALUE_SEPARATOR);
  });
  tracker.snapshot = sharedCalcValues(useCalcStore.getState().values);
  return tracker.trackedValues;
}
