/**
 * Dependencies.
 */
var browserify = require('browserify');
var vinyl_transform = require('vinyl-transform');
var gulp = require('gulp');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var filelog = require('gulp-filelog');
var header = require('gulp-header');
var expect = require('gulp-expect-file');
var fs = require('fs');
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
	var src = ['gulpfile.js', 'lib/**/*.js'];
	return gulp.src(src)
		.pipe(filelog('lint'))
		.pipe(expect(expect_options, src))
		.pipe(jshint('.jshintrc'))
		.pipe(jshint.reporter('jshint-stylish', {verbose: true}))
		.pipe(jshint.reporter('fail'));
});


gulp.task('browserify', function() {
	var browserified = vinyl_transform(function(filename) {
		var b = browserify(filename, {
			standalone: pkg.name
		});
		return b.bundle();
	});

	var src = pkg.main;
	return gulp.src(src)
		.pipe(filelog('browserify'))
		.pipe(expect(expect_options, src))
		.pipe(browserified)
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
		.pipe(rename(pkg.name + '.js'))
		.pipe(gulp.dest('dist/'));
});


gulp.task('copy:compressed', function() {
	var src = 'dist/' + builds.compressed;
	return gulp.src(src)
		.pipe(filelog('copy'))
		.pipe(expect(expect_options, src))
		.pipe(rename(pkg.name + '.min.js'))
		.pipe(gulp.dest('dist/'));
});


gulp.task('watch', function() {
	gulp.watch(['lib/**/*.js'], ['devel']);
});


gulp.task('devel', gulp.series('lint', 'browserify'));


gulp.task('dist', gulp.series(
	'lint',
	'browserify',
	gulp.parallel(
		'copy:uncompressed',
		gulp.series('uglify', 'copy:compressed')
	)
));


gulp.task('default', gulp.series('dist'));
