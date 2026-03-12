/**
 * WebdriverIO configuration for browser integration tests.
 *
 * Local mode: runs tests in headless Chrome (chromedriver auto-managed by WDIO).
 * CI mode: runs tests on Sauce Labs (Chrome, Firefox, Safari) when SAUCE_USERNAME
 *          and SAUCE_ACCESS_KEY are set.
 *
 * Environment variables:
 *   NUXEO_BASE_URL   - Nuxeo server URL (default: http://localhost:8080/nuxeo)
 *   JS_DIST_DIR      - Directory containing nuxeo.js bundle (default: dist)
 *   JS_BUILD_DIR     - Directory containing tests.js bundle (default: build)
 *   SAUCE_USERNAME   - Sauce Labs username (enables CI mode)
 *   SAUCE_ACCESS_KEY - Sauce Labs access key (enables CI mode)
 *   BUILD_TAG        - CI build identifier for Sauce Labs
 */

const path = require('path');
const fs = require('fs');

const nuxeoBaseURL = process.env.NUXEO_BASE_URL || 'http://localhost:8080/nuxeo';
const distDir = process.env.JS_DIST_DIR || 'dist';
const buildDir = process.env.JS_BUILD_DIR || 'build';
const useSauceLabs = !!(process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY);

// Static server serves the project root so /dist/nuxeo.js, /build/tests.js,
// /test/browser-tests.html, and /node_modules/mocha/* are all accessible.
const staticServerConfig = {
  folders: [{ mount: '/', path: '.' }],
  port: 8888,
};

// --- Capabilities -----------------------------------------------------------

let capabilities;
let services;

if (useSauceLabs) {
  const sauceBuild = process.env.BUILD_TAG || `local-${Date.now()}`;

  // Enforce classic WebDriver protocol for all Sauce Labs browsers. WDIO v9
  // auto-opts Chrome/Firefox into WebDriver BiDi (webSocketUrl: true), which
  // causes commands to hang on Sauce Labs -- BiDi commands are sent over a
  // WebSocket relay that doesn't work reliably through Sauce Connect tunnels.
  capabilities = [
    {
      browserName: 'chrome',
      browserVersion: 'latest',
      platformName: 'Windows 10',
      'wdio:enforceWebDriverClassic': true,
      'sauce:options': { build: sauceBuild, name: 'nuxeo-js-client' },
    },
    {
      browserName: 'firefox',
      browserVersion: 'latest',
      platformName: 'Windows 10',
      'wdio:enforceWebDriverClassic': true,
      'sauce:options': { build: sauceBuild, name: 'nuxeo-js-client' },
    },
    {
      browserName: 'safari',
      browserVersion: 'latest',
      platformName: 'macOS 13',
      'wdio:enforceWebDriverClassic': true,
      'sauce:options': { build: sauceBuild, name: 'nuxeo-js-client' },
    },
  ];

  services = [
    ['static-server', staticServerConfig],
    ['sauce', {
      sauceConnect: true,
      sauceConnectOpts: {
        // Sauce Connect v5 denies localhost proxying by default. The static
        // server runs on localhost:8888 so the remote browser must be allowed
        // to reach it through the tunnel.
        proxyLocalhost: 'direct',
      },
    }],
  ];
} else {
  capabilities = [
    {
      browserName: 'chrome',
      'goog:chromeOptions': {
        args: ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
      },
    },
  ];

  services = [
    ['static-server', staticServerConfig],
  ];
}

// --- Reporters ---------------------------------------------------------------

// JUnit XML for individual browser tests is written by the bridge spec
// (test/wdio/browser-bridge.js) using junit-report-builder. The WDIO junit
// reporter is not used because it only sees the two bridge-level it() blocks,
// not the individual browser Mocha tests.
const reporters = ['spec'];

// --- HTML page injection -----------------------------------------------------

// Replace placeholder tokens in browser-tests.html with actual values from
// environment variables. The generated file is written alongside the template
// and cleaned up after the run.
const onPrepare = function onPrepare() {
  const htmlPath = path.resolve('test', 'browser-tests.html');
  let html = fs.readFileSync(htmlPath, 'utf8');

  html = html.replace(/__JS_DIST_DIR__/g, distDir);
  html = html.replace(/__JS_BUILD_DIR__/g, buildDir);
  html = html.replace(/__NUXEO_BASE_URL__/g, nuxeoBaseURL);

  const tmpHtmlPath = path.resolve('test', 'browser-tests.generated.html');
  fs.writeFileSync(tmpHtmlPath, html, 'utf8');
};

const onComplete = function onComplete() {
  const tmpHtmlPath = path.resolve('test', 'browser-tests.generated.html');
  try {
    fs.unlinkSync(tmpHtmlPath);
  } catch (e) {
    // ignore
  }
};

// --- Export ------------------------------------------------------------------

exports.config = {
  runner: 'local',
  specs: ['./test/wdio/browser-bridge.js'],
  maxInstances: 1,
  capabilities,
  services,
  reporters,

  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 12 * 60 * 1000, // 12 minutes (outer WDIO timeout, longer than inner Mocha)
  },

  logLevel: 'warn',
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  baseUrl: 'http://localhost:8888',

  // Set user/key at the config level for Sauce Labs mode. This signals WDIO
  // that a remote driver is in use, which skips automatic chromedriver/browser
  // downloads that would otherwise fail in CI environments lacking `xz`.
  ...(useSauceLabs ? {
    user: process.env.SAUCE_USERNAME,
    key: process.env.SAUCE_ACCESS_KEY,
  } : {}),

  onPrepare,
  onComplete,
};
