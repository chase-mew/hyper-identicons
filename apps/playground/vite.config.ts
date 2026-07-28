import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // The workspace packages are consumed straight from source so the playground
    // reflects an art rebuild without a package build step in between.
    alias: {
      'hyper-identicons/mini': new URL('../../packages/hyper-identicons/src/mini.ts', import.meta.url).pathname,
      'hyper-identicons': new URL('../../packages/hyper-identicons/src/index.ts', import.meta.url).pathname,
      '@hyper-identicons/react': new URL('../../packages/react/src/index.tsx', import.meta.url).pathname,
    },
  },
});
