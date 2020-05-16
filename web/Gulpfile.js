const fs = require('fs');
const path = require('path');
const { watch, series, parallel, src, dest } = require('gulp');
const sass = require('gulp-sass');
const uglify = require('gulp-uglify');
const htmlmin = require('gulp-htmlmin');
const inlinesource = require('gulp-inline-source');
const gls = require('gulp-live-server');
const gzip = require('gulp-gzip');

sass.compiler = require('node-sass');
const sassConfig = {
  outputStyle: 'compressed',
  functions: {
    ...require('./vendor/sass-inline-image')({ base: __dirname }),
  }
};
const uglifyConfig = {
  compress: {
    drop_debugger: false,
  },
  sourceMap: false,
  toplevel: true,
};
const htmlminConfig = {
  collapseBooleanAttributes: true,
  collapseWhitespace: true, // This might be tricky
  collapseInlineTagWhitespace: false,
  conservativeCollapse: false,
  minifyCSS: false,
  minifyJS: false,
  minifyURLs: false,
  removeEmptyAttributes: true,
}

const index = {
  html: './index.html',
  js: './index.js',
  scss: './index.scss',
};
const workDir = './.tmp';
const serverScript = './server.js'

function clean(cb) {
  fs.rmdir(workDir, { recursive: true }, cb);
}

function buildSass() {
  return src(index.scss)
    .pipe(sass(sassConfig).on('error', sass.logError))
    .pipe(dest(workDir));
}

function minifyJs() {
  return src(index.js)
    .pipe(uglify(uglifyConfig))
    .pipe(dest(workDir));
}

function minifyHtml() {
  return src(index.html)
    .pipe(htmlmin(htmlminConfig))
    .pipe(dest(workDir));
}

function inlineHtml() {
  return src(path.posix.join(workDir, index.html))
    .pipe(inlinesource({
      compress: false,
      rootpath: workDir,
    }))
    .pipe(dest(workDir));
}

function gzipHtml() {
  return src(path.posix.join(workDir, index.html))
    .pipe(gzip({
      skipGrowingFiles: true,
      append: true,
    }))
    .pipe(dest('../src'));
}

const preBuild = parallel(buildSass, minifyJs, minifyHtml);

exports.clean = clean;
exports.default = exports.build = series(clean, preBuild, inlineHtml, gzipHtml);

exports.dev = series(clean, function watchesAndServer(cb) {
  // Modify config for dev
  uglifyConfig.sourceMap = { url: 'inline' };

  const server = gls.new(serverScript);
  watch(Object.values(index), { ignoreInitial: false }, series(preBuild, inlineHtml));
  watch(serverScript, { ignoreInitial: false }, function reloadServer(icb) {
    server.start();
    icb();
  });

  cb();
});
