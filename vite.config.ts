import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Production lives at https://koustav.isroot.in/NebulaTransfer/ (GitHub Pages project site),
// so built assets need the /NebulaTransfer/ prefix. The dev server stays at /.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/NebulaTransfer/' : '/',
  plugins: [react()],
  build: { target: 'es2020', sourcemap: false },
  test: { environment: 'node' },
}));
