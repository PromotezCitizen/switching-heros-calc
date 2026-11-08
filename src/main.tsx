import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import '@/global.css';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';
import '@/i18n';
import { theme } from '@/theme';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      {/* 주소 앞부분 (Pages 저장소 이름) 을 뺀 나머지로 페이지를 고른다 */}
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </MantineProvider>
  </StrictMode>,
);
