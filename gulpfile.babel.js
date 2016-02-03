'use strict';

import gulp from 'gulp';
import babel from 'gulp-babel';
import browserify from 'browserify';
import source from 'vinyl-source-stream';
import eslint from 'gulp-eslint';
import mocha from 'gulp-spawn-mocha';
import babelify from 'babelify';
import { Server } from 'karma';
import gulpSequence from 'gulp-sequence';
import nsp from 'gulp-nsp';

gulp.task('default', ['dist'], () => {
});

gulp.task('lint', () => {
  return gulp.src(['src/**', '!node_modules/**'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('build:node', ['lint'], () => {
  return gulp.src('src/**')
    .pipe(babel())
    .pipe(gulp.dest('lib'));
});

gulp.task('build:browser', ['lint'], () => {
  return browserify({
    entries: ['src/index.js'],
    standalone: 'Nuxeo',
  })
  .transform(babelify)
  .bundle()
  .pipe(source('nuxeo.js'))
  .pipe(gulp.dest('dist'));
});

gulp.task('build', gulpSequence(['build:node', 'build:browser']));

gulp.task('test:node', ['build:node'], () => {
  return gulp.src('test/**/*.spec.js')
    .pipe(mocha({
      require: ['./test/helpers/setup.js', './test/helpers/setup-node.js'],
      compilers: 'js:babel-core/register',
    }));
});

gulp.task('test:browser', ['build:browser'], (done) => {
  new Server({
    configFile: __dirname + '/karma.conf.js',
    singleRun: true,
  }, () => done()).start();
});

gulp.task('test', gulpSequence('test:node', 'test:browser'));

gulp.task('prepublish', ['nsp', 'test']);

gulp.task('nsp', (done) => {
  nsp({ package: __dirname + '/package.json' }, done);
});
