'use strict';

var browserify = require('browserify'),
	vinyl_source_stream = require('vinyl-source-stream'),
	gulp = require('gulp'),
	jshint = require('gulp-jshint'),
	jscs = require('gulp-jscs'),
	stylish = require('gulp-jscs-stylish'),
	uglify = require('gulp-uglify'),
	rename = require('gulp-rename'),
	filelog = require('gulp-filelog'),
	header = require('gulp-header'),
	expect = require('gulp-expect-file'),
	fs = require('fs'),
	path = require('path'),
	shell = require('shelljs'),

	PKG_INFO = require('./package.json'),
	// Build filenames.
	BUILDS = {
		uncompressed: PKG_INFO.name + '-' + PKG_INFO.version + '.js',
		compressed: PKG_INFO.name + '-' + PKG_INFO.version + '.min.js'
	},
	// gulp-header.
	BANNER = fs.readFileSync('banner.txt').toString(),
	BANNER_OPTS = {
		pkg: PKG_INFO,
		currentYear: (new Date()).getFullYear()
	},
	// gulp-expect-file options.
	EXPECT_OPTS = {
		silent: true,
		errorOnFailure: true,
		checkRealFile: true
	},
	JS_FILES = ['gulpfile.js', 'lib/*.js'];


gulp.task('browserify', function () {
	return browserify([path.join(__dirname, PKG_INFO.main)], {
		standalone: PKG_INFO.name
	}).bundle()
		.pipe(vinyl_source_stream(PKG_INFO.name + '.js'))
		.pipe(filelog('browserify'))
		.pipe(header(BANNER, BANNER_OPTS))
		.pipe(rename(BUILDS.uncompressed))
		.pipe(gulp.dest('dist/'));
});


gulp.task('uglify', function () {
	var src = 'dist/' + BUILDS.uncompressed;
	return gulp.src(src)
		.pipe(filelog('uglify'))
		.pipe(expect(EXPECT_OPTS, src))
		.pipe(uglify())
		.pipe(header(BANNER, BANNER_OPTS))
		.pipe(rename(BUILDS.compressed))
		.pipe(gulp.dest('dist/'));
});


gulp.task('copy:uncompressed', function () {
	var src = 'dist/' + BUILDS.uncompressed;
	return gulp.src(src)
		.pipe(filelog('copy'))
		.pipe(expect(EXPECT_OPTS, src))
		.pipe(rename(PKG_INFO.name + '.js'))
		.pipe(gulp.dest('dist/'));
});


gulp.task('copy:compressed', function () {
	var src = 'dist/' + BUILDS.compressed;
	return gulp.src(src)
		.pipe(filelog('copy'))
		.pipe(expect(EXPECT_OPTS, src))
		.pipe(rename(PKG_INFO.name + '.min.js'))
		.pipe(gulp.dest('dist/'));
});


gulp.task('lint', function () {
	return gulp.src(JS_FILES)
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
