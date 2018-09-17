const baseConfiguration = require('./karma.base.conf.js');

module.exports = (config) => {
  baseConfiguration.logLevel = config.LOG_INFO;
  baseConfiguration.browsers = ['Chrome'];
  config.set(baseConfiguration);
};
