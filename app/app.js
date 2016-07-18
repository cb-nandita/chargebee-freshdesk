(function() {
    return {
        initialize: function() {
            (function() {
                var lazyLoad = function(src) {
                    var s = document.createElement('script');
                    s.type = 'text/javascript';
                    s.async = true;
                    s.src = ('https:' == document.location.protocol ? 'https://' : 'http://') + src;
                    var q = document.getElementsByTagName('script')[0];
                    q.parentNode.insertBefore(s, q);
                };
                lazyLoad('js.chargebee.com/v1/chargebee.js');
            })();
            (function($) {
                // please enter your site name here.
                var widget = '<div class="widget clearfix inactive" id="cb-plugin-box"> <h3>Subscription Details<p class="cb-powered-by">powered by Chargebee</p></h3> <div class="content"> <span id="loading" class="sloading loading-small loading-block loading-align" style="display: none"></span> <div class="cb-widget--box"> <div class="cb-widget--error" id="error" style="display: none;"> <h6>Sorry, we\'ve got nothing!</h6> <hr>Looks like your Chargebee account doesn\'t have a customer with this email address.</div> <div class="cb-widget--error" id="request-error" style="display: none;">Sorry, something went wrong. Please try after some time.</div> <div class="cb-widget--error" id="role-error" style="display: none;">You don\'t have permission to view these details. If you\'d like to view the details, request your admin for access.</div> <div class="cb-widget--login" style="display: none;" id="login-container">To view the details, you must first log into your Chargebee account. <br> <br> <a class="cb-widget--button" id="login-trigger" href="" target="_blank">Log into Chargebee</a> </div> </div> <div id="iframeplaceholder"> </div> <div id="authentication" style="display: none;"> </div> </div> </div>';
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
                                isChargebeeJsPresent();
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

                function isChargebeeJsPresent() {
                    if ((typeof ChargeBee === 'undefined' || typeof siteName === 'undefined') && attempt < 100) {
                        attempt++;
                        setTimeout(isChargebeeJsPresent, 500);
                    } else {
                        _execute();
                    }
                }

                function _execute() {
                    if (typeof ChargeBee === 'undefined') {
                        throw new Error("chargebee.js missing. please include chargebee.js to use this plug.");
                    }
                    ChargeBee.configure({
                        site: siteName !== '' ? siteName : 'app'
                    });
                    if (!ChargeBee._env.hasOwnProperty('site') || typeof ChargeBee._env.site === "undefined" || ChargeBee._env.site === '') {
                        throw new Error("Chargebee site is not configured site is not configured");
                    }
                    $('#loading').show();
                    cbPath = ChargeBee._env.protocol + "://" + ChargeBee._env.site + ChargeBee._env.hostSuffix;
                    detailsUrl = cbPath + _sumPath + encodeURIComponent(email);
                    if (typeof sandbox !== 'undefined' && sandbox) {
                        detailsUrl += '&sandbox=' + sandbox;
                    }
                    checkUrl = cbPath + _authPath;
                    ChargeBee.embed(checkUrl, ChargeBee._env.site).load({
                        hostSuffix: ChargeBee._env.hostSuffix,
                        protocol: ChargeBee._env.protocol,
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
                    ChargeBee.embed(detailsUrl, ChargeBee._env.site).load({
                        hostSuffix: ChargeBee._env.hostSuffix,
                        protocol: ChargeBee._env.protocol,
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
                    ChargeBee.embed(checkUrl, ChargeBee._env.site).load({
                        hostSuffix: ChargeBee._env.hostSuffix,
                        protocol: ChargeBee._env.protocol,
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
                            console.log("onCancel");
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
            }).call(window, jQuery);
        }
    }
})();
