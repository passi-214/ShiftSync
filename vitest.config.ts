import { defineConfig } from 'vitest/config'

// Core modules are plain TypeScript, so tests run without booting Nuxt / `nuxt prepare`.
export default defineConfig({
  esbuild: { tsconfigRaw: '{}' },
  test: { include: ['tests/**/*.spec.ts'] }
})
