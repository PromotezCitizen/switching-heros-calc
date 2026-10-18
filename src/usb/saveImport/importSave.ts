/**
 * 저장 파일 여러 개 → 입력 칸 값. 파일 사이에 쓰는 값 (쓰는 프리셋, 1슬롯 히어로, 받은 미션 등) 을 여기서 꺼내 넘긴다.
 * Default 는 pickDefault 로 쓰는 값만 남긴 뒤 넘긴다 (식별 정보 · 결제 기록 · 우편은 읽지 않음).
 */
import { CONSTS } from '@/CONSTS';
import { ACCOUNT_KEYS } from '@/account/accountKeys';
import type { StatTables } from '@/data/statTables';
import { charValues, type CharSave } from '@/usb/saveImport/charValues';
import { collectionValues, type AlchemySave, type CollectionProgress } from '@/usb/saveImport/collectionValues';
import { equipValues, type EquipSave } from '@/usb/saveImport/equipValues';
import { reinforceValues, type ReinforceSave } from '@/usb/saveImport/reinforceValues';
import { relicCardValues, type CardSave, type DungeonProgress, type RelicSave } from '@/usb/saveImport/relicCardValues';
import { readDictionary, type SaveDictionary, type SaveImportResult } from '@/usb/saveImport/saveDictionary';
import { skillRuneValues, type RuneSave, type SkillSave } from '@/usb/saveImport/skillRuneValues';

const { ADS_REMOVE_ITEM, ATTACK_BUFF_ITEM } = CONSTS.usb;
const { GAME_VERSION_KEY, GAME_VERSION_DECIMALS } = CONSTS.load;
/** 없는 값을 글로 바꾼 흔적 */
const UNREADABLE_TEXT = /undefined|NaN/;

/** Default 원본에서 읽는 부분 (이 키들만 꺼낸다) */
interface DefaultRaw {
  presetData: { presetId: number };
  contentMissionData: { _receivedIds: number[] };
  adsBuffData: { lv: number };
  vipLv: number;
  /** 저장 시각 "YYYY-MM-DD HH:MM:SS" */
  st: string;
  _newNotInvenDic: SaveDictionary<string, { value: number; exponent: number }>;
  buffItemDic: SaveDictionary<string, string>;
  /** 저장 형식 layoutVer 1 부터 다른 파일에서 Default 로 옮겨 온 묶음 (안의 구조는 그대로) */
  diaryData?: CharSave['diaryData'];
  heroMineData?: CharSave['heroMineData'];
  trDatas?: ReinforceSave['trDatas'];
  dispatchProgress?: { lv: number };
  /** 게임 앱 버전 (스토어 버전 5.50 → 5.5, float 이라 5.599999… 처럼 저장됨) */
  _version?: number;
}

/** Default 에서 쓰는 값만 남긴 것 (저장 파일에 없으면 undefined) */
export interface DefaultPicked {
  /** 게임 앱 버전 글 (예: "5.60") */
  gameVersion?: string;
  presetKey?: number;
  receivedMissionIds?: number[];
  fairyLevel?: number;
  vipLevel?: number;
  adsRemoved?: boolean;
  /** 공격력 이벤트 버프가 저장 시각에 켜져 있었나 */
  attackBuffOn?: boolean;
  /** 새 저장 형식에서 Default 로 옮겨 온 묶음 (옛 형식이면 undefined, 그때는 원래 파일에서 읽음) */
  diaryData?: CharSave['diaryData'];
  heroMineData?: CharSave['heroMineData'];
  trDatas?: ReinforceSave['trDatas'];
  dispatchLevel?: number;
}

/** 옛 형식에서만 있던 키는 없을 수 있다 (새 형식은 Default 로 옮김) */
type MovedFromChar = 'diaryData' | 'heroMineData';

export interface SaveFiles {
  Char: Omit<CharSave, MovedFromChar> & Partial<Pick<CharSave, MovedFromChar>>;
  Equip: EquipSave;
  Reinforce: Omit<ReinforceSave, 'trDatas'> & Partial<Pick<ReinforceSave, 'trDatas'>>;
  Relic: RelicSave;
  Card: CardSave;
  Skill: SkillSave;
  Dispatch: RuneSave & { lv?: number };
  Progress: DungeonProgress & CollectionProgress;
  Alchemy: AlchemySave;
  Default: DefaultPicked;
}

/** 읽는 저장 파일 종류 (파일 이름 끝 _<종류>.json) */
export const SAVE_FILE_KINDS = [
  'Char',
  'Equip',
  'Reinforce',
  'Relic',
  'Card',
  'Skill',
  'Dispatch',
  'Progress',
  'Alchemy',
  'Default',
] as const satisfies readonly (keyof SaveFiles)[];

/**
 * 파일마다 변환이 읽는 최상위 키. 게임 업데이트로 키가 빠지거나 옮겨지면 missingSaveKeys 가 알려 준다
 * (빠진 키를 쓰는 항목만 건너뛰고 나머지는 채운다)
 */
export const SAVE_TOP_KEYS: Record<SaveFileKind, readonly string[]> = {
  Char: ['_presetDic', 'charList', 'affinityExpDic', '_libraryData', '_cosDic', 'iconIdList', 'petRegionData'],
  Equip: ['psCharWeaponDic', 'eqWeaponDic', 'petDataDic', 'equipPetDataDic', 'petOptionDic', 'weaponLinkData', 'psWeaponOptionDic', 'psJobWeaponDic'],
  Reinforce: ['awakenDatas', 'masteryDatas'],
  Relic: ['relicData'],
  Card: ['cardDic'],
  Skill: ['psSkillDic', 'eqPresetSkillDic', 'psSkillOptionDic'],
  Dispatch: ['attributeData'],
  Progress: ['dungeonDataDic', 'collectionDic', 'titleData'],
  Alchemy: ['equipItemDic', 'slotData'],
  Default: ['presetData', 'contentMissionData', 'adsBuffData', 'vipLv', 'st', '_newNotInvenDic', 'buffItemDic'],
};
export type SaveFileKind = (typeof SAVE_FILE_KINDS)[number];

/** 저장 형식에 따라 위치가 다른 키: 새 위치 (Default) 또는 옛 위치 중 한 곳에 있으면 된다 */
export const MOVED_SAVE_KEYS: readonly { newKey: string; oldKind: SaveFileKind; oldKey: string }[] = [
  { newKey: 'diaryData', oldKind: 'Char', oldKey: 'diaryData' },
  { newKey: 'heroMineData', oldKind: 'Char', oldKey: 'heroMineData' },
  { newKey: 'trDatas', oldKind: 'Reinforce', oldKey: 'trDatas' },
  { newKey: 'dispatchProgress', oldKind: 'Dispatch', oldKey: 'lv' },
];

/** 읽은 파일들의 최상위 키로 빠진 키를 찾는다 ("Char.diaryData" 형태, 옮겨진 키는 두 곳 모두 없을 때만) */
export function missingSaveKeys(keysByKind: Partial<Record<SaveFileKind, readonly string[]>>): string[] {
  const has = (kind: SaveFileKind, key: string) => keysByKind[kind]?.includes(key) ?? false;
  const missing = SAVE_FILE_KINDS.flatMap((kind) => SAVE_TOP_KEYS[kind].filter((key) => !has(kind, key)).map((key) => `${kind}.${key}`));
  for (const moved of MOVED_SAVE_KEYS) {
    if (!has('Default', moved.newKey) && !has(moved.oldKind, moved.oldKey)) {
      missing.push(`Default.${moved.newKey} / ${moved.oldKind}.${moved.oldKey}`);
    }
  }
  return missing;
}

/** 파싱한 JSON 의 최상위 키 */
export function topKeys(parsed: unknown): string[] {
  return parsed && typeof parsed === 'object' ? Object.keys(parsed) : [];
}

/** 꺼내다 키가 없으면 undefined (Default 구조가 바뀌어도 나머지 값은 꺼낸다) */
function attempt<Value>(read: () => Value): Value | undefined {
  try {
    return read();
  } catch {
    return undefined;
  }
}

/** Default 원본에서 쓰는 값만 꺼낸다 (원본은 이 함수 밖으로 넘기지 않음) */
export function pickDefault(raw: DefaultRaw): DefaultPicked {
  const adsRemove = attempt(() => readDictionary(raw._newNotInvenDic).get(ADS_REMOVE_ITEM));
  const attackBuffEnd = attempt(() => readDictionary(raw.buffItemDic).get(ATTACK_BUFF_ITEM));
  return {
    gameVersion: typeof raw._version === 'number' ? raw._version.toFixed(GAME_VERSION_DECIMALS) : undefined,
    presetKey: attempt(() => raw.presetData.presetId),
    receivedMissionIds: attempt(() => [...raw.contentMissionData._receivedIds]),
    fairyLevel: attempt(() => raw.adsBuffData.lv),
    vipLevel: raw.vipLv,
    adsRemoved: attempt(() => readDictionary(raw._newNotInvenDic)) === undefined ? undefined : (adsRemove?.value ?? 0) > 0,
    // 두 시각 모두 "YYYY-MM-DD HH:MM:SS" 라 글 순서 = 시간 순서
    attackBuffOn: raw.st === undefined ? undefined : (attackBuffEnd ?? '') > raw.st,
    diaryData: raw.diaryData,
    heroMineData: raw.heroMineData,
    trDatas: raw.trDatas,
    dispatchLevel: attempt(() => raw.dispatchProgress?.lv),
  };
}

export interface SaveImport extends SaveImportResult {
  /** 저장소 칸 이름 그대로 넣는 값: 공통 입력 (account.*) 과 게임 버전 (meta.gameVersion) */
  accountValues: Record<string, string>;
}

/** 값이 있을 때만 칸에 넣는다 (없으면 그 칸은 지금 값 그대로) */
function putDefined(target: Record<string, string>, key: string, value: number | boolean | undefined): void {
  if (value !== undefined) target[key] = String(value);
}

export function importSave(files: SaveFiles, tables: StatTables): SaveImport {
  const { presetKey = -1, receivedMissionIds = [] } = files.Default;
  const slot1HeroId = attempt(() => readDictionary(files.Char._presetDic).get(presetKey)?.slot1) ?? -1;
  // 새 저장 형식은 일기장 · 광산 · 훈련 · 파견을 Default 로 옮겼다: 새 위치를 먼저, 없으면 옛 위치
  const char = {
    ...files.Char,
    diaryData: files.Default.diaryData ?? files.Char.diaryData,
    heroMineData: files.Default.heroMineData ?? files.Char.heroMineData,
  } as CharSave;
  const reinforce = { ...files.Reinforce, trDatas: files.Default.trDatas ?? files.Reinforce.trDatas } as ReinforceSave;
  const dispatchLevel = files.Default.dispatchLevel ?? files.Dispatch.lv;
  const parts = [
    charValues(char, presetKey, tables),
    equipValues(files.Equip, { presetKey, slot1HeroId, receivedMissionIds }, tables),
    reinforceValues(reinforce, presetKey, tables),
    relicCardValues(files.Relic, files.Card, dispatchLevel, files.Progress, presetKey, tables),
    skillRuneValues(files.Skill, files.Dispatch, presetKey, slot1HeroId),
    collectionValues(files.Progress, files.Alchemy, tables),
  ];
  const notes = parts.flatMap((part) => part.notes);
  // 저장 구조가 바뀌어 값을 못 읽은 칸 (undefined · NaN 이 글이 된 것) 은 채우지 않고 기록으로 돌린다
  const values: Record<string, string> = {};
  const unreadable: string[] = [];
  for (const [key, value] of Object.entries(Object.assign({}, ...parts.map((part) => part.values)) as Record<string, string>)) {
    if (UNREADABLE_TEXT.test(value)) unreadable.push(key);
    else values[key] = value;
  }
  if (unreadable.length > 0) notes.push(`읽지 못한 항목: ${unreadable.join(', ')}`);
  // 요정 유대 레벨 · 요정의 축복 (광고 제거면 상시), 공격력 이벤트 버프
  putDefined(values, 'fairyBondLevel', files.Default.fairyLevel);
  putDefined(values, 'fairyBlessingOn', files.Default.adsRemoved);
  putDefined(values, 'attackEventBuff', files.Default.attackBuffOn);
  const accountValues: Record<string, string> = {};
  putDefined(accountValues, ACCOUNT_KEYS.vipLevel, files.Default.vipLevel);
  putDefined(accountValues, ACCOUNT_KEYS.fairyLevel, files.Default.fairyLevel);
  putDefined(accountValues, ACCOUNT_KEYS.adRemoved, files.Default.adsRemoved);
  // 데이터를 읽어 온 게임 버전 (불러오기 창 표시 · 파일로 저장할 때 버전)
  if (files.Default.gameVersion) accountValues[GAME_VERSION_KEY] = files.Default.gameVersion;
  return { values, accountValues, notes };
}
