const baseConfiguration = require('./karma.base.conf.js');

module.exports = (config) => {
  baseConfiguration.reporters.push('junit');
  baseConfiguration.junitReporter = {
    outputDir: 'ftest/target/' + process.env.JS_REPORTS_DIR + '/',
    useBrowserName: true,
  };

  config.set(baseConfiguration);
};
