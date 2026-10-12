/** 출처 글을 만드는 함수 (번역 키, 끼워 넣을 값) → 글. 탭 목록(index.ts)이 번역 함수를 넘겨 준다 */
export type SourceLabel = (translationKey: string, params?: Record<string, string | number>) => string;
