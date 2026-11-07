import { describe, expect, it } from 'vitest';
import { isUnreadableGameNumber } from '@/components/StoreFields';

describe('게임 큰 수 입력칸의 오류 판정', () => {
  it('비어 있거나 읽을 수 있는 값은 오류가 아니다', () => {
    expect(isUnreadableGameNumber(undefined)).toBe(false);
    expect(isUnreadableGameNumber('')).toBe(false);
    expect(isUnreadableGameNumber('  ')).toBe(false);
    expect(isUnreadableGameNumber('467.959939V')).toBe(false);
    expect(isUnreadableGameNumber('5.14N%')).toBe(false);
    expect(isUnreadableGameNumber('35.00')).toBe(false);
  });

  it('0 은 "값 없음" 이라 오류가 아니다 (불러오기가 값이 없는 옵션에 0.00 을 적는다)', () => {
    expect(isUnreadableGameNumber('0')).toBe(false);
    expect(isUnreadableGameNumber('0.00')).toBe(false);
    expect(isUnreadableGameNumber('0%')).toBe(false);
    expect(isUnreadableGameNumber(' 0.00 ')).toBe(false);
  });

  it('읽을 수 없는 글은 오류다', () => {
    expect(isUnreadableGameNumber('abc')).toBe(true);
    expect(isUnreadableGameNumber('5.14N%%%')).toBe(true);
    expect(isUnreadableGameNumber('-')).toBe(true);
  });
});
