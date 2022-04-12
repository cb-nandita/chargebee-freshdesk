$(document).ready( function() {
  app.initialized()
      .then(function(_client) {
        var client = _client;
        client.events.on('app.activated',
          function() {
              client.data.get('contact')
                  .then(function(data) {
                      var inst = pluginInit.call(window, jQuery);
                      inst.execute(data.contact.email);
                  })
                  .catch(function(e) {
                      console.log('Exception - ', e);
                  });
      });
  });
});
var pluginInit = function($) {
  'use strict';
  var requestTimeOut = null;
  var _path = '/freshplug/ticket?is_freshdesk=true&customer_email=';
  var cbPath, detailsUrl;
  var window = this;

  function _execute(email) {
      var _env = {
          site: 'app',
          hostSuffix: '.predev38.in',
          protocol: "https"
      };
      cbPath = _env.protocol + "://" + _env.site + _env.hostSuffix;
      detailsUrl = cbPath + _path + encodeURIComponent(email);
      $('#request-error').hide();
      loadSummary();
  }

  function loadSummary() {
      __iframeUtil.embed(detailsUrl).load({
          addIframe: function(iframe) {
              addErrorHandler(iframe);
              $('#iframeplaceholder').html(iframe);
          },
          onLoad: function(iframe, width, height) {
              clearTimeout(requestTimeOut);
              var h = parseInt(height);
              iframe.setAttribute('style', 'border:none;overflow:hidden;width:100%;height:' + height + 'px;');
              $('#iframeplaceholder').attr('style', 'height:' + h + 'px;');
              $('.app-details').attr('style', 'height:' + h + 'px;');
          },
          onSuccess: function() {
              clearTimeout(requestTimeOut);
              $('#iframeplaceholder').removeAttr('style').slideDown(200);
              $('.cb-widget--box').hide();

          }
      });
  }


  function addErrorHandler() {
      requestTimeOut && clearTimeout(requestTimeOut);
      requestTimeOut = setTimeout(function() {
          $('#iframeplaceholder').empty();
          $('#error').hide();
          handleCBWidget($('#request-error'));
      }, 60000);
  }

  function handleCBWidget($el) {
      $('.cb-widget--box').show();
      $('.cb-widget--box').find('.cb-widget--error').hide();
      $el.show();
      if ($el.attr('id').indexOf('error') !== -1) {
          $('#iframeplaceholder').empty();
      }
  }

  var __iframeUtil = (function() {
      var CbEmbed = {};
      var intervalId,
          lastHash,
          attachedCallback,
          lastAttachedCallback;

      var handleCallback = function() {
          var scopeArgs = arguments[0];
          var allCallbacks = arguments[1];
          var callBacks = arguments[2];
          var argumentsArray = Array.prototype.slice.call(arguments, 0);
          var args = argumentsArray.slice(3, argumentsArray.length);
          if (allCallbacks.hasOwnProperty(callBacks)) {
              allCallbacks[callBacks].apply(scopeArgs, args);
          }
      };

      var receiveMessage = function(callback, iframe) {
          if (window['postMessage']) {
              if (callback) {
                  attachedCallback = function(e) {
                      if (typeof e.origin === null && e.source === iframe.contentWindow) {
                          return false;
                      }
                      callback(e);
                  };
              }
              if (window['addEventListener']) {
                  if (typeof lastAttachedCallback !== 'undefined') {
                      window.removeEventListener('message', lastAttachedCallback, false);
                  }
                  window[callback ? 'addEventListener' : 'removeEventListener']('message', attachedCallback, false);
              } else {
                  if (typeof lastAttachedCallback !== 'undefined') {
                      window['detachEvent']('onmessage', lastAttachedCallback);
                  }
                  window[callback ? 'attachEvent' : 'detachEvent']('onmessage', attachedCallback);
              }
              lastAttachedCallback = attachedCallback;
          } else {
              intervalId && clearInterval(intervalId);
              intervalId = null;
              if (callback) {
                  intervalId = setInterval(function() {
                      var hash = document.location.hash,
                          re = /^#?\d+&/;
                      if (hash !== lastHash && re.test(hash)) {
                          lastHash = hash;
                          callback({
                              data: hash.replace(re, '')
                          });
                      }
                  }, 100);
              }
          }
      };

      var defSettings = {
          'url': null,
          'src': null,
          'iframe': null,
          'allowedCallbacks': ['addIframe', 'onLoad', 'onResize', 'onSubmit', 'onSuccess', 'onCancel', 'onError'],
          'userSettings': {}
      };

      function isJsonString(str) {
          try {
              JSON.parse(str);
          } catch (e) {
              return false;
          }
          return true;
      }

      var messageChannel = function(message) {
          if (isJsonString(message.data)) {
              var messObj = $.parseJSON(message.data);
              if (messObj) {
                  var d = defSettings;
                  if (messObj.hasOwnProperty('onload')) {
                      handleCallback(d.userSettings, CbEmbed.callbacks, d.allowedCallbacks[1], d.iframe, parseInt(messObj['width']), parseInt(messObj['height']));
                  } else if (messObj.hasOwnProperty('resize')) {
                      handleCallback(d.userSettings, CbEmbed.callbacks, d.allowedCallbacks[2], d.iframe, parseInt(messObj['width']), parseInt(messObj['height']));
                  } else if (messObj.hasOwnProperty('onSubmit')) {
                      handleCallback(d.userSettings, CbEmbed.callbacks, d.allowedCallbacks[3], d.iframe);
                  } else if (messObj.hasOwnProperty('success')) {
                      handleCallback(d.userSettings, CbEmbed.callbacks, d.allowedCallbacks[4], d.iframe, messObj['successMessage']);
                  } else if (messObj.hasOwnProperty('cancel')) {
                      handleCallback(d.userSettings, CbEmbed.callbacks, d.allowedCallbacks[5], d.iframe);
                  } else if (messObj.hasOwnProperty('error')) {
                      handleCallback(d.userSettings, CbEmbed.callbacks, d.allowedCallbacks[6], d.iframe, messObj['errorObject']);
                  }
              }
          }

      };

      var EmbedFrame = function(url) {
          this.url = url;
          validate(this.url);
      };

      EmbedFrame.prototype.load = function(settings) {
          if (settings) {
              defSettings.userSettings = settings;
          }
          this.callbacks = processCallback(settings);
          execute(this.url, this.callbacks);
      };

      var processCallback = function(settings) {
          var callbacks = {};
          if (typeof settings === 'undefined') {
              return callbacks;
          }
          var allowedCallback = defSettings.allowedCallbacks;
          for (var i = 0; i < allowedCallback.length; i++) {
              if (typeof settings[allowedCallback[i]] === 'function') {
                  callbacks[allowedCallback[i]] = settings[allowedCallback[i]];
              }
          }
          return callbacks;
      };

      var execute = function(url, callbacks) {
          defSettings.url = url;
          CbEmbed.callbacks = callbacks;
          _execute();
      };
      var _execute = function() {
          var iframe = document.createElement('iframe');
          receiveMessage(messageChannel, iframe);
          iframe.setAttribute('sandbox', 'allow-scripts allow-popups allow-forms allow-same-origin');
          iframe.setAttribute('scrolling', 'no');
          iframe.setAttribute('style', 'visibility:hidden;');
          defSettings.src = defSettings.url + '#' + encodeURIComponent(document.location.href);
          iframe.setAttribute('src', defSettings.src);
          defSettings.iframe = iframe;
          handleCallback(defSettings.userSettings, CbEmbed.callbacks, defSettings.allowedCallbacks[0], iframe);
      };
      var validate = function(url) {
          if (typeof url === 'undefined') {
              throw new Error("url is required parameter");
          }
      };
      return {
          embed: function(url) {
              return new EmbedFrame(url);
          }
      };
  })();
  return {
    execute : _execute
  };
};
