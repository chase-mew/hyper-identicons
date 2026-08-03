import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const pkg = (relative: string) => new URL(`../../packages/${relative}`, import.meta.url).pathname;

export default defineConfig({
  plugins: [react()],
  resolve: {
    // The workspace packages are consumed straight from source so the playground
    // reflects an art rebuild without a package build step in between. More
    // specific aliases must come first: a bare `hyper-identicons` → index.ts
    // would otherwise swallow `/mini`, `/core` and `/art`.
    alias: [
      { find: 'hyper-identicons/mini', replacement: pkg('hyper-identicons/src/mini.ts') },
      { find: 'hyper-identicons/core', replacement: pkg('hyper-identicons/src/core/index.ts') },
      { find: 'hyper-identicons/art', replacement: pkg('hyper-identicons/src/art/index.ts') },
      { find: 'hyper-identicons', replacement: pkg('hyper-identicons/src/index.ts') },
      { find: '@hyper-identicons/react', replacement: pkg('react/src/index.tsx') },
    ],
  },
});
