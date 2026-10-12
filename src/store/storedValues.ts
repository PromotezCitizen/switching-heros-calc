/** 저장소 값(글)을 숫자·참거짓으로 읽는 공통 함수. 값이 없거나 숫자가 아니면 기본값 */
export function readNumber(values: Record<string, string>, key: string, fallback = 0): number {
  const stored = values[key];
  const parsed = stored === undefined || stored === '' ? NaN : Number(stored);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function readFlag(values: Record<string, string>, key: string): boolean {
  return values[key] === 'true';
}
