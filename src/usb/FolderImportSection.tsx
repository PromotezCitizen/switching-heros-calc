/**
 * 불러오기 창의 "앱플레이어에서 불러오기": 앱플레이어는 USB 기기가 아니라 (adb 가 PC 안의 네트워크 포트로 붙는다) 브라우저 USB 불러오기로 못 찾는다.
 * 그래서 내려받은 실행 파일 (public/tools, adb 로 저장 파일을 바탕화면 폴더에 받음) 로 파일을 받아 두고, 그 폴더를 골라 채운다.
 * 읽은 파일은 이 브라우저 안에서만 다루고, 필요한 값만 꺼낸 뒤 원본은 버린다.
 */
import { useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Group, List, Stack, Text } from '@mantine/core';
import { CONSTS } from '@/CONSTS';
import { useStatTables } from '@/data/statTables';
import { useCalcStore } from '@/store/useCalcStore';
import SaveImportNotes from '@/usb/SaveImportNotes';
import { importSaveFiles, missingSaveKinds, saveFileNames } from '@/usb/saveImport/readSaveFiles';
import { importRecordValues } from '@/load/importRecord';

const { SAVE_IMPORT_TABLES, FOLDER_STEP_COUNT, SAVE_TOOL_PATH, SAVE_TOOL_FILE_NAME } = CONSTS.usb;
/** 안내 단계 번호 (번역 usb.folder.steps.<번호>) */
const FOLDER_STEP_NUMBERS = Array.from({ length: FOLDER_STEP_COUNT }, (_, index) => index + 1);

export default function FolderImportSection() {
  const { t: translate } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  const tables = useStatTables(SAVE_IMPORT_TABLES);
  const setValues = useCalcStore((state) => state.setValues);

  const onPickFolder = async (event: ChangeEvent<HTMLInputElement>) => {
    const picked = [...(event.currentTarget.files ?? [])];
    event.currentTarget.value = '';
    if (picked.length === 0 || tables.status !== 'ready') return;
    setNotes([]);
    // 폴더 안 (하위 폴더 제외) 의 저장 파일만
    const byName = new Map(picked.filter((file) => file.webkitRelativePath.split('/').length <= 2).map((file) => [file.name, file]));
    const names = saveFileNames([...byName.keys()]);
    const missing = missingSaveKinds(names);
    if (missing.length > 0) {
      setMessage(translate('usb.folder.missingFile', { count: missing.length }));
      return;
    }
    setBusy(true);
    try {
      const outcome = await importSaveFiles(names, async (name) => new Uint8Array(await byName.get(name)!.arrayBuffer()), tables.data);
      const importNotes = [...(outcome.missingKeys.length > 0 ? [translate('usb.missingKeys', { count: outcome.missingKeys.length })] : []), ...outcome.notes];
      setValues({ ...outcome.storeValues, ...importRecordValues(importNotes) });
      setNotes(importNotes);
      setMessage(translate('usb.folder.importDone', { count: outcome.count }));
    } catch (error) {
      setMessage(translate('usb.folder.failed', { error: String(error) }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack gap="sm">
      <List type="ordered" size="sm" spacing={4}>
        {FOLDER_STEP_NUMBERS.map((number) => (
          <List.Item key={number}>{translate(`usb.folder.steps.${number}`)}</List.Item>
        ))}
      </List>
      <Group>
        <Button component="a" variant="light" href={`${import.meta.env.BASE_URL}${SAVE_TOOL_PATH}`} download={SAVE_TOOL_FILE_NAME}>
          {translate('usb.folder.download')}
        </Button>
        <Button component="label" loading={busy} disabled={tables.status !== 'ready'}>
          {translate('usb.folder.pick')}
          {/* 폴더 고르기: webkitdirectory 는 React 속성이 없어 요소에 직접 켠다 */}
          <input
            type="file"
            multiple
            hidden
            ref={(input) => {
              if (input) input.webkitdirectory = true;
            }}
            onChange={(event) => void onPickFolder(event)}
          />
        </Button>
      </Group>
      <Text size="sm">{translate('usb.folder.overwriteWarning')}</Text>
      {message && <Text size="sm">{message}</Text>}
      <SaveImportNotes notes={notes} />
      <Text size="xs" c="dimmed">
        {translate('usb.folder.privacy')}
      </Text>
      <Text size="xs" c="dimmed">
        {translate('usb.folder.troubleshoot')}
      </Text>
    </Stack>
  );
}
