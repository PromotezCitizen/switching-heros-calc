import { useTranslation } from 'react-i18next';
import { Button, Group, List, Popover, Text } from '@mantine/core';
import { CONSTS } from '@/CONSTS';
import { readImportNotes } from '@/load/importRecord';
import { useCalcStore } from '@/store/useCalcStore';

const { IMPORTED_AT_KEY, IMPORT_NOTES_KEY } = CONSTS.load;
/** 불러온 시각 표기: 월 · 일 · 시 · 분 */
const TIME_FORMAT: Intl.DateTimeFormatOptions = { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
const NOTES_WIDTH = 420;

/** 불러오기 창 안 한 줄: 마지막으로 불러온 시각과 그때 알림 (누르면 목록) */
export default function ImportRecordLine() {
  const { t: translate } = useTranslation();
  const importedAt = useCalcStore((state) => state.values[IMPORTED_AT_KEY]);
  const notesText = useCalcStore((state) => state.values[IMPORT_NOTES_KEY]);
  const notes = readImportNotes(notesText);
  const importedDate = importedAt ? new Date(importedAt) : null;
  const importedText =
    importedDate && !Number.isNaN(importedDate.getTime())
      ? translate('status.importedAt', { time: importedDate.toLocaleString('ko-KR', TIME_FORMAT) })
      : translate('status.notImported');

  return (
    <Group gap="xs" wrap="wrap">
      <Text size="sm" c="dimmed">
        {importedText}
      </Text>
      {notes.length > 0 && (
        <Popover width={NOTES_WIDTH} position="bottom-start" withArrow>
          <Popover.Target>
            <Button variant="subtle" size="compact-sm">
              {translate('status.notes', { count: notes.length })}
            </Button>
          </Popover.Target>
          <Popover.Dropdown>
            <List size="sm" spacing={4}>
              {notes.map((note, index) => (
                <List.Item key={index}>{note}</List.Item>
              ))}
            </List>
          </Popover.Dropdown>
        </Popover>
      )}
    </Group>
  );
}
