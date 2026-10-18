import { describe, expect, it } from 'vitest';
import { backupFileName, createBackup, parseBackup } from '@/load/inputBackup';

const FIXED_TIME = new Date(2026, 9, 18, 14, 5);

describe('입력값 파일로 저장 · 불러오기', () => {
  it('저장한 파일을 다시 읽으면 같은 값, 파일 버전 = 기록된 게임 버전', () => {
    const values = { 'calc.charName': '에이카', 'account.vipLevel': '12', 'meta.gameVersion': '5.60' };
    const parsed = parseBackup(JSON.stringify(createBackup(values, FIXED_TIME)));
    expect(parsed).toEqual({
      ok: true,
      backup: { kind: 'switching-heroes-calc-inputs', version: '5.60', exportedAt: FIXED_TIME.toISOString(), values },
    });
  });

  it('폰에서 채운 적이 없으면 파일 버전은 빈 글', () => {
    expect(createBackup({ 'calc.charName': '린' }, FIXED_TIME).version).toBe('');
  });

  it('JSON 이 아니거나 이 계산기 파일이 아니면 실패, 글이 아닌 값은 버림', () => {
    expect(parseBackup('{')).toEqual({ ok: false, reason: 'notJson' });
    expect(parseBackup(JSON.stringify({ values: {} }))).toEqual({ ok: false, reason: 'notBackup' });
    const mixed = parseBackup(JSON.stringify({ kind: 'switching-heroes-calc-inputs', version: '0.0.0', values: { a: '1', b: 2 } }));
    expect(mixed.ok && mixed.backup.values).toEqual({ a: '1' });
  });

  it('파일 이름 = 앞부분-날짜-시각.json', () => {
    expect(backupFileName(FIXED_TIME)).toBe('switching-heroes-calc-20261018-1405.json');
  });
});
