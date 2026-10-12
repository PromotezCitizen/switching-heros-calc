import { useState } from 'react';
import { Box, Image, Modal, Stack, Text, UnstyledButton } from '@mantine/core';
import AutoGrid from '../../../components/AutoGrid';
import { CONSTS } from '../../../CONSTS';

const { PICKER_BUTTON_IMAGE_SIZE, PICKER_OPTION_IMAGE_SIZE, TYPE_ICON_SIZE, PICKER_OPTION_MIN_WIDTH, UNUSED_OPACITY } =
  CONSTS.heroWeaponCardPet.ui;

/** public/icons/<경로>.png */
export function iconUrl(path: string): string {
  return `${import.meta.env.BASE_URL}icons/${path}.png`;
}

/** 그림 (경로가 비면 점선 빈칸) */
export function PickerImage({ path, size }: { path: string; size: number }) {
  if (!path) {
    return (
      <Box
        w={size}
        h={size}
        style={{ border: '1px dashed var(--mantine-color-dimmed)', borderRadius: 'var(--mantine-radius-sm)' }}
        aria-hidden
      />
    );
  }
  return <Image src={iconUrl(path)} w={size} h={size} fit="contain" alt="" />;
}

/** 속성·직업 같은 작은 아이콘 (이름은 마우스를 올리면 보임) */
export function TypeIcon({ path, name }: { path: string | undefined; name: string }) {
  if (!path) return <Text span size="xs">{name}</Text>;
  return <Image src={iconUrl(path)} w={TYPE_ICON_SIZE} h={TYPE_ICON_SIZE} alt={name} title={name} display="inline-block" />;
}

export interface PickerOption {
  value: string;
  label: string;
  /** 그림 경로 (icons/ 아래, 확장자 없음). 빈 글이면 점선 빈칸 */
  icon: string;
  /** 이름 아래 작은 아이콘 */
  noteIcon?: { path: string | undefined; name: string };
  /** 고를 수 없는 이유 (예: 다른 칸에 장착 중) */
  disabledReason?: string;
}

interface IconPickerProps {
  /** 버튼 설명 */
  label: string;
  /** 고르기 창 제목 */
  title: string;
  value: string;
  /** 아무것도 안 골랐을 때 버튼 이름 */
  emptyName: string;
  /** 첫 항목은 "없음" (값 '') */
  options: PickerOption[];
  onPick: (value: string) => void;
  closeLabel: string;
}

/** 아이콘으로 고르기: 그림 버튼을 누르면 아이콘 격자 창이 뜬다 (기존 iconPicker / openPicker) */
export default function IconPicker({ label, title, value, emptyName, options, onPick, closeLabel }: IconPickerProps) {
  const [opened, setOpened] = useState(false);
  const picked = options.find((option) => option.value === value && option.value);
  const emptyIcon = options.find((option) => !option.value)?.icon ?? '';
  return (
    <>
      <UnstyledButton onClick={() => setOpened(true)} aria-label={label}>
        <Stack gap={0} align="center">
          <PickerImage path={picked ? picked.icon : emptyIcon} size={PICKER_BUTTON_IMAGE_SIZE} />
          <Text size="sm">{picked ? picked.label : emptyName}</Text>
        </Stack>
      </UnstyledButton>
      <Modal opened={opened} onClose={() => setOpened(false)} title={title} closeButtonProps={{ 'aria-label': closeLabel }}>
        <AutoGrid minItemWidth={PICKER_OPTION_MIN_WIDTH}>
          {options.map((option) => (
            <UnstyledButton
              key={option.value || 'empty'}
              aria-pressed={option.value === value}
              disabled={!!option.disabledReason}
              title={option.disabledReason}
              data-autofocus={option.value === value || undefined}
              onClick={() => {
                onPick(option.value);
                setOpened(false);
              }}
              p="xs"
              style={{
                opacity: option.disabledReason ? UNUSED_OPACITY : undefined,
                borderRadius: 'var(--mantine-radius-sm)',
                outline: option.value === value ? '2px solid var(--mantine-primary-color-filled)' : undefined,
              }}
            >
              <Stack gap={0} align="center">
                <PickerImage path={option.icon} size={PICKER_OPTION_IMAGE_SIZE} />
                <Text size="xs" ta="center">{option.label}</Text>
                {option.noteIcon && <TypeIcon path={option.noteIcon.path} name={option.noteIcon.name} />}
              </Stack>
            </UnstyledButton>
          ))}
        </AutoGrid>
      </Modal>
    </>
  );
}
