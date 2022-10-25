module.exports = {
  frameworks: ['mocha', 'chai', 'browserify'],
  files: [
    `${process.env.JS_DIST_DIR || 'dist'}/*.js`,
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
  browserNoActivityTimeout: 60 * 1000,
  port: 9876,
  colors: true,
  autoWatch: true,
  singleRun: true,
  concurrency: 1,
};
