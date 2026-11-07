/**
 * 작업자 전역 보정: 계산 코드가 화면 컴포넌트 모듈까지 끌어와 불러올 때 `window` 를 읽는다.
 * 작업자에는 `window` 가 없으므로 작업자 전역 자신을 `window` 로 둔다. 작업자에서 맨 먼저 불러와야 한다
 */
const scope = globalThis as { window?: unknown };
scope.window ??= globalThis;
