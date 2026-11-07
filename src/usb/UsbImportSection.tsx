/**
 * 불러오기 창의 "휴대폰 USB 로 불러오기": USB (WebUSB + ADB) 로 게임 저장 파일을 읽어 입력 칸을 채운다.
 * 읽은 파일은 이 브라우저 안에서만 다루고, 필요한 값만 꺼낸 뒤 원본은 버린다. 채우고 나면 · 창을 닫으면 USB 연결을 끊는다.
 * PC 크롬·엣지 (보안 연결) 에서만 버튼을 보이고, 그 밖에는 안 되는 이유를 알린다.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Group, List, Stack, Text } from '@mantine/core';
import type { Adb } from '@yume-chan/adb';
import { CONSTS } from '@/CONSTS';
import { useStatTables } from '@/data/statTables';
import { useCalcStore } from '@/store/useCalcStore';
import SaveImportNotes from '@/usb/SaveImportNotes';
import { importSaveFiles, missingSaveKinds } from '@/usb/saveImport/readSaveFiles';
import { connectUsbAdb, listSaveFiles, readSaveFile, saveImportAvailability, type SaveFileEntry } from '@/usb/usbAdb';

const { SAVE_IMPORT_TABLES, STEP_COUNT } = CONSTS.usb;
/** 안내 단계 번호 1 ~ STEP_COUNT (번역 usb.steps.<번호>) */
const USB_STEP_NUMBERS = Array.from({ length: STEP_COUNT }, (_, index) => index + 1);

type Step = 'idle' | 'connecting' | 'connected' | 'importing' | 'done';

export default function UsbImportSection() {
  const { t: translate } = useTranslation();
  const [adb, setAdb] = useState<Adb>();
  const [files, setFiles] = useState<SaveFileEntry[]>([]);
  const [step, setStep] = useState<Step>('idle');
  const [message, setMessage] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  const tables = useStatTables(SAVE_IMPORT_TABLES);
  const setValues = useCalcStore((state) => state.setValues);
  const [availability] = useState(saveImportAvailability);
  const missingKinds = missingSaveKinds(files.map((file) => file.name));

  // 창을 닫아 이 부분이 사라지면 USB 연결도 끊는다
  const adbRef = useRef<Adb>(undefined);
  adbRef.current = adb;
  useEffect(() => () => void adbRef.current?.close().catch(() => undefined), []);

  const disconnect = async (connected: Adb | undefined) => {
    setAdb(undefined);
    await connected?.close().catch(() => undefined);
  };

  const onConnect = async () => {
    setStep('connecting');
    setNotes([]);
    setMessage(translate('usb.waiting'));
    try {
      const connected = await connectUsbAdb();
      if (!connected) {
        setStep('idle');
        setMessage(translate('usb.cancelled'));
        return;
      }
      setAdb(connected);
      setFiles(await listSaveFiles(connected));
      setStep('connected');
      setMessage(translate('usb.connected', { serial: connected.serial }));
    } catch (error) {
      setStep('idle');
      setMessage(translate('usb.failed', { error: String(error) }));
    }
  };

  const onImport = async () => {
    if (!adb || tables.status !== 'ready') return;
    setStep('importing');
    try {
      const outcome = await importSaveFiles(
        files.map((file) => file.name),
        (name) => readSaveFile(adb, name),
        tables.data,
      );
      setValues(outcome.storeValues);
      setNotes([...(outcome.missingKeys.length > 0 ? [translate('usb.missingKeys', { keys: outcome.missingKeys.join(', ') })] : []), ...outcome.notes]);
      setStep('done');
      setMessage(translate('usb.importDone', { count: outcome.count }));
    } catch (error) {
      setStep('connected');
      setMessage(translate('usb.failed', { error: String(error) }));
    } finally {
      await disconnect(adb);
    }
  };

  if (availability !== 'available') {
    return (
      <Text size="sm" c="dimmed">
        {translate(`usb.hint.${availability}`)}
      </Text>
    );
  }

  return (
    <Stack gap="sm">
      <List type="ordered" size="sm" spacing={4}>
        {USB_STEP_NUMBERS.map((number) => (
          <List.Item key={number}>{translate(`usb.steps.${number}`)}</List.Item>
        ))}
      </List>
      <Group>
        <Button onClick={onConnect} loading={step === 'connecting'} disabled={step !== 'idle' && step !== 'done'}>
          {translate('usb.connect')}
        </Button>
        <Button
          onClick={onImport}
          loading={step === 'importing'}
          disabled={step !== 'connected' || missingKinds.length > 0 || tables.status !== 'ready'}
        >
          {translate('usb.import')}
        </Button>
      </Group>
      {step === 'connected' && <Text size="sm">{translate('usb.overwriteWarning')}</Text>}
      {step === 'connected' && missingKinds.length > 0 && (
        <Text c="red" size="sm">
          {translate('usb.missingFile', { kind: missingKinds.join(', ') })}
        </Text>
      )}
      {message && <Text size="sm">{message}</Text>}
      <SaveImportNotes notes={notes} />
      <Text size="xs" c="dimmed">
        {translate('usb.privacy')}
      </Text>
      <Text size="xs" c="dimmed">
        {translate('usb.troubleshoot')}
      </Text>
    </Stack>
  );
}
