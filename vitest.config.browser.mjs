/**
 * Vitest browser config using Playwright provider.
 *
 * Runs tests in headless Chrome via Playwright for both local dev and CI.
 * Requires Google Chrome (or Chromium) installed on the system.
 * On CI, Chrome is pre-installed in the builder-nodejs Docker image.
 * Locally, any Chrome/Chromium installation is picked up automatically.
 *
 * Environment variables:
 *   NUXEO_BASE_URL - Nuxeo server URL (default: http://localhost:8080/nuxeo)
 */
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import commonjs from 'vite-plugin-commonjs';

export default defineConfig({
  plugins: [commonjs()],
  define: {
    'process.env.NUXEO_BASE_URL': JSON.stringify(process.env.NUXEO_BASE_URL || ''),
  },
  test: {
    globals: true,
    include: ['test/**/*.spec.js'],
    exclude: ['test/oauth2*.spec.js'],
    testTimeout: 30000,
    setupFiles: ['test/helpers/setup-browser-vitest.mjs'],
    fileParallelism: false,
    browser: {
      enabled: true,
      headless: true,
      instances: [
        {
          browser: 'chromium',
          provider: playwright({
            launchOptions: {
              channel: 'chrome',
            },
          }),
        },
      ],
    },
  },
});
