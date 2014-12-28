/**
 * Dependencies.
 */
var browserify = require('browserify');
var vinyl_transform = require('vinyl-transform');
var gulp = require('gulp');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var template = require('gulp-template');
var filelog = require('gulp-filelog');
var header = require('gulp-header');
var expect = require('gulp-expect-file');
var nodeunit = require('gulp-nodeunit-runner');
var symlink = require('gulp-symlink');
var connect = require('gulp-connect');
var fs = require('fs');
var fs_extra = require('fs-extra');
var pkg = require('./package.json');


// Build filenames.
var builds = {
	uncompressed: pkg.name + '-' + pkg.version + '.js',
	compressed:   pkg.name + '-' + pkg.version + '.min.js'
};

// gulp-header.
var banner = fs.readFileSync('banner.txt').toString();
var banner_options = {
	pkg: pkg,
	currentYear: (new Date()).getFullYear()
};

// gulp-expect-file options.
var expect_options = {
	silent: true,
	errorOnFailure: true,
	checkRealFile: true
};


gulp.task('lint', function() {
	var src = ['gulpfile.js', 'lib/**/*.js', 'test/nodeunit/**/*.js'];
	return gulp.src(src)
		.pipe(filelog('lint'))
		.pipe(expect(expect_options, src))
		.pipe(jshint('.jshintrc'))
		.pipe(jshint.reporter('jshint-stylish', {verbose: true}))
		.pipe(jshint.reporter('fail'));
});


gulp.task('test', function() {
	var src = 'test/nodeunit/*.js';
	return gulp.src(src)
		.pipe(filelog('test'))
		.pipe(expect(expect_options, src))
		.pipe(nodeunit({reporter: 'default'}));
});


gulp.task('browserify', function() {
	var browserified = vinyl_transform(function(filename) {
		var b = browserify(filename, {standalone: pkg.name});
		return b.bundle();
	});

	var src = pkg.main;
	return gulp.src(src)
		.pipe(filelog('browserify'))
		.pipe(expect(expect_options, src))
		.pipe(browserified)
		.pipe(template({pkg: pkg}))
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


gulp.task('copy', function(cb) {
	fs_extra.copySync('dist/' + builds.uncompressed, 'dist/' + pkg.name + '.js');
	fs_extra.copySync('dist/' + builds.compressed, 'dist/' + pkg.name + '.min.js');
	cb();
});



gulp.task('watch', function() {
	gulp.watch(['lib/**/*.js'], ['devel']);
});


gulp.task('webserver', function() {
	var src = 'dist/' + builds.uncompressed;
	gulp.src(src)
		.pipe(filelog('webserver:symlink'))
		.pipe(expect(expect_options, src))
		.pipe(symlink(function() {
			return new symlink.File({path: 'test/browser/' + pkg.name + '.js'});
		}, {force: true, log: false}));

	connect.server({
		root: 'test/browser/',
		host: '127.0.0.1',
		port: 3000,
		livereload: false
	});
});


gulp.task('devel', gulp.series('lint', 'test'));
gulp.task('dist', gulp.series('lint', 'test', 'browserify', 'uglify', 'copy'));
gulp.task('default', gulp.series('dist'));
