import { describe, expect, it } from 'vitest';
import '@/i18n';
import monsterHp from '../../public/data/monsterHp.json';
import { ACCOUNT_KEYS } from '@/account/accountKeys';
import { CONSTS } from '@/CONSTS';
import type { MonsterHpData } from '@/dpm/hpCondition';
import { allTargetDamages, fightSeconds, type DamageInputs } from '@/dpm/targetDamage';
import { loadTestTables } from '@/test/loadTestTables';
import { importSave, pickDefault, type SaveFiles } from '@/usb/saveImport/importSave';
import saveSubset1018 from '@/usb/saveImport/saveSubset1018.json';

const tables = loadTestTables();
const raw = saveSubset1018 as unknown as Omit<SaveFiles, 'Default'> & { Default: Parameters<typeof pickDefault>[0] };
const imported = importSave({ ...raw, Default: pickDefault(raw.Default) }, tables);
const VALUES = { ...imported.values, [ACCOUNT_KEYS.vipLevel]: imported.accountValues[ACCOUNT_KEYS.vipLevel] };
const HERO_FLOOR = (monsterHp as MonsterHpData).attributeDungeon.kind.findIndex((kind) => kind === 3) + 1;
const INPUTS: DamageInputs = {
  targetsPerSkill: 3,
  orbShardHits: { stage: 2, stageBoss: 5, awaken: 5, attributeHero: 5 },
  targetStatusCount: {},
  stageFloor: 9827,
  attributeDungeonFloor: HERO_FLOOR,
  monsterHp: monsterHp as MonsterHpData,
};

describe('10-18 계정 대상 넷', () => {
  const results = allTargetDamages(VALUES, tables, INPUTS);

  it('누적 시간: 스테이지 없음, 스테이지 보스 35 + VIP 10 = 45, 각성 40, 속성 던전 60', () => {
    expect(fightSeconds(VALUES, tables, 'stage')).toBeNull();
    expect(fightSeconds(VALUES, tables, 'stageBoss')).toBe(45);
    expect(fightSeconds(VALUES, tables, 'awaken')).toBe(40);
    expect(fightSeconds(VALUES, tables, 'attributeHero')).toBe(60);
    expect(fightSeconds(VALUES, tables, 'nightmare')).toBe(55);
    expect(fightSeconds(VALUES, tables, 'pvp')).toBe(35);
    expect(fightSeconds(VALUES, tables, 'attributeNormal')).toBe(60);
    expect(fightSeconds(VALUES, tables, 'attributeBoss')).toBe(60);
    expect(fightSeconds(VALUES, tables, 'guildRaid')).toBe(40);
    for (const target of ['globalRaidNormal', 'globalRaidBoss', 'globalRaidHero'] as const) expect(fightSeconds(VALUES, tables, target)).toBe(40);
  });

  it('넷 다 값이 나온다 (평타 · 버프 4 · 액티브 화살 폭격 255 · 전용 12217). 화살 폭격은 이제 계산한다 (arrow-barrage-255.md)', () => {
    for (const result of Object.values(results)) {
      expect(isFinite(result.perMinuteLog), result.target).toBe(true);
      const kinds = result.parts.map((part) => `${part.kind}:${part.skillId ?? ''}`).sort();
      expect(kinds, result.target).toEqual(['active:255', 'buff:201', 'buff:202', 'buff:203', 'buff:204', 'char:12217', 'normal:'].sort());
      expect(result.missing, result.target).not.toContain('unsupportedSkill:255');
    }
    for (const target of ['stageBoss', 'awaken', 'attributeHero'] as const) {
      expect(isFinite(results[target].windowTotalLog!), target).toBe(true);
    }
  });

  it('스테이지 분당 합 = 부분 합', () => {
    const stage = results.stage;
    const sum = stage.parts.reduce((total, part) => total + Math.pow(10, part.perMinuteLog - stage.perMinuteLog), 0);
    expect(sum).toBeCloseTo(1, 9);
  });

  it('공격력 이벤트 버프를 켜면 넷 다 줄지 않는다', () => {
    const boosted = allTargetDamages({ ...VALUES, attackEventBuff: 'true' }, tables, INPUTS);
    const base = allTargetDamages({ ...VALUES, attackEventBuff: '' }, tables, INPUTS);
    for (const target of ['stage', 'stageBoss', 'awaken', 'attributeHero'] as const) {
      expect(boosted[target].perMinuteLog, target).toBeGreaterThanOrEqual(base[target].perMinuteLog - 1e-9);
    }
  });

  it('레이저 샷 화상 옵션 (2401) 은 한 방보다 수백 자릿수 작아 빠진 몫에 남기지 않는다 (skill-gaps-2026-11-05.md 3절), 속성 던전은 표 판 확인 못 함', () => {
    expect(results.stage.missing).not.toContain('burnOption:204');
    expect(results.attributeHero.missing).toContain('attributeDungeonTableVersion');
  });

  it('카드 전투 조건 (용암거미 R_15 의 주위 적 5마리 이하 줄) 은 대상별: 스테이지는 꺼지고, 각성 (적 1마리) 은 늘 켜진다. "적 수 5 이상" 칸은 대미지 계산에 영향 없음', () => {
    const { ENEMY_COUNT_FIELD } = CONSTS.summary;
    const gain = (enemyCountReached: boolean) => {
      const base = enemyCountReached ? { ...VALUES, [ENEMY_COUNT_FIELD]: 'true' } : VALUES;
      const without = allTargetDamages({ ...base, cardSlot1: '', cardSlotGrade1: '' }, tables, INPUTS);
      const withCard = allTargetDamages({ ...base, cardSlot1: '27', cardSlotGrade1: 'R_15' }, tables, INPUTS);
      return {
        stage: withCard.stage.perMinuteLog - without.stage.perMinuteLog,
        awaken: withCard.awaken.windowTotalLog! - without.awaken.windowTotalLog!,
        missing: withCard.stage.missing,
      };
    };
    const off = gain(false);
    const on = gain(true);
    // 용암거미 줄 중 스테이지에서 켜지는 것 (적 1마리 등) 만 남는다: 칸과 상관없이 같다
    expect(off.stage).toBeCloseTo(on.stage, 9);
    expect(off.awaken).toBeGreaterThan(off.stage + 0.5);
    expect(off.awaken).toBeCloseTo(on.awaken, 9);
    expect(off.awaken).toBeGreaterThan(0.5);
    // 읽는 곳이 생긴 조건 줄은 더 이상 빠진 몫이 아니다
    expect(off.missing.some((code) => code.startsWith('conditionStatsNotCounted:'))).toBe(false);
    // 대상이 12개로 늘어 allTargetDamages 네 번이 5초를 넘는다 (2026-11-02)
  }, 30000);

  it('상태이상 수는 입력이 없으면 계산한다: 스테이지는 3중첩 가정이라 입력 0 보다 효율이 높고 (무자비 켜짐), 빠진 몫에 추정이 나온다. 입력을 주면 그 값을 쓴다', () => {
    const derived = allTargetDamages(VALUES, tables, INPUTS);
    const none = allTargetDamages(VALUES, tables, { ...INPUTS, targetStatusCount: { stage: 0, stageBoss: 0, awaken: 0, attributeHero: 0 } });
    expect(derived.stage.perMinuteLog).toBeGreaterThan(none.stage.perMinuteLog);
    for (const target of ['stageBoss', 'awaken', 'attributeHero'] as const) {
      expect(derived[target].windowTotalLog!, target).toBeGreaterThanOrEqual(none[target].windowTotalLog! - 1e-9);
    }
    expect(derived.stage.missing).toContain('statusCountEstimated');
    expect(none.stage.missing).not.toContain('statusCountEstimated');
    const three = allTargetDamages(VALUES, tables, { ...INPUTS, targetStatusCount: { stage: 3 } });
    expect(three.stage.perMinuteLog).toBeCloseTo(derived.stage.perMinuteLog, 9);
  });

  it('히어로 없으면 값 없음', () => {
    expect(allTargetDamages({}, tables, INPUTS).stage.missing).toEqual(['noHero']);
  });
});
