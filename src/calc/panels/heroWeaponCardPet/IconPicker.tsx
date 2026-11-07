import { useState, type ReactNode } from 'react';
import { Box, Image, Modal, Stack, Text, Title, Tooltip, UnstyledButton } from '@mantine/core';
import AutoGrid from '@/components/AutoGrid';
import { CONSTS } from '@/CONSTS';

const { PICKER_BUTTON_IMAGE_SIZE, PICKER_OPTION_IMAGE_SIZE, TYPE_ICON_SIZE, PICKER_OPTION_MIN_WIDTH, PICKER_HINT_MAX_WIDTH, UNUSED_OPACITY } =
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
  /** 묶음 제목 (있으면 고르기 창에서 같은 묶음끼리 제목 아래 모은다, 처음 나온 순서). 없는 항목 ("없음" 등) 은 맨 위 */
  group?: string;
  /** 마우스를 올리면 (또는 키보드로 가면) 보이는 설명 */
  hint?: ReactNode;
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
  /**
   * 여러 개 켜고 끄기 (고정 카드 등): 주면 고른 값 목록으로 표시하고, 누르면 onToggle 을 부르며 창을 닫지 않는다.
   * buttonContent 는 창을 여는 버튼 안의 내용 (없으면 하나 고르기와 같은 그림 + 이름)
   */
  selectedValues?: readonly string[];
  onToggle?: (value: string) => void;
  buttonContent?: ReactNode;
  disabled?: boolean;
}

/** 아이콘으로 고르기: 그림 버튼을 누르면 아이콘 격자 창이 뜬다 (기존 iconPicker / openPicker) */
export default function IconPicker({
  label,
  title,
  value,
  emptyName,
  options,
  onPick,
  closeLabel,
  selectedValues,
  onToggle,
  buttonContent,
  disabled,
}: IconPickerProps) {
  const isSelected = (optionValue: string) => (selectedValues ? selectedValues.includes(optionValue) : optionValue === value);
  const [opened, setOpened] = useState(false);
  const picked = options.find((option) => option.value === value && option.value);
  const emptyIcon = options.find((option) => !option.value)?.icon ?? '';
  // 묶음: 묶음이 없는 항목이 맨 위, 그다음 묶음마다 처음 나온 순서로
  const groups: { name: string; items: PickerOption[] }[] = [];
  for (const option of options) {
    const name = option.group ?? '';
    const found = groups.find((group) => group.name === name);
    if (found) found.items.push(option);
    else if (name) groups.push({ name, items: [option] });
    else groups.unshift({ name, items: [option] });
  }
  const optionButton = (option: PickerOption) => {
    const button = (
      <UnstyledButton
        key={option.value || 'empty'}
        aria-pressed={isSelected(option.value)}
        disabled={!!option.disabledReason}
        title={option.disabledReason}
        data-autofocus={(!selectedValues && option.value === value) || undefined}
        onClick={() => {
          if (onToggle) {
            onToggle(option.value);
            return;
          }
          onPick(option.value);
          setOpened(false);
        }}
        p="xs"
        w="100%"
        style={{
          opacity: option.disabledReason ? UNUSED_OPACITY : undefined,
          borderRadius: 'var(--mantine-radius-sm)',
          outline: isSelected(option.value) ? '2px solid var(--mantine-primary-color-filled)' : undefined,
        }}
      >
        <Stack gap={0} align="center">
          <PickerImage path={option.icon} size={PICKER_OPTION_IMAGE_SIZE} />
          <Text size="xs" ta="center">{option.label}</Text>
          {option.noteIcon && <TypeIcon path={option.noteIcon.path} name={option.noteIcon.name} />}
        </Stack>
      </UnstyledButton>
    );
    if (!option.hint) return button;
    // 고를 수 없는 (disabled) 버튼은 마우스 이벤트가 안 와서 바깥 칸에 힌트를 단다
    return (
      <Tooltip key={option.value || 'empty'} multiline maw={PICKER_HINT_MAX_WIDTH} events={{ hover: true, focus: true, touch: false }} label={option.hint}>
        <Box>{button}</Box>
      </Tooltip>
    );
  };
  return (
    <>
      <UnstyledButton onClick={() => setOpened(true)} aria-label={label} disabled={disabled}>
        {buttonContent ?? (
          <Stack gap={0} align="center">
            <PickerImage path={picked ? picked.icon : emptyIcon} size={PICKER_BUTTON_IMAGE_SIZE} />
            <Text size="sm">{picked ? picked.label : emptyName}</Text>
          </Stack>
        )}
      </UnstyledButton>
      <Modal opened={opened} onClose={() => setOpened(false)} title={title} closeButtonProps={{ 'aria-label': closeLabel }}>
        <Stack gap="sm">
          {groups.map((group) => (
            <Stack key={group.name || 'ungrouped'} gap={4}>
              {group.name && <Title order={6}>{group.name}</Title>}
              <AutoGrid minItemWidth={PICKER_OPTION_MIN_WIDTH}>{group.items.map(optionButton)}</AutoGrid>
            </Stack>
          ))}
        </Stack>
      </Modal>
    </>
  );
}
