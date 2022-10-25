const baseConfiguration = require('./karma.base.conf.js');

const browsers = {
  sl_70_chrome: {
    base: 'SauceLabs',
    browserName: 'chrome',
    platform: 'Windows',
    version: '70',
  },
  sl_latest_firefox: {
    base: 'SauceLabs',
    browserName: 'firefox',
    platform: 'Windows',
    version: '64',
  },
  sl_latest_esr_firefox: {
    base: 'SauceLabs',
    browserName: 'firefox',
    platform: 'Windows',
    version: '60',
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
