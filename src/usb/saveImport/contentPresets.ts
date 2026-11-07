/**
 * 콘텐츠별 프리셋: 게임은 콘텐츠마다 다른 프리셋을 쓴다 (저장 Default.presetData).
 * 예: presetId (지금) 2 "스테이지", bossId 3 "보스전", dungeonId1 6 "각던", dungeonId11 5 "악몽던전", guildRaidId 3, guildRaidGlobalId 1, pveId 4
 * (claude-docs/react-port/hp-gap-2026-11-01.md 끝 절. dungeonId1 = 각성 · dungeonId11 = 악몽은 프리셋 이름으로 맞춤, dungeonId2~10 은 미확인).
 * 저장 가져오기는 현재 프리셋으로 칸을 채우고, 다른 프리셋은 "현재와 다른 칸" 만 PRESET_OVERRIDES_FIELD 에 JSON 으로 둔다.
 * 최적화 대상을 고르면 그 대상의 프리셋 칸을 덮어 계산한다 (valuesForTarget)
 */
import type { CalcValues } from '@/calc/types';

/** 저장 presetData 에서 읽는 콘텐츠 프리셋 칸 */
export const CONTENT_PRESET_KEYS = ['presetId', 'stageId', 'bossId', 'guildRaidId', 'guildRaidGlobalId', 'pveId', ...Array.from({ length: 11 }, (_, index) => `dungeonId${index + 1}`)] as const;
/** 입력 칸: 콘텐츠 프리셋 번호 (JSON {칸: 프리셋}) · 프리셋별로 현재와 다른 칸 (JSON {프리셋: {칸: 값}}) */
export const CONTENT_PRESETS_FIELD = 'contentPresets';
export const PRESET_OVERRIDES_FIELD = 'presetOverrides';

/**
 * 최적화 대상 → 그 콘텐츠의 프리셋 칸. 없는 대상 (스테이지 · 속성 던전) 은 현재 프리셋 그대로
 * (스테이지는 저장 stageId 의 뜻을 확인하지 못했고, 속성 던전은 dungeonId2~10 중 어느 칸인지 모름)
 */
export const TARGET_PRESET_FIELD: Record<string, string> = {
  stageBoss: 'bossId',
  awaken: 'dungeonId1',
  nightmare: 'dungeonId11',
  guildRaid: 'guildRaidId',
  globalRaidNormal: 'guildRaidGlobalId',
  globalRaidBoss: 'guildRaidGlobalId',
  globalRaidHero: 'guildRaidGlobalId',
  pvp: 'pveId',
};

function parseObject<Value>(text: string | undefined): Record<string, Value> {
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, Value>) : {};
  } catch {
    return {};
  }
}

/** 이 대상이 쓰는 프리셋 번호 (모르면 null = 현재 프리셋) */
export function targetPresetKey(values: CalcValues, target: string): number | null {
  const field = TARGET_PRESET_FIELD[target];
  const preset = field ? parseObject<number>(values[CONTENT_PRESETS_FIELD])[field] : undefined;
  return typeof preset === 'number' ? preset : null;
}

/** 대상의 프리셋 칸을 덮은 입력값. 대상 프리셋이 현재 프리셋이거나 정보가 없으면 그대로 */
export function valuesForTarget(values: CalcValues, target: string): CalcValues {
  const preset = targetPresetKey(values, target);
  if (preset === null) return values;
  const overrides = parseObject<Record<string, string>>(values[PRESET_OVERRIDES_FIELD])[String(preset)];
  return overrides ? { ...values, ...overrides } : values;
}

/** 다른 프리셋 값에서 현재 값과 다른 칸만 (현재에만 있는 칸은 빈칸으로) */
export function presetDiff(current: Record<string, string>, other: Record<string, string>): Record<string, string> {
  const diff: Record<string, string> = {};
  for (const key of new Set([...Object.keys(current), ...Object.keys(other)])) {
    if (key === CONTENT_PRESETS_FIELD || key === PRESET_OVERRIDES_FIELD) continue;
    const next = other[key] ?? '';
    if ((current[key] ?? '') !== next) diff[key] = next;
  }
  return diff;
}
