// Source: https://github.com/JosephClay/sass-inline-image/blob/0dc0f71e003619512858f90347fb50e7dc89198b/index.js
// Couldn't install as an NPM package

// Credit to:
// https://coderwall.com/p/fhgu_q/inlining-images-with-gulp-sass
var fs    = require('fs');
var path  = require('path');
var types = require('node-sass').types;

var svg = function(buffer) {
    var svg = buffer.toString()
        .replace(/\n/g, '')
        .replace(/\r/g, '')
        .replace(/\#/g, '%23')
        .replace(/\"/g, "'");

    return '"data:image/svg+xml;utf8,' + svg + '"';
};

var img = function(buffer, ext) {
    return '"data:image/' + ext + ';base64,' + buffer.toString('base64') + '"';
};

module.exports = function(options) {
    options = options || {};

    var base = options.base || process.cwd();
    return {
        'inline-image($file)': function(file) {
            // we want to file relative to the base
            var relativePath = './' + file.getValue();
            var filePath = path.resolve(base, relativePath);

            // get the file ext
            var ext = filePath.split('.').pop();

            // read the file
            var data = fs.readFileSync(filePath);

            // CHANGED FROM: new Buffer(data)
            var buffer = Buffer.from(data);
            var str = ext === 'svg' ? svg(buffer, ext) : img(buffer, ext);
            return types.String(str);
        }
    };
};
