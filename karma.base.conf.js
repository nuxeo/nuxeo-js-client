module.exports = {
  frameworks: ['browserify', 'mocha', 'chai'],
  files: [
    'dist/*.js',
    'test/helpers/setup.js',
    'test/helpers/setup-browser.js',
    'test/helpers/setup-logging.js',
    'test/**/*.spec.js',
  ],
  preprocessors: {
    'test/helpers/*.js': ['browserify'],
    'test/**/*.spec.js': ['browserify'],
  },
  browserify: {
    debug: true,
    transform: ['babelify'],
  },
  client: {
    mocha: {
      timeout: 30 * 1000,
    },
  },
  reporters: ['dots'],
  browserNoActivityTimeout: 30 * 1000,
  port: 9876,
  colors: true,
  autoWatch: true,
  browsers: ['Chrome'],
  singleRun: true,
  concurrency: 1,
};
