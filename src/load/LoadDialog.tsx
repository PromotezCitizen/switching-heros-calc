/**
 * 불러오기 창: 게임 버전 · 입력값 파일로 저장 / 불러오기 · 안드로이드 폰 USB 로 채우기 (지원 범위: 윈도우 + 폰 USB 디버깅만).
 * 파일 불러오기는 파일 내용으로 입력값 전체를 바꾼다 (백업 되살리기 · 다른 기기로 옮기기).
 * 게임 버전은 폰에서 채울 때 저장 데이터에서 읽어 기록한 값이다.
 */
import { useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Divider, Group, Modal, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { CONSTS } from '@/CONSTS';
import SectionTitle from '@/components/SectionTitle';
import { backupFileName, createBackup, downloadBackup, parseBackup } from '@/load/inputBackup';
import { useCalcStore } from '@/store/useCalcStore';
import ManualInputNote from '@/usb/ManualInputNote';
import UsbImportSection from '@/usb/UsbImportSection';

const { FILE_ACCEPT, GAME_VERSION_KEY } = CONSTS.load;

export default function LoadDialog() {
  const { t: translate } = useTranslation();
  const [opened, { open, close }] = useDisclosure(false);
  const [message, setMessage] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const gameVersion = useCalcStore((state) => state.values[GAME_VERSION_KEY]);

  const onExport = () => {
    const { values } = useCalcStore.getState();
    const now = new Date();
    downloadBackup(createBackup(values, now), backupFileName(now));
    setMessage(translate('load.exportDone', { count: Object.keys(values).length }));
  };

  const onImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) {
      setMessage(translate(`load.importInvalid.${parsed.reason}`));
      return;
    }
    const { backup } = parsed;
    const { reset, setValues } = useCalcStore.getState();
    reset();
    setValues(backup.values);
    const count = Object.keys(backup.values).length;
    setMessage(
      backup.version
        ? translate('load.importDoneWithVersion', { count, version: backup.version })
        : translate('load.importDone', { count }),
    );
  };

  const onClose = () => {
    close();
    setMessage('');
  };

  return (
    <>
      <Button variant="default" onClick={open}>
        {translate('load.open')}
      </Button>
      <Modal opened={opened} onClose={onClose} title={translate('load.title')}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {gameVersion ? translate('load.gameVersion', { version: gameVersion }) : translate('load.gameVersionUnknown')}
          </Text>

          <Stack gap="xs">
            <SectionTitle>{translate('load.fileTitle')}</SectionTitle>
            <Text size="sm">{translate('load.fileHelp')}</Text>
            <Group>
              <Button variant="light" onClick={onExport}>
                {translate('load.export')}
              </Button>
              <Button variant="light" onClick={() => fileInput.current?.click()}>
                {translate('load.import')}
              </Button>
              <input ref={fileInput} type="file" accept={FILE_ACCEPT} hidden onChange={(event) => void onImportFile(event)} />
            </Group>
            <Text size="xs" c="dimmed">
              {translate('load.importWarning')}
            </Text>
            {message && <Text size="sm">{message}</Text>}
          </Stack>

          <Divider />
          <Stack gap="xs">
            <SectionTitle>{translate('load.usbTitle')}</SectionTitle>
            <UsbImportSection />
            <ManualInputNote />
          </Stack>
        </Stack>
      </Modal>
    </>
  );
}
