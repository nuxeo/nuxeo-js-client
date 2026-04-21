import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.spec.js'],
    exclude: ['test/wdio/**'],
    testTimeout: 30000,
    setupFiles: ['test/helpers/setup-node.js', 'test/helpers/setup-logging.js'],
    fileParallelism: false,
  },
});
