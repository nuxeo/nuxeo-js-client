var gulp = require('gulp');
var gutil = require('gulp-util');
var mocha = require('gulp-mocha');

gulp.task('default', ['test'], function() {
  // place code for your default task here
});

gulp.task('test', function() {
  gulp.src('test/*.js')
    .pipe(mocha());
});
