const baseConfiguration = require('./karma.base.conf.js');

module.exports = (config) => {
  baseConfiguration.logLevel = config.LOG_INFO;

  config.set(baseConfiguration);
};
