import type { ReactNode } from 'react';
import { Chip, Group, Input } from '@mantine/core';
import { CONSTS } from '../CONSTS';
import LazySelect from './LazySelect';

export interface ChoiceOption {
  value: string;
  label: string;
}

interface ChoiceChipsProps {
  label?: ReactNode;
  value: string;
  options: ChoiceOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * 고르기 칸. 선택지가 적으면 버튼으로 다 보여 주고 (한 번 눌러 고름, 개수와 상관없이 같은 모양),
 * 많으면 드롭다운 (칸 하나만 차지)
 */
export default function ChoiceChips({ label, value, options, onChange, disabled }: ChoiceChipsProps) {
  if (options.length > CONSTS.display.CHOICE_BUTTONS_MAX_OPTIONS) {
    return (
      <LazySelect
        label={label}
        data={options}
        value={value}
        disabled={disabled}
        allowDeselect={false}
        onChange={(next) => next !== null && onChange(next)}
      />
    );
  }
  const buttons = (
    <Chip.Group multiple={false} value={value} onChange={(next) => onChange(String(next))}>
      <Group gap={4}>
        {options.map((option) => (
          <Chip key={option.value} value={option.value} disabled={disabled} variant="outline" size="xs">
            {option.label}
          </Chip>
        ))}
      </Group>
    </Chip.Group>
  );
  return label ? <Input.Wrapper label={label}>{buttons}</Input.Wrapper> : buttons;
}
