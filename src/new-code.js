// This file is run after the entire document has loaded.
(function wifiManagerMain(global) {

  // Display errors
  var fatalError = (function() {
    var $fatalError = document.getElementById("error-bar");

    function fatalErrorClear() {
      $fatalError.innerText = "";
      $fatalError.style.display = 'none';
    }

    function fatalError(message) {
      if (message) {
        $fatalError.innerText = message;
        $fatalError.style.display = 'block';
      } else {
        fatalErrorClear();
      }
    }
    fatalError.clear = fatalErrorClear;

    return fatalError;
  })();

  /**
   * Create an AJAX request
   * @param {object|string} config Config object or URL string
   * @param {string} config.url URL to send request to.
   * @param {string} [config.method='GET'] GET POST DELETE PUT etc.
   * @param {object} [config.headers] Key:value params to send. Headers are
   *  used instead of JSON because it's easier.
   * @param {boolean} [config.isJSON=true] Set to false to get text back.
   * @param {function} callback Callback with results: callback(err, data)
   */
  function ajax(config, callback) {
    if (typeof config === 'string') {
      config = {url: config};
    }
    if (!config || !config.url) {
      return;
    }
    if (!config.method) {
      config.method = 'GET';
    }
    if (typeof config.isJSON !== 'boolean') {
      config.isJSON = true;
    }

    // Cache buster
    var url = config.url
      + (config.url.indexOf('?') === -1 ? '?' : '&')
      + '_t=' + (new Date()).getTime();

    var xhr = new XMLHttpRequest();
    xhr.open(config.method, url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    if (config.headers) {
      Object.keys(config.headers).forEach(function(key) {
        // Not sure if I need encodeURI
        xhr.setRequestHeader(key, config.headers[key]);
      });
    }
    if (callback) {
      xhr.onerror = xhr.onabort = function() {
        callback(xhr.responseText || "HTTP Error " + xhr.status, null);
      };

      xhr.onload = function() {
        if (xhr.status !== 200) {
          xhr.onerror();
          return;
        }

        var data = null;
        try {
          data = config.isJSON ? JSON.parse(xhr.responseText) : xhr.responseText;
        } catch(e) {
          console.log('Error converting response to JSON', e, xhr.responseText);
          xhr.onerror();
          return;
        }
        callback(null, data);
      };
    }
    xhr.send(null);
  }

  ajax('/settings.json', function(err, settings) {
    console.log('SETTINGS', settings);
  });



})(this);
