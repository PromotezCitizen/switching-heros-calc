import { useTranslation } from 'react-i18next';
import { List, Stack, Text } from '@mantine/core';
import { CONSTS } from '@/CONSTS';

const { MANUAL_INPUT_ITEMS } = CONSTS.usb;

/** 불러오기 창: 저장 데이터에 없어서 불러와도 안 채워지는 항목 (직접 입력해야 함) */
export default function ManualInputNote() {
  const { t: translate } = useTranslation();
  return (
    <Stack gap={4}>
      <Text size="sm" fw={600}>
        {translate('usb.manualTitle')}
      </Text>
      <Text size="xs" c="dimmed">
        {translate('usb.manualHelp')}
      </Text>
      <List size="sm" spacing={2}>
        {MANUAL_INPUT_ITEMS.map((item) => (
          <List.Item key={item}>{translate(`usb.manualItems.${item}`)}</List.Item>
        ))}
      </List>
    </Stack>
  );
}
