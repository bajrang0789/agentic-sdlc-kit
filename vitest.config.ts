import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    passWithNoTests: true,
    // fd-lock coordinates an OS-level descriptor; keep transaction tests isolated.
    fileParallelism: false,
  },
});
