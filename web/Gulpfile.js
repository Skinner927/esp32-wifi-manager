const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const { watch, series, parallel, src, dest } = require('gulp');
const through2 = require('through2');
const sass = require('gulp-sass');
const uglify = require('gulp-uglify');
const htmlmin = require('gulp-htmlmin');
const inlinesource = require('gulp-inline-source');
const gls = require('gulp-live-server');
const gzip = require('gulp-gzip');
const eslint = require('gulp-eslint');
var sourcemaps = require('gulp-sourcemaps');

// Sass config
const sassConfig = {
  outputStyle: 'compressed',
  functions: {
    ...require('./vendor/sass-inline-image')({ base: __dirname }),
  },
  includePaths: 'node_modules',
};
sass.compiler = require('node-sass');

// Uglify (JS) config
const uglifyConfig = {
  compress: {
    drop_debugger: false,
  },
  sourceMap: false,
  toplevel: true,
};
let uglifyIncludeSourceMaps = false;

// ESLint
const eslintConfig = {
  useEslintrc: true,
  fix: false,
};

// HTML minify config
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

// Dev server config
const serverScript = './server.js'
const serverPort = 8010;
const start = (process.platform == 'darwin' ? 'open' : process.platform == 'win32' ? 'start' : 'xdg-open');

// File path config
// Paths that are used in Gulp need to use unix style separators regardless of system.
// All paths should also be relative to this file.
// When passing a path to a non-gulp consumer, use path.normalize and
// path.resolve to swap path separators to proper OS values.
const index = {
  html: './index.html',
  js: './index.js',
  scss: './index.scss',
  // Output target file
  html_gz: '../src/index.html.gz',
  html_dst: '../src/index.html',
};
const tmpDir = './.tmp';

// https://stackoverflow.com/a/14919494/721519
function _humanFileSize(bytes, si) {
  var thresh = si ? 1000 : 1024;
  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }
  var units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  var u = -1;
  do {
    bytes /= thresh;
    ++u;
  } while (Math.abs(bytes) >= thresh && u < units.length - 1);
  return bytes.toFixed(1) + ' ' + units[u];
}

const clean = parallel(
  function cleanTmpDir(cb) {
    fs.rmdir(path.normalize(tmpDir), { recursive: true }, () => cb());
  },
  function cleanDist(cb) {
    fs.unlink(path.normalize(index.html_dst), () => cb())
  },
  function cleanDist_gz(cb) {
    fs.unlink(path.normalize(index.html_gz), () => cb())
  }
);

function buildSass() {
  return src(index.scss)
    .pipe(sass(sassConfig).on('error', sass.logError))
    .pipe(dest(tmpDir));
}

function minifyJs() {
  let pipe = src(index.js);
  if (uglifyIncludeSourceMaps) {
    pipe = pipe.pipe(sourcemaps.init());
  }
  pipe = pipe.pipe(uglify(uglifyConfig));
  if (uglifyIncludeSourceMaps) {
    pipe = pipe.pipe(sourcemaps.write());
  }
  return pipe.pipe(dest(tmpDir));
}

function lintJs() {
  return src(index.js)
      .pipe(eslint(eslintConfig))
      .pipe(eslint.format())
      .pipe(eslint.failAfterError());
}
exports.js = lintJs;

function minifyHtml() {
  return src(index.html)
    .pipe(htmlmin(htmlminConfig))
    .pipe(dest(tmpDir));
}

function inlineHtml() {
  return src(path.posix.join(tmpDir, index.html))
    .pipe(inlinesource({
      compress: false,
      rootpath: path.normalize(tmpDir),
    }))
    .pipe(dest(tmpDir));
}

function gzipHtml() {
  return src(path.posix.join(tmpDir, index.html))
    .pipe(gzip({
      skipGrowingFiles: true, // TODO: What happens if we try to deflate non-gzip?
      append: true,
    }))
    .pipe(dest(path.posix.dirname(index.html_gz)))
    .pipe(through2.obj(function (dst, _, cb) {
      fs.stat(dst.history[0], function (err, stat) {
        if (err) {
          return cb(err);
        }
        console.log([
          `Gzip results for ${dst.basename}`,
          `  input: ${_humanFileSize(stat.size, 1)} output: ${_humanFileSize(dst.stat.size, 1)}`
        ].join('\n'));
        cb();
      });
    }));
}

// function copyHtmlToDest() {
//   return src(path.posix.normalize(path.posix.join(tmpDir, index.html)))
//     .pipe(dest(path.dirname(index.html_dst)));
// }

const minifyAll = parallel(buildSass, minifyJs, minifyHtml);

exports.clean = clean;
exports.default = exports.build = series(clean, minifyAll, inlineHtml, gzipHtml);

function _dev(minify, doLintJs) {
  // Add sourcemaps for dev
  uglifyIncludeSourceMaps = true;

  const server = gls.new([serverScript, '--port', `${serverPort}`]);
  server.start();

  let minifyTasks = minifyAll;
  if (!minify) {
    // Still have to convert sass to css but don't minify it
    sassConfig.outputStyle = 'nested';
    // mock js and html minify tasks by coping to tmpDir
    minifyTasks = parallel(
      buildSass,
      function copyJs () { return src(index.js).pipe(dest(tmpDir)); },
      function copyHTML() { return src(index.html).pipe(dest(tmpDir)); }
    );
  }

  const seriesPipeline = [
    minifyTasks,
    //inlineHtml,
    function reloadServer(icb) {
      server.notify({ path: 'index.html' });
      icb();
    }
  ];

  if (doLintJs) {
    seriesPipeline.unshift(lintJs);
  }

  // Watch source files
  watch(
    [
      index.html,
      index.js,
      index.scss,
      './*.scss',
      '.eslintrc.js',
    ],
    { ignoreInitial: false },
    series.apply(series, seriesPipeline)
  );

  // Watch for changes in the server script
  watch(serverScript, function reloadServer(icb) {
    server.start();
    icb();
  });
  // Open server URL
  childProcess.exec(`${start} http://127.0.0.1:${serverPort}`);
}

exports.dev = series(clean, function watchesAndServer(cb) {
  _dev(true, true);
  cb();
});

exports.dev_no_min = series(clean, function watchesAndServerNoMinify(cb) {
  _dev(false, true);
  cb();
});
