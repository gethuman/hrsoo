/**
 * Author: Jeff Whelpley
 * Date: 4/16/15
 *
 * Gulp task for building client side file
 */
var browserify  = require('browserify');
var source      = require('vinyl-source-stream');
var buffer      = require('vinyl-buffer');
var gutil       = require('gulp-util');
var uglify      = require('gulp-uglify');
var sourcemaps  = require('gulp-sourcemaps');

module.exports = function (gulp) {
    var b = browserify({
        entries: './lib/hrsoo.js',
        debug: true
    });

    return {
        full: function () {
            return b.bundle()
                .pipe(source('hrsoo.js'))
                .pipe(buffer())
                .pipe(gulp.dest('./dist'));
        },
        uglify: function () {
            return b.bundle()
                .pipe(source('hrsoo.min.js'))
                .pipe(buffer())
                .pipe(sourcemaps.init({ loadMaps: true }))
                .pipe(uglify())
                .on('error', gutil.log)
                .pipe(sourcemaps.write('./'))
                .pipe(gulp.dest('./dist'));
        },
        '': ['jsbuild.full', 'jsbuild.uglify']
    };
};
