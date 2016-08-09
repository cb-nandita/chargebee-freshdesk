(function() {
    return {
        initialize: function() {
            (function($) {
                // please enter your site name here.
                var widget = '<div class="widget clearfix inactive" id="cb-plugin-box"> <h3>Subscription Details</h3> <div class="content"> <span id="loading" class="sloading loading-small loading-block loading-align" style="display: none"></span> <div class="cb-widget--box"> <div class="cb-widget--error" id="error" style="display: none;"> <h6>Sorry, we\'ve got nothing!</h6> <hr>Looks like your Chargebee account doesn\'t have a customer with this email address.</div> <div class="cb-widget--error" id="request-error" style="display: none;">Sorry, something went wrong. Please try after some time.</div> <div class="cb-widget--error" id="role-error" style="display: none;">You don\'t have permission to view these details. If you\'d like to view the details, request your admin for access.</div> <div class="cb-widget--login" style="display: none;" id="login-container">To view the details, you must first log into your Chargebee account. <br> <br> <a class="cb-widget--button" id="login-trigger" href="" target="_blank">Log into Chargebee</a> </div> </div> <div id="iframeplaceholder"> </div> <div id="authentication" style="display: none;"> </div> </div> </div>';
                var siteName = '';
                var email = domHelper.ticket.getContactInfo().user.email;
                var sandbox = false;
                var detailsCardLoaded = false;
                var requestTimeOut = null;
                var noDetails = false;
                var placeWidget = '{{iparam.add_widget}}';
                var _sumPath = '/freshplug/details_card?customer_email=';
                var _authPath = '/freshplug/session_active_auth';
                var cbPath, detailsUrl, checkUrl, attempt = 0;
                $(document).ready(function() {
                    addWidgetToDom(placeWidget, jQuery(widget));
                    $('#cb-plugin-box').parents('.widget').removeClass('widget');
                    $('#cb-plugin-box').on('click', function(e) {
                        if ($(e.target).prop('tagName') !== 'H3') {
                            return;
                        }
                        $('#request-error,#role-error').hide();
                        if ($(this).hasClass('inactive')) {
                            $(this).find('H3').attr('style', 'padding-bottom:0px;');
                            if (detailsCardLoaded) {
                                if (noDetails) {
                                    $('#error').slideDown(200);
                                } else {
                                    $('#iframeplaceholder').slideDown(200);
                                }
                            } else {
                                $('#iframeplaceholder').empty();
                                _execute();
                            }
                        } else {
                            $(this).find('H3').removeAttr('style');
                            $('#iframeplaceholder').hide();
                            $('#error').hide();
                            $('#login-container').hide();
                        }
                    });
                    setTimeout(function() {
                        $('#cb-plugin-box').find('H3').trigger('click');
                    }, 100);
                });

                function _execute() {
                    var _env = {
                        site: 'app',
                        hostSuffix: '.chargebee.com',
                        protocol: "https"
                    };
                    $('#loading').show();
                    cbPath = _env.protocol + "://" + _env.site + _env.hostSuffix;
                    detailsUrl = cbPath + _sumPath + encodeURIComponent(email);
                    if (typeof sandbox !== 'undefined' && sandbox) {
                        detailsUrl += '&sandbox=' + sandbox;
                    }
                    checkUrl = cbPath + _authPath;
                    __iframeUtil.embed(checkUrl).load({
                        addIframe: function(iframe) {
                            addErrorHandler(iframe);
                            $('#authentication').html(iframe);
                        },
                        onLoad: function(iframe, width, height) {
                            clearTimeout(requestTimeOut);
                            iframe.setAttribute('style', 'border:none;overflow:hidden;width:100%;height:' + height + 'px;');
                        },
                        onSuccess: function(iframe, message) {
                            clearTimeout(requestTimeOut);
                            if (message !== 'role_failure') {
                                loadSummary();
                            } else {
                                $('#loading').hide();
                                handleCBWidget($('#role-error'));
                            }
                        },
                        onCancel: function(iframe) {
                            clearTimeout(requestTimeOut);
                            login();
                        }
                    });
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
                        },
                        onSuccess: function(iframe, message) {
                            clearTimeout(requestTimeOut);
                            $('#iframeplaceholder').removeAttr('style').slideDown(200);
                            $('.cb-widget--box').hide();
                            $('#loading').hide();
                            detailsCardLoaded = true;
                        },
                        onCancel: function(iframe) {
                            clearTimeout(requestTimeOut);
                            $('#loading').hide();
                            handleCBWidget($('#error'));
                            detailsCardLoaded = true;
                            noDetails = true;
                        }
                    });
                }
                var poll = 0;

                function checkLogin() {
                    __iframeUtil.embed(checkUrl).load({
                        addIframe: function(iframe) {
                            addErrorHandler(iframe);
                            $('#authentication').html(iframe).hide();
                        },
                        onLoad: function(iframe, width, height) {
                            clearTimeout(requestTimeOut);
                        },
                        onSuccess: function(iframe, message) {
                            clearTimeout(requestTimeOut);
                            if (message !== 'role_failure') {
                                loadSummary();
                            } else {
                                $('#loading').hide();
                                handleCBWidget($('#role-error'));
                            }
                        },
                        onCancel: function(iframe) {
                            if (poll > 20) {
                                $('#loading').hide();
                                poll = 0;
                                $('#login-trigger').off('click');
                                login();
                            } else {
                                poll++;
                                setTimeout(function() {
                                    checkLogin();
                                }, 1000);
                            }
                        }
                    });
                }

                function login() {
                    $('#loading').hide();
                    $('#login-trigger').attr('href', cbPath + "/login");
                    handleCBWidget($('#login-container'));
                    $('#login-trigger').on('click', function() {
                        $('#login-container').hide();
                        $('#loading').show();
                        setTimeout(function() {
                            checkLogin();
                        }, 5000);
                        $('#loading').show();
                    });
                }

                function addErrorHandler(iframe) {
                    requestTimeOut != null ? clearTimeout(requestTimeOut) : void 0;
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
                    if (($el.attr('id')).indexOf('error') !== -1) {
                        $('#iframeplaceholder').empty();
                    }
                }

                function addWidgetToDom(placeWidget, $widget) {
                    switch (placeWidget) {
                        case 'Place underneath the Requestor Info section':
                            appPlaceholder.ticket.belowRequestorInfo($widget);
                            break;
                        case 'Place at the bottom of the right panel':
                            appPlaceholder.ticket.sidebar($widget);
                            break;
                        default:
                            appPlaceholder.ticket.sidebar($widget);
                    }
                }

                var __iframeUtil = (function() {
                    var CbEmbed = {};
                    var intervalId,
                        lastHash,
                        attachedCallback,
                        lastAttachedCallback,
                        window = this;

                    handleCallback = function() {
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
                                    if ((typeof e.origin === null && e.source === iframe.contentWindow)) {
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

                    var messageChannel = function(message) {
                        var messObj = $.parseJSON(message.data);
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
            }).call(window, jQuery);
        }
    }
})();
