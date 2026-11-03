import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// The app is served from https://takmashhido.github.io/NebulaTransfer/ in production.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/NebulaTransfer/' : '/',
  plugins: [react()],
  build: { target: 'es2020', sourcemap: false },
  test: { environment: 'node' },
}));
