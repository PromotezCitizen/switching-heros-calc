import { useTranslation } from 'react-i18next';
import { ActionIcon, useMantineColorScheme, type MantineColorScheme } from '@mantine/core';

/** 누를 때마다 다크 → 라이트 → 기기 설정 따라가기 → 다크 */
const NEXT: Record<MantineColorScheme, MantineColorScheme> = { dark: 'light', light: 'auto', auto: 'dark' };
const ICON_SIZE = 16;
/** 버튼 한 변 (px) = 옆 불러오기 버튼 높이 (theme 의 Button 기본 크기 compact-sm 높이) */
const BUTTON_HEIGHT = 26;

/** 지금 모드 아이콘: 다크 = 달, 라이트 = 해, 기기 설정 = 반쪽 찬 원 (선 아이콘, 글자색) */
function SchemeIcon({ scheme }: { scheme: MantineColorScheme }) {
  return (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {scheme === 'dark' && <path d="M12 3a7.5 7.5 0 0 0 9 9 9 9 0 1 1-9-9z" />}
      {scheme === 'light' && (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </>
      )}
      {scheme === 'auto' && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

/** 화면 모드 전환 버튼 (아이콘). 고른 값은 Mantine 이 이 기기 (localStorage) 에 저장한다 */
export default function ColorSchemeButton() {
  const { t: translate } = useTranslation();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const next = NEXT[colorScheme];
  const hint = translate('common.colorScheme.hint', {
    current: translate(`common.colorScheme.${colorScheme}`),
    next: translate(`common.colorScheme.${next}`),
  });
  return (
    <ActionIcon variant="default" size={BUTTON_HEIGHT} onClick={() => setColorScheme(next)} aria-label={hint} title={hint}>
      <SchemeIcon scheme={colorScheme} />
    </ActionIcon>
  );
}
