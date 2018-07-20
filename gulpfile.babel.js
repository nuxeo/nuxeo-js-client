'use strict';

import gulp from 'gulp';
import babel from 'gulp-babel';
import browserify from 'browserify';
import source from 'vinyl-source-stream';
import eslint from 'gulp-eslint';
import mocha from 'gulp-mocha';
import istanbul from 'gulp-istanbul';
import babelify from 'babelify';
import { Server } from 'karma';
import gulpSequence from 'gulp-sequence';
import fs from 'fs';
import path from 'path';
import del from 'del';
import pkg from './package.json';

const JS_REPORTS_DIR = process.env.JS_REPORTS_DIR || 'js-reports';

gulp.task('lint', () => {
  return gulp.src(['lib/**', 'test/**/*.js', '!node_modules/**'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('clean:dist', () => {
  return del([
    'dist',
  ]);
});

gulp.task('build:es5', () => {
  return gulp.src('lib/**')
    .pipe(babel())
    .pipe(gulp.dest('dist/es5'));
});

gulp.task('build:browser', () => {
  return browserify({
    entries: 'lib/index-browserify.js',
  })
  .transform(babelify)
  .bundle()
  .pipe(source('nuxeo.js'))
  .pipe(gulp.dest('dist'));
});

// coverage removed, waiting for https://jira.nuxeo.com/browse/NXJS-145
// gulp.task('pre-test', () => {
//   return gulp.src(['lib/**/*.js'])
//     .pipe(istanbul())
//     .pipe(istanbul.hookRequire());
// });

gulp.task('test:node', /*['pre-test'],*/ () => {
  return gulp.src(['test/helpers/setup-logging.js', 'test/**/*.spec.js'])
    .pipe(mocha({
      require: ['./test/helpers/setup.js', './test/helpers/setup-node.js'],
      timeout: 30000,
    }))
    // coverage removed, waiting for https://jira.nuxeo.com/browse/NXJS-145
    // .pipe(istanbul.writeReports());
});

gulp.task('test:es5', ['build:es5', 'copy:files'], () => {
  return gulp.src(['test/helpers/setup-logging.js', 'test/**/*.spec.js'])
    .pipe(mocha({
      require: ['./test/helpers/setup.js', './test/helpers/setup-node-es5.js'],
      timeout: 30000,
    }));
});

gulp.task('test:browser', ['build:browser'], (done) => {
  new Server({
    configFile: __dirname + '/karma.conf.js',
    singleRun: true,
  }, (exitStatus) => done(exitStatus ? 'Browser tests failed' : undefined)).start();
});

gulp.task('test', gulpSequence('test:node', 'test:es5', 'test:browser'));

gulp.task('it:node', /*['pre-test'],*/ () => {
  return gulp.src('test/**/*.spec.js')
    .pipe(mocha({
      require: ['./test/helpers/setup.js', './test/helpers/setup-node.js'],
      reporter: 'mocha-jenkins-reporter',
      reporterOptions: {
        junit_report_path: './ftest/target/' + JS_REPORTS_DIR + '/test-results-node.xml',
        junit_report_stack: 1,
      },
      timeout: 30000,
    }))
    .on('error', () => process.exit(0))
    // coverage removed, waiting for https://jira.nuxeo.com/browse/NXJS-145
    // .pipe(istanbul.writeReports({
    //   reporters: ['lcov', 'json', 'text', 'text-summary', 'cobertura'],
    // }));
});

gulp.task('it:browser', ['build:browser'], (done) => {
  new Server({
    configFile: __dirname + '/karma.conf.js',
    singleRun: true,
    reporters: ['junit', 'spec'],
    junitReporter: {
      outputDir: './ftest/target/' + JS_REPORTS_DIR + '/',
      useBrowserName: true,
    },
  }, () => done(undefined)).start();
});

gulp.task('it:es5', gulpSequence('build:es5', 'copy:files', 'it:node:es5'));

gulp.task('it:node:es5', () => {
  return gulp.src('test/**/*.spec.js')
    .pipe(mocha({
      require: ['./test/helpers/setup.js', './test/helpers/setup-node-es5.js'],
      reporter: 'mocha-jenkins-reporter',
      reporterOptions: {
        junit_report_path: './ftest/target/' + JS_REPORTS_DIR + '/test-results-node.xml',
        junit_report_stack: 1,
      },
      timeout: 30000,
    }))
    .on('error', () => process.exit(0));
});

gulp.task('checkstyle', () => {
  const targetFolder = 'ftest/target';
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder);
  }

  return gulp.src(['lib/**', '!node_modules/**'])
    .pipe(eslint())
    .pipe(eslint.format('checkstyle', fs.createWriteStream(path.join(targetFolder, '/checkstyle-result.xml'))));
});

gulp.task('it', gulpSequence('checkstyle', 'it:node', 'it:browser'));

gulp.task('copy:lib', () => {
  return gulp.src('lib/**')
    .pipe(gulp.dest('dist/lib'));
});

gulp.task('copy:files', () => {
  delete pkg.devDependencies;
  delete pkg.scripts;
  fs.writeFileSync('dist/package.json', JSON.stringify(pkg, null, '  '), 'utf-8');
  fs.writeFileSync('dist/LICENSE', fs.readFileSync('LICENSE', 'utf-8'), 'utf-8');
  fs.writeFileSync('dist/README.md', fs.readFileSync('README.md', 'utf-8'), 'utf-8');
});

gulp.task('release', gulpSequence('lint', 'clean:dist', 'build:es5',
  'build:browser', 'copy:lib', 'copy:files'));

gulp.task('default', ['test:node']);
