import { useEffect, useState } from 'react';

export type JsonLoadState<T> = { status: 'loading' } | { status: 'failed' } | { status: 'ready'; data: T };

/** 같은 파일을 여러 곳에서 불러도 한 번만 받는다 */
const requestCache = new Map<string, Promise<unknown>>();

function loadJson<T>(fileName: string): Promise<T> {
  let request = requestCache.get(fileName);
  if (!request) {
    request = fetch(`${import.meta.env.BASE_URL}data/${fileName}`).then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    });
    // 실패한 요청은 다음 시도에서 다시 받는다
    request.catch(() => requestCache.delete(fileName));
    requestCache.set(fileName, request);
  }
  return request as Promise<T>;
}

/** public/data/<fileName> 의 JSON 을 한 번 불러온다 (표 내보내기 스크립트가 만든 파일) */
export function useJsonData<T>(fileName: string): JsonLoadState<T> {
  const [state, setState] = useState<JsonLoadState<T>>({ status: 'loading' });
  useEffect(() => {
    let cancelled = false;
    loadJson<T>(fileName)
      .then((data) => !cancelled && setState({ status: 'ready', data }))
      .catch(() => !cancelled && setState({ status: 'failed' }));
    return () => {
      cancelled = true;
    };
  }, [fileName]);
  return state;
}

/** 여러 JSON 파일을 한꺼번에 불러온다 (이름 → 내용). 하나라도 실패하면 failed */
export function useJsonFiles<T>(fileNames: readonly string[]): JsonLoadState<Record<string, T>> {
  const [state, setState] = useState<JsonLoadState<Record<string, T>>>({ status: 'loading' });
  const key = fileNames.join('|');
  useEffect(() => {
    let cancelled = false;
    Promise.all(fileNames.map((fileName) => loadJson<T>(fileName)))
      .then((loaded) => {
        if (cancelled) return;
        setState({ status: 'ready', data: Object.fromEntries(fileNames.map((name, index) => [name, loaded[index]])) });
      })
      .catch(() => !cancelled && setState({ status: 'failed' }));
    return () => {
      cancelled = true;
    };
  }, [key]);
  return state;
}
