// This file is run after the entire document has loaded.
(function wifiManagerMain(global) {

  // Display errors
  var fatalError = (function() {
    var $fatalError = document.getElementById('error-bar');

    function fatalErrorClear() {
      $fatalError.innerText = '';
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
        xhr.setRequestHeader(key, encodeURIComponent(config.headers[key]));
      });
    }
    if (callback) {
      xhr.onerror = xhr.onabort = function() {
        callback(xhr.responseText || 'HTTP Error ' + xhr.status, null);
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

  // slideUp, slideDown, slideToggle
  // https://w3bits.com/javascript-slidetoggle/
  var slideDuration = 250;
  function slideOut (target) { // slideUp
    target.style.transitionProperty = 'height, margin, padding';
    target.style.transitionDuration = slideDuration + 'ms';
    target.style.boxSizing = 'border-box';
    target.style.height = target.offsetHeight + 'px';
    target.offsetHeight;
    target.style.overflow = 'hidden';
    target.style.height = 0;
    target.style.paddingTop = 0;
    target.style.paddingBottom = 0;
    target.style.marginTop = 0;
    target.style.marginBottom = 0;
    window.setTimeout(function() {
      target.style.display = 'none';
      target.style.removeProperty('height');
      target.style.removeProperty('padding-top');
      target.style.removeProperty('padding-bottom');
      target.style.removeProperty('margin-top');
      target.style.removeProperty('margin-bottom');
      target.style.removeProperty('overflow');
      target.style.removeProperty('transition-duration');
      target.style.removeProperty('transition-property');
    }, slideDuration);
  }

  function slideIn(target) { // slideDown
    target.style.removeProperty('display');
    var display = window.getComputedStyle(target).display;
    if (display === 'none') {
      display = 'block';
    }

    target.style.display = display;
    var height = target.offsetHeight;
    target.style.overflow = 'hidden';
    target.style.height = 0;
    target.style.paddingTop = 0;
    target.style.paddingBottom = 0;
    target.style.marginTop = 0;
    target.style.marginBottom = 0;
    target.offsetHeight;
    target.style.boxSizing = 'border-box';
    target.style.transitionProperty = "height, margin, padding";
    target.style.transitionDuration = slideDuration + 'ms';
    target.style.height = height + 'px';
    target.style.removeProperty('padding-top');
    target.style.removeProperty('padding-bottom');
    target.style.removeProperty('margin-top');
    target.style.removeProperty('margin-bottom');
    window.setTimeout(function() {
      target.style.removeProperty('height');
      target.style.removeProperty('overflow');
      target.style.removeProperty('transition-duration');
      target.style.removeProperty('transition-property');
    }, slideDuration);
  }

  // Polyfill for querySelector(':scope
  // https://github.com/lazd/scopedQuerySelectorShim Commit 97168ea on Oct 26, 2018
  !function(){if(!HTMLElement.prototype.querySelectorAll)throw new Error("rootedQuerySelectorAll: This polyfill can only be used with browsers that support querySelectorAll");var e=document.createElement("div");try{e.querySelectorAll(":scope *")}catch(l){var t=/^\s*:scope/gi;function r(r,l){var o=r[l];r[l]=function(r){var l,i=!1,c=!1;if(r.match(t)){r=r.replace(t,""),this.parentNode||(e.appendChild(this),c=!0);var n=this.parentNode;return this.id||(this.id="rootedQuerySelector_id_"+(new Date).getTime(),i=!0),l=o.call(n,"#"+this.id+" "+r),i&&(this.id=""),c&&e.removeChild(this),l}return o.call(this,r)}}r(HTMLElement.prototype,"querySelector"),r(HTMLElement.prototype,"querySelectorAll")}}();

  //////////////////////////////////////////////////////
  // MAIN

  // Root views
  var $views = {
    wifi: document.getElementById('wifi'),
    settings: document.getElementById('user-settings'),
  };

  // Build settings
  var cleanSettings = {};
  var settingElements = null;
  function reloadSettings(success) {
    ajax('/settings.json', function(err, settings) {
      if (err) {
        fatalError('Error building config');
        return;
      }
      if (!Array.isArray(settings)) {
        fatalError('Invalid Settings');
        return;
      }
      // Convert settings to dict
      cleanSettings = settings.reduce(function(obj, setting) {
        obj[setting.key] = setting;
        return obj;
      }, {});

      if (settingElements) {
        // TODO: If not null refresh their values
      }

      // No errors
      success();
    });
  }

  reloadSettings(function initSettingCtrls() {
    var $settingsBtn = document.getElementById('settings-btn');
    var $panel = document.getElementById('user-settings-panel');

    // Open settings panel on "Settings" button click
    $settingsBtn.addEventListener('click', function() {
      slideOut($views.wifi);
      slideIn($views.settings);
      // TODO: refill settings
      //activeSettings = JSON.parse(JSON.stringify(originalSettings));
    });

    // Close button
    $views.settings
      .querySelector(':scope input[value="Cancel"]')
      .addEventListener('click', function() {
        slideOut($views.settings);
        slideIn($views.wifi);
      });

    // Build the settings controls. We do this here and not in
    // reloadSettings() because settings can never change.
    Object.keys(cleanSettings).forEach(function(key) {
      var setting = cleanSettings[key];
      var settingId = 'user-setting-' + setting.key;

      // Add a label first
      var lbl = document.createElement('label');
      lbl.setAttribute('class', 'h2');
      lbl.setAttribute('for', settingId);
      lbl.innerHTML = setting.label || '';
      $panel.appendChild(lbl);

      // Start the section element
      var $section = document.createElement('section');
      $panel.appendChild($section);

      var $container = document.createElement('div');
      $container.setAttribute('class', 'ape user-setting-container');
      $section.appendChild($container);

      // Create based on type
      switch (setting.type) {
        case 'select':
          var drop = document.createElement('select');
          $container.appendChild(drop);
          drop.value = setting.value;
          drop.id = settingId;
          drop.name = setting.key;

          // Add all options
          setting.options.split('\n').forEach(function(pair) {
            var parts = pair.split('\t');
            var opt = document.createElement('option');
            opt.value = parts[0];
            opt.text = parts[1];
            drop.appendChild(opt);
          });
          break;
        case 'radio':
        case 'checkbox':
          var box = document.createElement('div');
          box.classList.add('user-setting-radio');
          $container.appendChild(box);

          setting.options.split('\n').forEach(function(pair, i) {
            var parts = pair.split('\t');
            var div = document.createElement('div');
            div.style.clear = 'both';
            box.appendChild(div);

            var radio = document.createElement('input');
            radio.type = setting.type;
            radio.id = settingId + '-' + i;
            radio.name = setting.key;
            radio.value = parts[0];
            div.appendChild(radio);

            var lbl = document.createElement('label');
            lbl.setAttribute('for', settingId + '-' + i);
            lbl.innerHTML = parts[1];
            div.appendChild(lbl);
          });
          break;
        case 'textarea':
          var ta = document.createElement('textarea');
          ta.id =  settingId;
          ta.name = setting.key;
          ta.setAttribute('maxlength', setting.size);
          $container.appendChild(ta);
          break;
        default:
          var input = document.createElement('input');
          input.type = setting.type;
          input.id =  settingId;
          input.name = setting.key;
          input.setAttribute('maxlength', setting.size);
          $container.appendChild(input);
          break;
      }
    });


    // Show the settings button
    $settingsBtn.style.display = 'block';
  });

  // No errors? Let's show the app
  $views.wifi.style.display = 'block';
})(this);
