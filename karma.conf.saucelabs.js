const baseConfiguration = require('./karma.base.conf.js');

const browsers = {
  sl_latest_chrome: {
    base: 'SauceLabs',
    browserName: 'chrome',
    browserVersion: 'latest',
  },
  sl_latest_firefox: {
    base: 'SauceLabs',
    browserName: 'firefox',
    browserVersion: 'latest',
  },
  sl_latest_safari: {
    base: 'SauceLabs',
    platformName: 'macOS 13',
    browserName: 'safari',
    browserVersion: 'latest',
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
