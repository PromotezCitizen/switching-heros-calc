/** 저장 불러오기 결과: 채우지 못한 항목 목록 (USB · 폴더 불러오기 공통) */
import { useTranslation } from 'react-i18next';
import { List, Text } from '@mantine/core';

export default function SaveImportNotes({ notes }: { notes: string[] }) {
  const { t: translate } = useTranslation();
  if (notes.length === 0) return null;
  return (
    <>
      <Text size="sm">{translate('usb.notFilled')}</Text>
      <List size="sm">
        {notes.map((note) => (
          <List.Item key={note}>{note}</List.Item>
        ))}
      </List>
    </>
  );
}
