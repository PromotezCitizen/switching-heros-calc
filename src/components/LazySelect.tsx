import { useState } from 'react';
import { Combobox, Select, TextInput, type SelectProps } from '@mantine/core';

type SelectData = SelectProps['data'];

/** 고른 값의 표시 글 (선택지가 글 / {value, label} / 묶음 어느 모양이든) */
function selectedLabel(data: SelectData, value: string): string {
  for (const item of data ?? []) {
    if (typeof item === 'string') {
      if (item === value) return item;
    } else if ('group' in item) {
      const found = selectedLabel(item.items as SelectData, value);
      if (found) return found;
    } else if (item.value === value) {
      return item.label;
    }
  }
  return '';
}

/**
 * 드롭다운 (Mantine Select 와 같은 쓰임). 누르기 전에는 고른 값만 보이는 가벼운 칸이고,
 * 누르면 그때 드롭다운을 만들어 바로 연다. 드롭다운이 많은 화면 (카드·펫 등) 을 열 때 느려지지 않게 하려는 것
 */
export default function LazySelect(props: SelectProps) {
  const [opened, setOpened] = useState(false);
  if (opened) {
    // 한 번 연 뒤에는 드롭다운을 그대로 둔다. 닫힐 때 가벼운 칸으로 되돌리면, 선택지를 누르는 순간 닫힘이 먼저 처리돼
    // 드롭다운이 값을 넘기기 전에 사라져 고른 값이 들어가지 않는다
    return <Select {...props} defaultDropdownOpened autoFocus />;
  }
  const { label, placeholder, disabled, style, size, value, data } = props;
  const open = () => {
    if (!disabled) setOpened(true);
  };
  return (
    <TextInput
      readOnly
      label={label}
      placeholder={placeholder}
      disabled={disabled}
      style={style}
      size={size}
      aria-label={props['aria-label']}
      value={value ? selectedLabel(data, value) : ''}
      rightSection={<Combobox.Chevron />}
      rightSectionPointerEvents="none"
      styles={{ input: { cursor: disabled ? undefined : 'pointer' } }}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') open();
      }}
    />
  );
}
