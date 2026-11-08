import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox, Group, Input, NumberInput, Stack, Text, TextInput } from '@mantine/core';
import { parseGameNumber } from '@/calc/gameNumber';
import { CONSTS } from '@/CONSTS';
import ChoiceChips, { type ChoiceOption } from '@/components/ChoiceChips';
import HelpHint from '@/components/HelpHint';
import { useStoreValue } from '@/components/useStoreValue';

/** 라벨 오른쪽에 ? 안내를 붙인다. 안내가 없으면 라벨만 */
/** 묶음 고르기 칸의 줄 이름 너비 (px): 이름 옆에 ? 설명이 붙어도 한 줄로 */
const GROUP_LABEL_WIDTH = 64;

function labelWithHint(label: string, hint?: ReactNode): ReactNode {
  if (!hint) return label;
  return (
    <Group gap={4} component="span" wrap="nowrap">
      {label}
      <HelpHint>{hint}</HelpHint>
    </Group>
  );
}

interface FieldBase {
  /** 저장소 칸 이름 (접두사 포함, 예: 'calc.artifactTotalAtk') */
  storeKey: string;
  label: string;
  /** 값 찾는 곳 안내 (? 버튼) */
  hint?: ReactNode;
}

/** 비어 있지 않은데 읽을 수 없는 글인가. 0 ("0" · "0.00") 은 "값 없음" 으로 읽을 수 있는 값이라 오류가 아니다 (불러오기가 값이 없는 연성 옵션에 0.00 을 적는다) */
const ZERO_TEXT = /^\s*0+([.,]0*)?\s*%?\s*$/;
export function isUnreadableGameNumber(text: string | undefined): boolean {
  if (!text || text.trim() === '') return false;
  return parseGameNumber(text) === null && !ZERO_TEXT.test(text);
}

interface GameNumberFieldProps extends FieldBase {
  /** 입력 예시 (placeholder) */
  example?: string;
}

/** 게임 큰 수 표기 ("5.14N%", "8.97DC") 입력 칸. 비어 있지 않은데 읽을 수 없으면 오류 표시 */
export function GameNumberField({ storeKey, label, hint, example }: GameNumberFieldProps) {
  const { t: translate } = useTranslation();
  const [text, setText] = useStoreValue(storeKey);
  const unreadable = isUnreadableGameNumber(text);
  return (
    <TextInput
      label={labelWithHint(label, hint)}
      placeholder={example}
      value={text ?? ''}
      error={unreadable ? translate('common.invalidGameNumber') : undefined}
      onChange={(event) => setText(event.currentTarget.value)}
    />
  );
}

/**
 * 게임의 누적 목록("이름 … 값")과 같은 모양의 한 줄: 왼쪽 이름, 오른쪽 입력 칸.
 * 게임 창과 같은 순서로 세로로 늘어놓으면 한 줄씩 옮겨 적기 쉽다
 */
export function GameNumberRow({ storeKey, label, hint, example }: GameNumberFieldProps) {
  const { t: translate } = useTranslation();
  const [text, setText] = useStoreValue(storeKey);
  const unreadable = isUnreadableGameNumber(text);
  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
      <Group gap={4} wrap="nowrap" pt={6} style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm">{label}</Text>
        {hint && <HelpHint>{hint}</HelpHint>}
      </Group>
      <TextInput
        aria-label={label}
        placeholder={example}
        value={text ?? ''}
        w={CONSTS.display.LIST_INPUT_WIDTH}
        error={unreadable ? translate('common.invalidGameNumber') : undefined}
        onChange={(event) => setText(event.currentTarget.value)}
      />
    </Group>
  );
}

interface IntegerFieldProps extends FieldBase {
  /** 라벨을 화면에 보이지 않게 하고(접근성 이름만 유지) 안내 글자로 대신한다. 칸 위의 한 줄을 아낀다 */
  hideLabel?: boolean;
  /** 안내 글자 (hideLabel 일 때 라벨 대신 보임) */
  placeholder?: string;
  min?: number;
  max?: number;
  /** 저장된 값이 없을 때 보여 줄 값 */
  fallback?: number;
}

/** 정수·소수 숫자 칸 (레벨, 층, 개수 등). 저장소에는 글로 저장하고 읽을 때 숫자로 바꾼다 */
export function NumberField({
  storeKey,
  label,
  hint,
  hideLabel,
  placeholder,
  min = 0,
  max,
  fallback = 0,
}: IntegerFieldProps) {
  const [text, setText] = useStoreValue(storeKey);
  const parsed = text === undefined || text === '' ? NaN : Number(text);
  return (
    <NumberInput
      label={hideLabel ? undefined : labelWithHint(label, hint)}
      aria-label={hideLabel ? label : undefined}
      placeholder={placeholder}
      min={min}
      max={max}
      hideControls
      allowNegative={min < 0}
      value={Number.isFinite(parsed) ? parsed : fallback}
      onChange={(next) => setText(String(next))}
    />
  );
}

interface SelectFieldProps extends FieldBase {
  options: ChoiceOption[];
  disabled?: boolean;
}

/** 고르기 칸: 선택지가 모두 보이는 버튼 묶음 (드롭다운 쓰지 않음). 저장된 값이 없으면 첫 항목 */
export function SelectField({ storeKey, label, hint, options, disabled }: SelectFieldProps) {
  const [text, setText] = useStoreValue(storeKey);
  return (
    <ChoiceChips
      label={labelWithHint(label, hint)}
      value={text ?? options[0]?.value ?? ''}
      options={options}
      disabled={disabled}
      onChange={setText}
    />
  );
}

export interface SelectGroup {
  label: string;
  options: ChoiceOption[];
  /** 줄 이름 옆 ? 설명 (없으면 없음) */
  hint?: ReactNode;
}

interface GroupedSelectFieldProps extends Omit<FieldBase, 'label'> {
  /** 칸 이름. 없으면 이름 줄 없이 (바깥 제목이 이름을 대신할 때) */
  label?: string;
  groups: SelectGroup[];
  disabled?: boolean;
}

/** 묶음으로 나눈 고르기 칸: 묶음마다 이름과 버튼 줄이 따로 있고, 전체에서 하나만 고른다. 저장된 값이 없으면 첫 묶음의 첫 항목 */
export function GroupedSelectField({ storeKey, label, hint, groups, disabled }: GroupedSelectFieldProps) {
  const [text, setText] = useStoreValue(storeKey);
  const selected = text ?? groups[0]?.options[0]?.value ?? '';
  return (
    <Input.Wrapper label={label ? labelWithHint(label, hint) : undefined}>
      <Stack gap={4}>
        {groups.map((group) => (
          // 버튼이 여러 줄로 넘어가도 묶음 이름은 첫 줄 옆에 (이름 칸 높이 = 버튼 한 줄 높이)
          <Group key={group.label} gap="sm" wrap="nowrap" align="flex-start">
            <Text size="xs" c="dimmed" w={GROUP_LABEL_WIDTH} component="div" style={{ whiteSpace: 'nowrap' }}>
              {labelWithHint(group.label, group.hint)}
            </Text>
            <ChoiceChips
              value={group.options.some((option) => option.value === selected) ? selected : ''}
              options={group.options}
              disabled={disabled}
              onChange={(next) => next && setText(next)}
            />
          </Group>
        ))}
      </Stack>
    </Input.Wrapper>
  );
}

/** 켬/끔 체크 칸. 저장소에는 'true' / 'false' 글로 저장. 저장된 값이 없을 때는 defaultChecked */
export function FlagField({ storeKey, label, hint, defaultChecked = false, disabled }: FieldBase & { defaultChecked?: boolean; disabled?: boolean }) {
  const [text, setText] = useStoreValue(storeKey);
  return (
    <Checkbox
      label={labelWithHint(label, hint)}
      disabled={disabled}
      checked={text === undefined ? defaultChecked : text === 'true'}
      onChange={(event) => setText(String(event.currentTarget.checked))}
    />
  );
}
