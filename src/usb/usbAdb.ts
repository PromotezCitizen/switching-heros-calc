/**
 * WebUSB 로 휴대폰에 ADB 연결하고 게임 저장 파일을 읽는다 (@yume-chan/adb 2.x).
 * 연결은 반드시 버튼 클릭 같은 사용자 동작 안에서 불러야 브라우저가 기기 선택 창을 띄운다.
 */
import { Adb, AdbDaemonTransport } from '@yume-chan/adb';
import AdbWebCredentialStore from '@yume-chan/adb-credential-web';
import { AdbDaemonWebUsbDeviceManager } from '@yume-chan/adb-daemon-webusb';
import { CONSTS } from '@/CONSTS';

const { GAME_FILES_DIR, SAVE_FILE_PATTERN, ANDROID_USER_AGENT, IOS_USER_AGENT, IPAD_DESKTOP_PLATFORM } = CONSTS.usb;

/** ADB 인증키는 이 브라우저의 IndexedDB 에 남는다 (사이트 데이터를 지우면 휴대폰에서 다시 허용) */
const credentialStore = new AdbWebCredentialStore();

/**
 * 휴대폰 USB 로 불러오기를 쓸 수 있는지 (지원 = 안드로이드 폰을 PC 크롬·엣지에 USB 로 연결한 경우만).
 * - android: 안드로이드 폰 브라우저 (자기 폰에 USB 로 붙을 수 없어 PC 에서 하도록 안내)
 * - ios: 아이폰·아이패드 (자동 채우기 지원 안 함)
 * - insecure: HTTPS · localhost 가 아님 (브라우저가 USB 기능을 막음)
 * - unsupported: WebUSB 가 없는 브라우저 (사파리 · 파이어폭스 등)
 * User-Agent 는 화면에 무엇을 보여 줄지 고르는 데만 쓴다 (보안 판단 아님)
 */
export type SaveImportAvailability = 'available' | 'android' | 'ios' | 'insecure' | 'unsupported';

export function saveImportAvailability(): SaveImportAvailability {
  const isIpadDesktopMode = navigator.platform === IPAD_DESKTOP_PLATFORM && navigator.maxTouchPoints > 1;
  if (IOS_USER_AGENT.test(navigator.userAgent) || isIpadDesktopMode) return 'ios';
  if (ANDROID_USER_AGENT.test(navigator.userAgent)) return 'android';
  if (!window.isSecureContext) return 'insecure';
  return AdbDaemonWebUsbDeviceManager.BROWSER ? 'available' : 'unsupported';
}

/** 기기 선택 창 → 휴대폰의 "USB 디버깅 허용" 승인까지. 을 취소하면 undefined */
export async function connectUsbAdb(): Promise<Adb | undefined> {
  const manager = AdbDaemonWebUsbDeviceManager.BROWSER;
  if (!manager) throw new Error('이 브라우저는 USB 연결을 지원하지 않아요. 크롬이나 엣지에서 열어 주세요');
  const device = await manager.requestDevice();
  if (!device) return undefined;
  const connection = await device.connect();
  const transport = await AdbDaemonTransport.authenticate({ serial: device.serial, connection, credentialStore });
  return new Adb(transport);
}

export interface SaveFileEntry {
  name: string;
  size: number;
}

/** 게임 저장 폴더의 data_a_*.json 목록 (이름순) */
export async function listSaveFiles(adb: Adb): Promise<SaveFileEntry[]> {
  const sync = await adb.sync();
  try {
    const entries = await sync.readdir(GAME_FILES_DIR);
    return entries
      .filter((entry) => SAVE_FILE_PATTERN.test(entry.name))
      .map((entry) => ({ name: entry.name, size: Number(entry.size) }))
      .sort((left, right) => left.name.localeCompare(right.name));
  } finally {
    await sync.dispose();
  }
}

/** 게임 저장 폴더의 파일 하나를 통째로 읽어 메모리에 모은다 */
export async function readSaveFile(adb: Adb, name: string): Promise<Uint8Array> {
  const sync = await adb.sync();
  try {
    const chunks: Uint8Array[] = [];
    let total = 0;
    for await (const chunk of sync.read(`${GAME_FILES_DIR}/${name}`)) {
      chunks.push(chunk);
      total += chunk.length;
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return bytes;
  } finally {
    await sync.dispose();
  }
}
