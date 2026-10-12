/** 글자 칸 → 줄 탭 (일기장·코스튬·도감·칭호·기타·프로필) 이 같이 쓰는 입력 칸 */
import { useTranslation } from 'react-i18next';
import { Checkbox, TextInput } from '@mantine/core';
import { CONSTS } from '../../CONSTS';
import { parseGameNumber } from '../gameNumber';
import { isChecked } from '../sources/textLines/screenFields';
import type { TabPanelProps } from '../types';

type FieldProps = Pick<TabPanelProps, 'values' | 'setValue'> & {
  /** 칸 이름 (기존 HTML 의 data-key) */
  fieldId: string;
  /** 번역 키 앞부분: <prefix>.label / <prefix>.example */
  translationPrefix: string;
};

/** 게임 화면 값 글자 칸. showInvalid 이면 읽을 수 없는 글일 때 오류 표시 (프로필 창 값) */
export function ScreenValueInput({
  values,
  setValue,
  fieldId,
  translationPrefix,
  invalidMessage,
}: FieldProps & { invalidMessage?: string }) {
  const { t: translate } = useTranslation();
  const text = values[fieldId] ?? '';
  const isInvalid = invalidMessage !== undefined && text.trim() !== '' && !parseGameNumber(text);
  return (
    <TextInput
      label={translate(`${translationPrefix}.label`)}
      placeholder={translate(`${translationPrefix}.example`)}
      value={text}
      error={isInvalid ? invalidMessage : undefined}
      onChange={(event) => setValue(fieldId, event.currentTarget.value)}
    />
  );
}

/** 레벨·개수 숫자 칸 (기본 빈칸 = 0) */
export function LevelInput({ values, setValue, fieldId, translationPrefix }: FieldProps) {
  const { t: translate } = useTranslation();
  return (
    <TextInput
      type="number"
      inputMode="numeric"
      min={CONSTS.textLines.MIN_LEVEL}
      label={translate(`${translationPrefix}.label`)}
      value={values[fieldId] ?? ''}
      onChange={(event) => setValue(fieldId, event.currentTarget.value)}
    />
  );
}

/** 켜짐/꺼짐 칸 (기본 꺼짐) */
export function SwitchCheckbox({
  values,
  setValue,
  fieldId,
  label,
}: Pick<TabPanelProps, 'values' | 'setValue'> & { fieldId: string; label: string }) {
  return (
    <Checkbox
      label={label}
      checked={isChecked(values[fieldId])}
      onChange={(event) =>
        setValue(
          fieldId,
          event.currentTarget.checked ? CONSTS.textLines.CHECKED_TEXT : CONSTS.textLines.UNCHECKED_TEXT,
        )
      }
    />
  );
}
