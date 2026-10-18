/**
 * 입력값 파일로 저장 · 불러오기: 계산 칸 · 공통 입력 저장소 값 전체를 JSON 파일 하나로.
 * 다른 브라우저 · 기기로 옮기거나 백업을 되살리는 용도 (화면 상태 저장소는 넣지 않음).
 * 파일 버전 = 데이터를 읽어 온 게임 앱 버전 (폰에서 채운 적이 없으면 빈 글).
 */
import { CONSTS } from '@/CONSTS';

const { FILE_KIND, FILE_NAME_PREFIX, FILE_EXTENSION, GAME_VERSION_KEY } = CONSTS.load;

export interface InputBackup {
  /** 이 계산기가 만든 파일인지 가리는 표시 */
  kind: typeof FILE_KIND;
  /** 게임 앱 버전 (예: "5.60"). 모르면 빈 글 */
  version: string;
  /** 저장한 시각 (ISO) */
  exportedAt: string;
  values: Record<string, string>;
}

export function createBackup(values: Record<string, string>, now: Date = new Date()): InputBackup {
  return { kind: FILE_KIND, version: values[GAME_VERSION_KEY] ?? '', exportedAt: now.toISOString(), values: { ...values } };
}

/** 내려받을 파일 이름: <앞부분>-YYYYMMDD-HHmm.json (내 기기 시각) */
export function backupFileName(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  return `${FILE_NAME_PREFIX}-${date}-${pad(now.getHours())}${pad(now.getMinutes())}${FILE_EXTENSION}`;
}

export type ParsedBackup = { ok: true; backup: InputBackup } | { ok: false; reason: 'notJson' | 'notBackup' };

/** 파일 글 → 백업. 이 계산기가 만든 형식이 아니면 이유와 함께 실패 (값은 글만 받는다) */
export function parseBackup(text: string): ParsedBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'notJson' };
  }
  if (!parsed || typeof parsed !== 'object') return { ok: false, reason: 'notBackup' };
  const candidate = parsed as Partial<InputBackup>;
  if (candidate.kind !== FILE_KIND || typeof candidate.version !== 'string' || !candidate.values || typeof candidate.values !== 'object') {
    return { ok: false, reason: 'notBackup' };
  }
  const values = Object.fromEntries(Object.entries(candidate.values).filter(([, value]) => typeof value === 'string')) as Record<string, string>;
  return { ok: true, backup: { kind: FILE_KIND, version: candidate.version, exportedAt: String(candidate.exportedAt ?? ''), values } };
}

/** 브라우저에서 파일로 내려받게 한다 */
export function downloadBackup(backup: InputBackup, fileName: string): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
