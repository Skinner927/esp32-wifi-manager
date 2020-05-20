// This file is run after the entire document has loaded.

// Polyfill for querySelector(':scope
/* scopeQuerySelectorShim.js
*
* Copyright (C) 2015 Larry Davis
* All rights reserved.
*
* This software may be modified and distributed under the terms
* of the BSD license.  See the LICENSE file for details.
*
* https://github.com/lazd/scopedQuerySelectorShim Commit fe982db on Jun 27, 2015
*/
/* eslint-disable */
!function(){if(!HTMLElement.prototype.querySelectorAll)throw new Error("rootedQuerySelectorAll: This polyfill can only be used with browsers that support querySelectorAll");var e=document.createElement("div");function t(t,l){var o=t[l];t[l]=function(t){var l,i=!1,c=!1;if(t.match(r)){t=t.replace(r,""),this.parentNode||(e.appendChild(this),c=!0);var n=this.parentNode;return this.id||(this.id="rootedQuerySelector_id_"+(new Date).getTime(),i=!0),l=o.call(n,"#"+this.id+" "+t),i&&(this.id=""),c&&e.removeChild(this),l}return o.call(this,t)}}try{e.querySelectorAll(":scope *")}catch(e){var r=/^\s*:scope/gi;t(HTMLElement.prototype,"querySelector"),t(HTMLElement.prototype,"querySelectorAll")}}();
/* eslint-enable */

/*
 *  Copyright 2012-2013 (c) Pierre Duquesne <stackp@online.fr>
 *  Licensed under the New BSD License.
 *  https://github.com/stackp/promisejs
 *  https://github.com/stackp/promisejs/commit/a993d396c167152fa27a96a1ed2b243e946bc662
 *
 *  Renamed to Later; removed AJAX Stuff; changed how it's exported
 */
/* eslint-disable */
var laterContainer = {};
(function(exports) {

    function Later() {
        this._callbacks = [];
    }

    Later.prototype.then = function(func, context) {
        var p;
        if (this._isdone) {
            p = func.apply(context, this.result);
        } else {
            p = new Later();
            this._callbacks.push(function () {
                var res = func.apply(context, arguments);
                if (res && typeof res.then === 'function')
                    res.then(p.done, p);
            });
        }
        return p;
    };

    Later.prototype.done = function() {
        this.result = arguments;
        this._isdone = true;
        for (var i = 0; i < this._callbacks.length; i++) {
            this._callbacks[i].apply(null, arguments);
        }
        this._callbacks = [];
    };

    function join(promises) {
        var p = new Later();
        var results = [];

        if (!promises || !promises.length) {
            p.done(results);
            return p;
        }

        var numdone = 0;
        var total = promises.length;

        function notifier(i) {
            return function() {
                numdone += 1;
                results[i] = Array.prototype.slice.call(arguments);
                if (numdone === total) {
                    p.done(results);
                }
            };
        }

        for (var i = 0; i < total; i++) {
            promises[i].then(notifier(i));
        }

        return p;
    }

    function chain(funcs, args) {
        var p = new Later();
        if (funcs.length === 0) {
            p.done.apply(p, args);
        } else {
            funcs[0].apply(null, args).then(function() {
                funcs.splice(0, 1);
                chain(funcs, arguments).then(function() {
                    p.done.apply(p, arguments);
                });
            });
        }
        return p;
    }

    Later.join = join;
    Later.chain = chain;

    exports.Later = Later;
})(laterContainer);
/* eslint-enable */

(function wifiManagerMain() {
  'use strict';

  var Later = laterContainer.Later;

  Later.fin = function Later_fin() {
    var p = new Later();
    p.done.apply(p, arguments);
    return p;
  };

  // Display errors with `fatalError('message')` and clear
  // with `fatalError.clear()`.
  var $fatalError = document.getElementById('error-bar');
  function _fatalErrorClear() {
    $fatalError.innerText = '';
    $fatalError.style.display = 'none';
  }
  function fatalError(message) {
    if (message) {
      $fatalError.innerText = message;
      $fatalError.style.display = 'block';
    } else {
      _fatalErrorClear();
    }
  }
  fatalError.clear = _fatalErrorClear;

  /**
   * Create an AJAX request
   * @param {object|string} config Config object or URL string
   * @param {string} config.url URL to send request to.
   * @param {string} [config.method='GET'] GET POST DELETE PUT etc.
   * @param {object} [config.headers] Key:value params to send. Headers are
   *  used instead of JSON because it's easier to parse on the server.
   * @param {boolean} [config.isJSON=true] Set to false to get text back.
   * @param {Number} [config.timeout=10000] Time to wait before timing out in ms.
   * @returns {Later} Promise with results: promise(err, data)
   */
  function ajax(config) {
    var defer = new Later();
    if (typeof config === 'string') {
      config = { url: config };
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
    if (!(config.timeout >= 0)) {
      config.timeout = 10000;
    }

    // Cache buster
    var url = config.url
      + (config.url.indexOf('?') === -1 ? '?' : '&')
      + '_t=' + (new Date()).getTime();

    var xhr = new XMLHttpRequest();
    xhr.open(config.method, url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    if (config.headers) {
      Object.keys(config.headers).forEach(function (key) {
        // Not sure if I need encodeURI but let's be safe
        xhr.setRequestHeader(key, encodeURIComponent(config.headers[key]));
      });
    }

    var timeoutId = null;
    if (config.timeout) {
      timeoutId = setTimeout(function() {
        defer.done('Request timed out', null);
        timeoutId = null;
      }, config.timeout);
    }

    xhr.onerror = xhr.onabort = function () {
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
      defer.done(xhr.responseText || 'HTTP Error ' + xhr.status, null);
    };

    xhr.onload = function () {
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
      if (xhr.status !== 200) {
        xhr.onerror();
        return;
      }

      var data = null;
      try {
        data = config.isJSON ? JSON.parse(xhr.responseText) : xhr.responseText;
      } catch (e) {
        console.log('Error converting response to JSON', e, xhr.responseText);
        xhr.onerror();
        return;
      }
      defer.done(null, data);
    };

    xhr.send(null);
    return defer;
  }

  // slideUp, slideDown
  // https://w3bits.com/javascript-slidetoggle/
  var slideDuration = 250;
  function slideOut(target) { // slideUp
    var defer = new Later();
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

    var fn = onExit[target.id];
    if (fn) {
      fn(target);
    }

    window.setTimeout(function () {
      target.style.display = 'none';
      target.style.removeProperty('height');
      target.style.removeProperty('padding-top');
      target.style.removeProperty('padding-bottom');
      target.style.removeProperty('margin-top');
      target.style.removeProperty('margin-bottom');
      target.style.removeProperty('overflow');
      target.style.removeProperty('transition-duration');
      target.style.removeProperty('transition-property');
      defer.done(null, null);
    }, slideDuration);
    return defer;
  }

  function slideIn(target) { // slideDown
    var defer = new Later();
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
    target.style.transitionProperty = 'height, margin, padding';
    target.style.transitionDuration = slideDuration + 'ms';
    target.style.height = height + 'px';
    target.style.removeProperty('padding-top');
    target.style.removeProperty('padding-bottom');
    target.style.removeProperty('margin-top');
    target.style.removeProperty('margin-bottom');
    window.setTimeout(function () {
      target.style.removeProperty('height');
      target.style.removeProperty('overflow');
      target.style.removeProperty('transition-duration');
      target.style.removeProperty('transition-property');
      var fn = onEnter[target.id];
      if (fn) {
        fn(target);
      }
      defer.done(null, null);
    }, slideDuration);
    return defer;
  }

  function sectionShow(section) {
    if (!section) { return Later.fin('Invalid Section', null);}
    // Close all
    var steps = [];
    Object.keys($section).forEach(function (key) {
      if ($section[key] !== section) {
        steps.push(slideOut($section[key]));
      }
    });
    // Open the specified
    steps.push(slideIn(section));
    return Later.join(steps);
  }

  function rssiClassName(rssi) {
    if (rssi >= -60) {
      return 'w0';
    } else if (rssi >= -67) {
      return 'w1';
    } else if (rssi >= -75) {
      return 'w2';
    }
    return 'w3';
  }

  //////////////////////////////////////////////////////
  // MAIN

  // Root views
  var $section = {
    loading: document.getElementById('loading'),
    wifi: document.getElementById('wifi'),
    connect: document.getElementById('connect'),
    settings: document.getElementById('settings'),
  };
  $section.HOME = $section.wifi;

  // Store all app state here instead of random globals
  var state = {
    apList: [],
    selectedSSID: '',
    refreshAPInterval: null,
    checkStatusInterval: null,
    // Stores functions that will return a tuple of key and value
    settingValueGetters: [],
    refreshApInterval: null,
  };

  // When a section with a matching ID is entered, the corresponding
  // function will be called
  var onEnter = {};
  onEnter[$section.wifi.id] = function() {
    startRefreshAP();
  };

  // When a section with a matching ID is exited, the corresponding
  // function will be called
  var onExit = {};
  onEnter[$section.wifi.id] = function() {
    stopRefreshAP();
  };

  ////////////////////
  // APIs

  /**
   * Pull down settings and build the form
   * @returns {Later} (error, numberOfSettings)
   */
  function reloadSettings() {
    var defer = new Later();
    fatalError.clear();
    ajax('/settings.json').then(function (err, settings) {
      // Clear
      var $panel = document.getElementById('settings-form-body');
      $panel.innerHTML = '';
      state.settingValueGetters = [];

      if (err) {
        fatalError('Error building settings config');
        return defer.done('Error building settings config', 0);
      }
      if (!Array.isArray(settings)) {
        fatalError('Invalid settings');
        return defer.done('Invalid settings', 0);
      }
      if (settings.length < 1) {
        return defer.done(null, 0); // No settings (but not an error)
      }

      // Convert settings to dict
      // state.cleanSettings = settings.reduce(function (obj, setting) {
      //   obj[setting.key] = setting;
      //   return obj;
      // }, {});

      // Build the settings controls. We do this here and not in
      // reloadSettings() because settings can never change.
      settings.forEach(function (setting) {
        var settingId = 'user-setting-' + setting.key;

        // Add a label first
        var lbl = document.createElement('label');
        lbl.setAttribute('for', settingId);
        lbl.innerHTML = setting.label || '';
        $panel.appendChild(lbl);

        var $container = document.createElement('p');
        $panel.appendChild($container);

        // Create based on type
        switch (setting.type) {
          case 'select':
            var drop = document.createElement('select');
            $container.appendChild(drop);
            drop.value = setting.value;
            drop.id = settingId;
            drop.name = setting.key;

            // Add all options
            setting.options.split('\n').forEach(function (pair) {
              var parts = pair.split('\t');
              var opt = document.createElement('option');
              opt.value = parts[0];
              opt.text = parts[1];
              drop.appendChild(opt);
            });

            state.settingValueGetters.push(function getSelectVal() {
              return [setting.key, drop.value || null];
            });
            break;
          case 'radio':
          case 'checkbox':
            var box = document.createElement('div');
            box.classList.add('user-setting-radio');
            $container.appendChild(box);

            var options = setting.options.split('\n').map(function (pair, i) {
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

              // Space
              div.appendChild(document.createTextNode(' '));

              var lbl = document.createElement('label');
              lbl.setAttribute('for', settingId + '-' + i);
              lbl.innerHTML = parts[1];
              div.appendChild(lbl);

              return radio;
            });

            state.settingValueGetters.push(function getRadioVal() {
              // could be radio or checkbox
              var checked = options
                .filter(function (opt) {
                  return opt.checked;
                })
                .map(function (opt) {
                  return opt.value;
                })
                .filter(function (val, i, arr) {
                  return arr.indexOf(val) === i;
                });
              checked = checked.join('\t');
              return [setting.key, checked || null];
            });
            break;
          case 'textarea':
            var ta = document.createElement('textarea');
            ta.id = settingId;
            ta.name = setting.key;
            ta.setAttribute('maxlength', setting.size);
            $container.appendChild(ta);
            state.settingValueGetters.push(function getTextareaVal() {
              return [setting.key, ta.value || null];
            });
            break;
          default:
            var input = document.createElement('input');
            input.type = setting.type;
            input.id = settingId;
            input.name = setting.key;
            input.setAttribute('maxlength', setting.size);
            $container.appendChild(input);
            state.settingValueGetters.push(function getDefaultVal() {
              return [setting.key, input.value || null];
            });
            break;
        }
      });
      // No errors
      defer.done(null, settings.length);
    });
    return defer;
  }

  function refreshAP() {
    return ajax('/ap.json')
      .then(function(err, data) {
        if (err || !data) {
          return Later.fin(err || 'No AP data', null);
        }
        var $aps = document.getElementById('wifi-aps');

        data
          .sort(function(a, b) {
            // Closer to 0 means better signal
            return b.rssi - a.rssi;
          });

        data.push({
          ssid: 'Other...',
          isManual: true,
        });

        data.forEach(function(ap) {
          var $row = document.createElement('div');
          $row.addEventListener('click', function() {
            connectToAP(ap);
          });

          var $apSpan = document.createElement('span');
          $apSpan.innerText = ap.ssid;
          $row.appendChild($apSpan);

          if (!ap.isManual) {
            var $rssi = document.createElement('span');
            $rssi.setAttribute('class', rssiClassName(ap.rssi) + ' pr');
            $row.appendChild($rssi);

            if (ap.auth) {
              var $padlock = document.createElement('span');
              $padlock.setAttribute('class', 'pw pr');
              $row.appendChild($padlock);
            }
          }

          $aps.appendChild($row);
        });

        console.log('sorted', data);
      });
  }
  function stopRefreshAP() {
    if (state.refreshApInterval) {
      clearInterval(state.refreshApInterval);
    }
    state.refreshApInterval = null;
  }
  function startRefreshAP() {
    stopRefreshAP();
    state.refreshApInterval = setInterval(refreshAP, 2800);
  }

  ////////////////////
  // Event Handlers
  document.getElementById('settings-form')
    .addEventListener('submit', function(e) {
      if (e.preventDefault) {
        e.preventDefault();
      }
      fatalError.clear();

      // Build results
      var results = state.settingValueGetters
        .map(function(fn) {
          return fn();
        })
        .reduce(function(obj, val) {
          obj[val[0]] = val[1];
          return obj;
        }, {});
      console.log(results);

      // Show the loading screen and send results
      Later
        .join([
          sectionShow($section.loading),
          ajax({
            url: '/settings.json',
            method: 'POST',
            headers: results,
            isJSON: false,
          })
        ])
        .then(function(results) {
          var error = results[1][0];
          var data = results[1][1];

          if (error) {
            fatalError('Error updating settings');
          } else if (data) {
            fatalError(data);
          }
          sectionShow($section.HOME);
        });
      return false; // no submit
    });
  document.getElementById('settings-form-cancel')
    .addEventListener('click', sectionShow.bind(null, $section.HOME));
  document.getElementById('settings-btn')
    .addEventListener('click', sectionShow.bind(null, $section.settings));

  // When an AP is clicked in the WiFi connection row
  function connectToAP(ap) {
    var $ssid = document.getElementById('connect-ssid');
    var $pass = document.getElementById('connect-pass');
    var $passGroup = document.getElementById('connect-pass-group');

    var hidePass = !ap.isManual && !ap.auth;

    // Reset the form
    $ssid.value = ap.isManual ? '' : ap.ssid;
    $pass.value = '';
    $passGroup.style.display = hidePass ? 'none' : 'block';

    if (ap.isManual) {
      $ssid.removeAttribute('readonly');
    } else {
      $ssid.setAttribute('readonly', 'readonly');
    }

    sectionShow($section.connect)
      .then(function() {
        if (hidePass && $ssid.value) {
          // Trigger a submit if there's no password to enter
          connectFormSubmit();
        }
      });
  }
  function connectFormSubmit() {
    console.log('FORM SUBMIT');
  }
  document.getElementById('connect-form')
    .addEventListener('submit', function(e) {
      if (e.preventDefault) {
        e.preventDefault();
      }
      connectFormSubmit();
      return false; // no submit
    });
  document.getElementById('connect-form-cancel')
    .addEventListener('click', sectionShow.bind(null, $section.HOME));



  ////////////////////
  // Main

  // First show the loading section
  $section.loading.style.display = 'block';
  refreshAP();

  // Initial call to see if we can have settings
  reloadSettings()
    .then(function initSettingCtrls(error, success) {
      if (!error && success > 0) {
        var settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) { settingsBtn.style.display = 'block'; }
      }
      // Show home page
      sectionShow($section.HOME);
    });
})();
