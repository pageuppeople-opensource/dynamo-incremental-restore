'use strict';

var gulp   = require('gulp');
var plugins = require('gulp-load-plugins')();
var zip = require('gulp-zip');
var install = require('gulp-install');
var del = require('del');

var paths = {
  packagejson: ['./package.json'],
  lint: ['./gulpfile.js', './lib/**/*.js'],
  watch: ['./gulpfile.js', './lib/**', './test/**/*.js', '!test/{temp,temp/**}'],
  tests: ['./test/**/*.js', '!test/{temp,temp/**}'],
  source: ['./lib/*.js'],
  dest: './dist/',
  zip: ['dist/**/*', '!dist/package.json', 'dist/.*'],
  deploy: './deploy/'
};

var plumberConf = {};

if (process.env.CI) {
  plumberConf.errorHandler = function(err) {
    throw err;
  };
}

gulp.task('lint', function () {
  return gulp.src(paths.lint)
    .pipe(plugins.jshint('.jshintrc'))
    .pipe(plugins.plumber(plumberConf))
    .pipe(plugins.jscs())
    .pipe(plugins.jshint.reporter('jshint-stylish'));
});

gulp.task('istanbul', function (cb) {
  gulp.src(paths.source)
    .pipe(plugins.istanbul()) // Covering files
    .pipe(plugins.istanbul.hookRequire()) // Force `require` to return covered files
    .on('finish', function () {
      gulp.src(paths.tests)
        .pipe(plugins.plumber(plumberConf))
        .pipe(plugins.mocha())
        .pipe(plugins.istanbul.writeReports()) // Creating the reports after tests runned
        .on('finish', function() {
          process.chdir(__dirname);
          cb();
        });
    });
});

gulp.task('bump', ['test'], function () {
  var bumpType = plugins.util.env.type || 'patch'; // major.minor.patch

  return gulp.src(['./package.json'])
    .pipe(plugins.bump({ type: bumpType }))
    .pipe(gulp.dest('./'));
});

gulp.task('watch', ['test'], function () {
  gulp.watch(paths.watch, ['test']);
});

gulp.task('test', [/*'lint', */'istanbul']);

gulp.task('clean', function(cb) {
  del(paths.dest,
    del(paths.deploy, cb)
  );
});

gulp.task('js', function() {
  gulp.src(paths.source)
    .pipe(gulp.dest(paths.dest));
});

gulp.task('npm', function() {
  gulp.src(paths.packagejson)
    .pipe(gulp.dest(paths.dest))
    .pipe(install({production: true}));
});

gulp.task('zip', function() {
  gulp.src(paths.zip)
    .pipe(zip('dist.zip'))
    .pipe(gulp.dest(paths.deploy));
});

gulp.task('release', ['clean', 'bump', 'js', 'npm', 'zip']);

gulp.task('default', ['watch']);
