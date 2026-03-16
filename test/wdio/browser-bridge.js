/**
 * WDIO spec that bridges browser Mocha test results to WDIO reporters.
 *
 * This spec opens test/browser-tests.html (served by @wdio/static-server-service),
 * waits for the in-browser Mocha run to complete, then writes a JUnit XML file
 * with one testcase per browser test so Jenkins reports them individually.
 * The spec fails (and thus breaks the CI build) if any browser test fails.
 */

/* global browser */
/* eslint-disable no-console */

const path = require('path');
const junitBuilder = require('junit-report-builder');

/**
 * Build a sanitized browser identifier from WDIO capabilities (e.g. "chrome_146").
 * Uses underscore to avoid Jenkins interpreting dots as package/class separators.
 */
function getBrowserId(caps) {
  const name = caps.browserName || 'unknown';
  const version = (caps.browserVersion || '').split('.')[0];
  return version ? `${name}_${version}` : name;
}

/**
 * Write a JUnit XML report with one <testcase> per browser Mocha test result.
 *
 * Uses junit-report-builder for proper XML escaping and JUnit schema compliance.
 *
 * @param {object} results - The window.__mochaResults__ object from the browser.
 * @param {string} browserId - Sanitized browser identifier (e.g. "chrome_146").
 * @param {string} outputDir - Directory to write the XML file to.
 */
function writeJUnitReport(results, browserId, outputDir) {
  const builder = junitBuilder.newBuilder();
  const suite = builder.testSuite().name(`Browser Tests (${browserId})`);

  (results.tests || []).forEach((test) => {
    const tc = suite.testCase()
      .className(browserId)
      .name(test.fullTitle || test.title)
      .time((test.duration || 0) / 1000);

    if (test.state === 'failed') {
      tc.failure(test.error);
      if (test.stack) {
        tc.stacktrace(test.stack);
      }
    } else if (test.state === 'pending') {
      tc.skipped();
    }
  });

  const filePath = path.join(outputDir, `test-results-browser-${browserId}.xml`);
  builder.writeTo(filePath);
  console.log(`JUnit XML written to ${filePath}`);
}

describe('Browser Tests', function browserTests() {
  this.timeout(11 * 60 * 1000); // 11 minutes — higher than waitUntil so its timeoutMsg wins

  let results;

  before('run browser Mocha suite', async () => {
    console.log('Navigating to browser-tests.generated.html ...');
    await browser.url('/test/browser-tests.generated.html');
    console.log('Navigation complete, waiting for Mocha to finish ...');

    // Wait for the in-browser Mocha run to finish (up to 10 minutes)
    await browser.waitUntil(
      async () => {
        const completed = await browser.execute(
          () => window.__mochaResults__ && window.__mochaResults__.completed,
        );
        return completed === true;
      },
      {
        timeout: 10 * 60 * 1000,
        interval: 2000,
        timeoutMsg: 'Browser Mocha run did not complete in time',
      },
    );

    results = await browser.execute(() => window.__mochaResults__);

    // Write JUnit XML with individual test results for Jenkins
    const reportsDir = process.env.JS_REPORTS_DIR || 'reports';
    const outputDir = path.resolve('ftest', 'target', reportsDir);
    const browserId = getBrowserId(browser.capabilities);
    writeJUnitReport(results, browserId, outputDir);
  });

  it('should have collected test results', () => {
    if (!results || !results.tests || results.tests.length === 0) {
      throw new Error('No test results collected from browser Mocha run');
    }
    console.log(
      `Browser Mocha: ${results.passed} passed, `
      + `${results.failed} failed, ${results.pending} pending`,
    );
  });

  it('should have no test failures', function noFailures() {
    if (!results || !results.tests) {
      this.skip();
      return;
    }

    const failures = results.tests.filter((t) => t.state === 'failed');

    console.log(
      `\nBrowser Test Summary: ${results.passed} passed, `
      + `${results.failed} failed, ${results.pending} pending`,
    );

    if (failures.length > 0) {
      const summary = failures
        .map((t) => `  FAIL: ${t.fullTitle}\n        ${t.error}`)
        .join('\n');
      throw new Error(
        `${failures.length} browser test(s) failed:\n${summary}`,
      );
    }
  });
});
