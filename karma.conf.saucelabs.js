const baseConfiguration = require('./karma.base.conf.js');

const browsers = {
  sl_latest_chrome: {
    base: 'SauceLabs',
    browserName: 'chrome',
    platform: 'Windows 10',
    version: 'latest',
  },
  sl_latest_firefox: {
    base: 'SauceLabs',
    browserName: 'firefox',
    platform: 'Windows 10',
    version: 'latest',
    geckodriverVersion: '0.30.0',
  },
  sl_latest_safari: {
    base: 'SauceLabs',
    browserName: 'safari',
    platform: 'macOS 12',
    version: 'latest',
  },
};

module.exports = (config) => {
  baseConfiguration.client.baseURL = `${process.env.NUXEO_BASE_URL}`;
  baseConfiguration.reporters.push('saucelabs');
  baseConfiguration.reporters.push('junit');
  baseConfiguration.junitReporter = {
    outputDir: `ftest/target/${process.env.JS_REPORTS_DIR}/`,
    useBrowserName: true,
  };
  baseConfiguration.customLaunchers = browsers;
  baseConfiguration.browsers = Object.keys(browsers);
  baseConfiguration.browserNoActivityTimeout = 5 * 60 * 1000;

  config.set(baseConfiguration);
};
