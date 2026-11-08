/** 폰 · 폴더 불러오기 기록: 언제 불러왔는지와 그때 나온 알림을 저장소에 남긴다 (화면 위 상태 줄이 읽는다) */
import { CONSTS } from '@/CONSTS';

const { IMPORTED_AT_KEY, IMPORT_NOTES_KEY } = CONSTS.load;

/** 불러온 값과 함께 저장할 기록 칸 */
export function importRecordValues(notes: readonly string[], now: Date = new Date()): Record<string, string> {
  return { [IMPORTED_AT_KEY]: now.toISOString(), [IMPORT_NOTES_KEY]: JSON.stringify(notes) };
}

/** 저장된 알림 목록 (없거나 읽을 수 없으면 빈 목록) */
export function readImportNotes(text: string | undefined): string[] {
  if (!text) return [];
  try {
    const parsed: unknown = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.filter((note): note is string => typeof note === 'string') : [];
  } catch {
    return [];
  }
}
