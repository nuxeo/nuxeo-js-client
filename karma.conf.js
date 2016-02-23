module.exports = (config) => {
  config.set({
    frameworks: ['browserify', 'mocha', 'chai'],
    files: [
      'dist/*.js',
      'test/helpers/setup.js',
      'test/helpers/setup-browser.js',
      'test/**/*.spec.js',
    ],
    preprocessors: {
      'test/helpers/*.js': ['browserify'],
      'test/**/*.spec.js': ['browserify'],
    },
    browserify: {
      debug: true,
      transform: [['babelify', {
        presets: ['es2015'],
        plugins: ['add-module-exports', 'transform-es2015-modules-commonjs'],
      }]],
    },
    reporters: ['spec'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Firefox', 'Chrome'],
    singleRun: true,
    concurrency: 1,
  });
};
