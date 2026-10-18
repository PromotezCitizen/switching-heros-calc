/** 저장 데이터 변환에서 같이 쓰는 형태 */

/** 저장 구조가 바뀌어 항목을 못 읽었을 때 보여 줄 말 */
const MISSING_DATA_TEXT = '게임 데이터에서 찾지 못했어요';

/** 게임 저장 사전: { k: [...], v: [...] } 또는 { m_Keys: [...], m_Values: [...] } */
export type SaveDictionary<Key, Value> = { k: Key[]; v: Value[] } | { m_Keys: Key[]; m_Values: Value[] };

export function readDictionary<Key, Value>(node: SaveDictionary<Key, Value>): Map<Key, Value> {
  const [keys, values] = 'k' in node ? [node.k, node.v] : [node.m_Keys, node.m_Values];
  return new Map(keys.map((key, index) => [key, values[index]]));
}

export interface SaveImportResult {
  /** 계산기 입력 칸 (칸 이름 → 글) */
  values: Record<string, string>;
  /** 표에서 못 찾은 항목 등 (채우지 못한 이유) */
  notes: string[];
}

/**
 * 변환 항목 하나를 실행한다. 저장 구조가 바뀌어 키가 없으면 (읽다가 오류) 그 항목만 건너뛰고 이유를 notes 에 남긴다.
 * 게임 업데이트로 한 항목이 깨져도 나머지 칸은 채우기 위함.
 */
export function runSection(notes: string[], name: string, convert: () => void): void {
  try {
    convert();
  } catch (error) {
    // 키가 없어 읽다 난 오류 (TypeError, 영어 문구) 는 사람이 읽을 말로, 직접 던진 오류는 그 글 그대로
    const reason = error instanceof TypeError || !(error instanceof Error) ? MISSING_DATA_TEXT : error.message;
    notes.push(`${name}: ${reason}`);
  }
}

/** 같은 키로 묶은 목록 */
export function groupBy<Item>(items: Item[], key: (item: Item) => string): Map<string, Item[]> {
  const groups = new Map<string, Item[]>();
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return groups;
}
