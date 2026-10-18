/** 불러오기 창: 게임 버전 · 입력값 파일로 저장 / 불러오기 */
export const LOAD_CONSTS = {
  /** 폰에서 채울 때 저장 데이터 (Default._version) 에서 읽은 게임 앱 버전을 넣어 두는 저장소 칸 */
  GAME_VERSION_KEY: 'meta.gameVersion',
  /** 게임 버전 표기 소수 자리 (스토어 버전 5.50 과 같게) */
  GAME_VERSION_DECIMALS: 2,
  /** 저장한 파일의 kind 값 (이 계산기 파일인지 가림) */
  FILE_KIND: 'switching-heroes-calc-inputs',
  FILE_NAME_PREFIX: 'switching-heroes-calc',
  FILE_EXTENSION: '.json',
  /** 파일 선택 창에서 고를 수 있는 형식 */
  FILE_ACCEPT: 'application/json,.json',
} as const;
