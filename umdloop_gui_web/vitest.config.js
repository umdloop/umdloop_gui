import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.{test,spec,property}.{js,mjs,ts}'],
    css: false,
  },
  css: {
    postcss: { plugins: [] },
  },
});
