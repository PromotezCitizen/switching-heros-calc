import { describe, expect, it } from 'vitest';
import i18n from './index';

describe('히어로 성별 표시', () => {
  it('Character 표 gender 1 = 남, 2 = 여 (앱 코드 확인, claude-docs/react-port/hero-gender.md)', () => {
    expect(i18n.t('calc.hero.gender', { gender: '1' })).toBe('남');
    expect(i18n.t('calc.hero.gender', { gender: '2' })).toBe('여');
  });
});
