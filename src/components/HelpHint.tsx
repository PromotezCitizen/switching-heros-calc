import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionIcon, Popover, Text } from '@mantine/core';

interface HelpHintProps {
  children: ReactNode;
}

/** 입력 칸 옆의 ? 버튼. 누르면 값을 찾는 게임 화면 경로 같은 안내가 뜬다 */
export default function HelpHint({ children }: HelpHintProps) {
  const { t: translate } = useTranslation();
  return (
    <Popover width={280} position="bottom" withArrow shadow="md">
      <Popover.Target>
        <ActionIcon variant="subtle" size="sm" radius="xl" aria-label={translate('common.help')}>
          ?
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Text size="sm">{children}</Text>
      </Popover.Dropdown>
    </Popover>
  );
}
