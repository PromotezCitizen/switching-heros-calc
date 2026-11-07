/**
 * 게임 저장 파일 (data_a_*_<종류>.json) 묶음 → 입력 칸 값. 휴대폰 USB 불러오기와 폴더 불러오기 (앱플레이어) 가 같이 쓴다.
 * 파일을 어디서 읽는지만 다르고 (read), 고르는 규칙 · 변환은 같다.
 */
import { CONSTS } from '@/CONSTS';
import { CALC_KEY_PREFIX } from '@/calc/storeKeys';
import type { StatTables } from '@/data/statTables';
import { importSave, missingSaveKeys, pickDefault, SAVE_FILE_KINDS, topKeys, type SaveFileKind, type SaveFiles } from '@/usb/saveImport/importSave';

const { SAVE_FILE_PATTERN } = CONSTS.usb;

/** 저장 파일 이름만 이름순으로 */
export function saveFileNames(names: string[]): string[] {
  return names.filter((name) => SAVE_FILE_PATTERN.test(name)).sort((left, right) => left.localeCompare(right));
}

/** 종류의 파일 이름 (이름순 첫 파일) */
export function saveFileFor(names: string[], kind: SaveFileKind): string | undefined {
  return names.find((name) => name.endsWith(`_${kind}.json`));
}

/** 없는 종류 */
export function missingSaveKinds(names: string[]): SaveFileKind[] {
  return SAVE_FILE_KINDS.filter((kind) => saveFileFor(names, kind) === undefined);
}

export interface SaveImportOutcome {
  /** 저장소에 넣을 값 (계산 칸은 앞부분을 붙인 키) */
  storeValues: Record<string, string>;
  /** 게임 업데이트로 찾지 못한 데이터 키 */
  missingKeys: string[];
  /** 채우지 못한 항목 */
  notes: string[];
  count: number;
}

/** 바이트 → JSON (원본은 이 함수 밖으로 넘기지 않는다) */
function parseJson(bytes: Uint8Array): unknown {
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** 종류마다 파일을 읽어 입력 칸 값으로. 없는 종류가 있으면 부르기 전에 missingSaveKinds 로 막는다 */
export async function importSaveFiles(names: string[], read: (name: string) => Promise<Uint8Array>, tables: StatTables): Promise<SaveImportOutcome> {
  const loaded: Record<string, unknown> = {};
  const keysByKind: Partial<Record<SaveFileKind, string[]>> = {};
  for (const kind of SAVE_FILE_KINDS) {
    const name = saveFileFor(names, kind);
    if (name === undefined) throw new Error('필요한 게임 저장 파일이 없어요');
    const parsed = parseJson(await read(name));
    keysByKind[kind] = topKeys(parsed);
    loaded[kind] = kind === 'Default' ? pickDefault(parsed as Parameters<typeof pickDefault>[0]) : parsed;
  }
  const result = importSave(loaded as unknown as SaveFiles, tables);
  return {
    storeValues: {
      ...Object.fromEntries(Object.entries(result.values).map(([key, value]) => [CALC_KEY_PREFIX + key, value])),
      ...result.accountValues,
    },
    missingKeys: missingSaveKeys(keysByKind),
    notes: result.notes,
    count: Object.keys(result.values).length + Object.keys(result.accountValues).length,
  };
}
