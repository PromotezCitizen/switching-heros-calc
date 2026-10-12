const PERCENT_SIGN = '%';

/**
 * 입력 칸 안내 글자("예: 57.79B%")가 %로 끝나면 칸 안에서는 %를 빼고,
 * 칸 오른쪽에 % 를 고정 표시한다 (사용자는 숫자와 단위 글자만 친다. 읽을 때는 % 가 있어도 없어도 같다)
 */
export function splitPercentExample(example: string | undefined): { placeholder?: string; suffix?: string } {
  if (example === undefined) return {};
  if (!example.trim().endsWith(PERCENT_SIGN)) return { placeholder: example };
  return { placeholder: example.trim().slice(0, -PERCENT_SIGN.length), suffix: PERCENT_SIGN };
}
