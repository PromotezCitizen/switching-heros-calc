import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // '/src' = 프로젝트 루트 기준 src 폴더 (tsconfig paths 의 @/* 와 같은 곳)
    alias: { '@': '/src' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // 한 번에 한 파일만 돌린다: 기본값 (모든 코어) 으로 돌리면 PC 에서 다른 프로그램 (게임 등) 이 끊긴다
    maxWorkers: 1,
  },
});
