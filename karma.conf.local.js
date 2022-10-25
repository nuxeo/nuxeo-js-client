const baseConfiguration = require('./karma.base.conf.js');

module.exports = (config) => {
  baseConfiguration.client.baseURL = 'http://localhost:8080/nuxeo';
  baseConfiguration.logLevel = config.LOG_INFO;
  baseConfiguration.browsers = ['Chrome'];
  config.set(baseConfiguration);
};
