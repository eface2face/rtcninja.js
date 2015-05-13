"use strict";

/**
 * Dependencies.
 */
var browserify = require('browserify');
var vinyl_source_stream = require('vinyl-source-stream');
var gulp = require('gulp');
var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');
var stylish = require('gulp-jscs-stylish');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var filelog = require('gulp-filelog');
var header = require('gulp-header');
var expect = require('gulp-expect-file');
var fs = require('fs');
var path = require('path');
var shell = require('shelljs');

var PKG_INFO = require('./package.json');


// Build filenames.
var builds = {
	uncompressed: PKG_INFO.name + '-' + PKG_INFO.version + '.js',
	compressed:   PKG_INFO.name + '-' + PKG_INFO.version + '.min.js'
};

// gulp-header.
var banner = fs.readFileSync('banner.txt').toString();
var banner_options = {
	pkg: PKG_INFO,
	currentYear: (new Date()).getFullYear()
};

// gulp-expect-file options.
var expect_options = {
	silent: true,
	errorOnFailure: true,
	checkRealFile: true
};


gulp.task('browserify', function() {
	return browserify([path.join(__dirname, PKG_INFO.main)], {
		standalone: PKG_INFO.name
	}).bundle()
		.pipe(vinyl_source_stream(PKG_INFO.name + '.js'))
		.pipe(filelog('browserify'))
		.pipe(header(banner, banner_options))
		.pipe(rename(builds.uncompressed))
		.pipe(gulp.dest('dist/'));
});


gulp.task('uglify', function() {
	var src = 'dist/' + builds.uncompressed;
	return gulp.src(src)
		.pipe(filelog('uglify'))
		.pipe(expect(expect_options, src))
		.pipe(uglify())
		.pipe(header(banner, banner_options))
		.pipe(rename(builds.compressed))
		.pipe(gulp.dest('dist/'));
});


gulp.task('copy:uncompressed', function() {
	var src = 'dist/' + builds.uncompressed;
	return gulp.src(src)
		.pipe(filelog('copy'))
		.pipe(expect(expect_options, src))
		.pipe(rename(PKG_INFO.name + '.js'))
		.pipe(gulp.dest('dist/'));
});


gulp.task('copy:compressed', function() {
	var src = 'dist/' + builds.compressed;
	return gulp.src(src)
		.pipe(filelog('copy'))
		.pipe(expect(expect_options, src))
		.pipe(rename(PKG_INFO.name + '.min.js'))
		.pipe(gulp.dest('dist/'));
});


gulp.task('contribute', function () {
	var srcs = ['gulpfile.js', 'js/*.js', 'js/**/*.js'];

	return gulp.src(srcs)
		.pipe(jshint()) // enforce good practics
		.pipe(jscs()) // enforce style guide
		.on('error', function () {}) // don't stop on error
		.pipe(stylish.combineWithHintResults())
		.pipe(jshint.reporter('jshint-stylish'));
});


gulp.task('retire', function (cb) {
	if (shell.exec('node node_modules/retire/bin/retire').code !== 0) {
		cb(true);
	} else {
		cb();
	}
});

gulp.task('devel', gulp.series('browserify'));
// gulp.task('devel', gulp.series('contribute', 'browserify'));


gulp.task('dist', gulp.series(
	// 'contribute',
	'browserify',
	gulp.parallel(
		'copy:uncompressed',
		gulp.series('uglify', 'copy:compressed')
	)
));


gulp.task('default', gulp.series('dist'));
