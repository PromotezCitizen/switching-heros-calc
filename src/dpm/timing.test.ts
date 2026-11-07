import { describe, expect, it } from 'vitest';
import '@/i18n';
import { ACCOUNT_KEYS } from '@/account/accountKeys';
import { dpmTiming } from '@/dpm/timing';
import { loadTestTables } from '@/test/loadTestTables';
import { importSave, pickDefault, type SaveFiles } from '@/usb/saveImport/importSave';
import saveSubset1018 from '@/usb/saveImport/saveSubset1018.json';

describe('10-18 계정 시간 주기 (실측: 평타 0.140게임초, 버프 4.94초, 전용 1.08초)', () => {
  const tables = loadTestTables();
  const raw = saveSubset1018 as unknown as Omit<SaveFiles, 'Default'> & { Default: Parameters<typeof pickDefault>[0] };
  const imported = importSave({ ...raw, Default: pickDefault(raw.Default) }, tables);
  const values = { ...imported.values, [ACCOUNT_KEYS.vipLevel]: imported.accountValues[ACCOUNT_KEYS.vipLevel] };
  const timing = dpmTiming(values, tables);

  it('평타 1번 0.14게임초, 게임 속도 1.3', () => {
    expect(timing.normalAttackGameSeconds).toBeCloseTo(0.14, 3);
    expect(timing.gameSpeed).toBeCloseTo(1.3, 10);
  });
  it('장착 버프 스킬 켜짐 주기 (쿨타임) 실제 약 4.92초 (4.94 = 쿨타임 감소 + 1.3배, 사용자 확인 2026-11-05)', () => {
    expect(timing.buffSkills.length).toBeGreaterThan(0);
    for (const skill of timing.buffSkills) expect((skill.cooldownGameSeconds ?? 0) / timing.gameSpeed).toBeCloseTo(4.94, 1);
  });
  it('버프 스킬 발동 간격은 켜짐 주기보다 짧다: 켜진 동안 평타 (0.14게임초) 마다 천분율 확률로 발동 (job-skills-buff-2026-11-05.md 1절)', () => {
    for (const skill of timing.buffSkills) expect(skill.gameSeconds).toBeLessThan(skill.cooldownGameSeconds ?? 0);
  });
  it('전용 스킬 12217, 실제 약 1.077초 (실측 1.08, ±1%)', () => {
    expect(timing.charSkill?.skillId).toBe('12217');
    expect(timing.charSkill?.realSeconds).toBeCloseTo(1.08, 1);
  });
});
