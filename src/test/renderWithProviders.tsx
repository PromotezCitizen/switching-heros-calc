import type { ReactElement } from 'react';
import { MantineProvider } from '@mantine/core';
import { render } from '@testing-library/react';
import '@/i18n';

/** 화면 검사에서 Mantine 과 번역을 함께 붙여 그린다 */
export function renderWithProviders(element: ReactElement) {
  return render(<MantineProvider>{element}</MantineProvider>);
}
