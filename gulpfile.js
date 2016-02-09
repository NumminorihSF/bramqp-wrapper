/**
 * Created by numminorihsf on 09.02.16.
 */
const gulp = require('gulp');
const babel = require('gulp-babel');

gulp.task('default', ['source','etc']);

gulp.task('etc', () =>
    gulp.src([
      '.gitignore',
      '.npmignore',
      'changelog.md',
      'README.md',
      'LICENSE',
      'package.json'], {base:'.'})
      .pipe(gulp.dest('out/'))
);

gulp.task('source', () =>
    gulp.src(['lib/**/*.js','domain/**/*js'], {base:'.'})
      .pipe(babel({
        presets: ['es2015']
      }))
      .pipe(gulp.dest('out/'))
);