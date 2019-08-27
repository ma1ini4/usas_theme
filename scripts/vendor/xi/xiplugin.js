
//version 1.1.0.2
(function (window, undefined) {

    var _xiPlugin = function () {
    }, XiRequestPacket = function (m, a) {
        this.MerchantGuid = m;
        this.AccessToken = a;
        this.FormFields = [];
    }, XiField = function (n, t, v) {
        this.Name = n;
        this.IsToTokenize = t;
        this.Value = v;
    }, XiResponsePacket = function () {
        this.HasPassed = true;
        this.Message = null;
    };

    window.$XIPlugin = _xiPlugin;

    XiRequestPacket.prototype.addField = function (field) {
        this.FormFields.push(field);
    };


    _xiPlugin.fn = _xiPlugin.prototype = {
        version: "1.1.0"
    };

    _xiPlugin.extend = function (obj, prop) {
        if (!prop) { prop = obj; obj = this; }
        for (var i in prop) obj[i] = prop[i];
        return obj;
    };

    _xiPlugin.extend({
        createJSRequestPacket: function (m, a) {
            return new XiRequestPacket(m, a);
        },
        createField: function (n, v, t) {
            return new XiField(n, v, t);
        }
    });

    _xiPlugin.extend({
        isArray: function (obj) {
            return Object.prototype.toString.call(obj) === '[object Array]';
        }
    });


    _xiPlugin.extend({
        //Remove any ProtoType
        convert: function (data) {
            var con = new Object();
            for (var key in data) {
                if (data.hasOwnProperty(key)) {
                    con[key] = data[key];
                }
            }
            return con;
        },
        jsonSerialize: function (data) {
            if (!data) {
                return null;
            }
            if (typeof data === "string") {
                return data;
            }
            return JSON.stringify(data);
        },
        each: function (object, callback) {
            var name, i = 0,
                   length = object.length,
                   isObj = length === undefined;
            if (isObj) {
                for (name in object) {
                    if (callback.call(object[name], name, object[name]) === false) {
                        break;
                    }
                }
            }
            else {

                for (var value = object[0];
                      i < length && callback.call(value, i, value) !== false ; value = object[++i]) { }
            }

            return object;
        },
        param: function (a) {
            var s = [],
            add = function (key, value) {
                s[s.length] = encodeURIComponent(key) + "=" + encodeURIComponent(value);
            };

            for (var prefix in a) {
                buildParams(prefix, a[prefix], add);
            }

            return s.join("&");
        },
        find: function (id) {
            var ctrl = document.getElementById(id);
            if (ctrl)
                return ctrl;
            ctrl = document.getElementsByName(id);
            if (ctrl.length > 0)
                return ctrl[0];
            return null;
        },
        addEventHandler: function (elem, event, func) {
            if (elem) {
                if (elem.addEventListener)
                    elem.addEventListener(event, func, false);
                else if (elem.attachEvent)
                    elem.attachEvent("on" + event, func);
            }
        }
    });

    function buildParams(prefix, obj, add) {
        if (_xiPlugin.isArray(obj)) {
            _xiPlugin.each(obj, function (i, v) {
                buildParams(prefix + "[" + (typeof v === "object" || _xiPlugin.isArray(v) ? i : "") + "]", v, add);

            });
        }
        else if (typeof obj === "object") {
            _xiPlugin.each(obj, function (k, v) {
                buildParams(prefix + "[" + k + "]", v, add);
            });
        }
        else {
            add(prefix, obj);
        }
    }

    function onClickEvent(sender, fields) {
        if (fields) {
            _xiPlugin.each(ajaxSettings.data.FormFields, function (i, v) {
                var ctrl = _xiPlugin.find(v.Name);
                v.Value = ctrl ? ctrl.value : "";
            });
        }
        //disale button click
        if (sender)
            sender.disabled = true;

        _xiPlugin.ajax(ajaxSettings);
    }

    function onSubmitEvent(sender, fields) {
        if (fields) {
            _xiPlugin.each(submitSettings.data.FormFields, function (i, v) {
                var ctrl = _xiPlugin.find(v.Name);
                v.Value = ctrl ? ctrl.value : "";
            });
        }
        _xiPlugin.submit(submitSettings);
    }

    _xiPlugin.extend({
        ajaxSettings: {
            type: "POST",
            async: true,
            data: null,
            success: null,
            error: null,
            url: null,
            crossDomain: true,
            actionButtonId: null,
            beforeSend: null,
            complete: null,
            validation: null,
            intcp3DSecure: null
        },
        submitSettings: {
            data: null,
            url: null,
            actionButtonId: null,
            validation: null
        },
        submitInit: function(submitOptions) {
            submitSettings = _xiPlugin.extend(_xiPlugin.submitSettings, submitOptions);

            if (submitOptions.actionButtonId) {
                var buttonRef = _xiPlugin.find(submitOptions.actionButtonId);
                _xiPlugin.addEventHandler(buttonRef, "click", function() { onSubmitEvent(this, submitOptions.data.FormFields); });
            }
        },
        init: function(ajaxOptions) {
            ajaxSettings = _xiPlugin.extend(_xiPlugin.ajaxSettings, ajaxOptions);

            if (ajaxSettings.actionButtonId) {
                var buttonRef = _xiPlugin.find(ajaxSettings.actionButtonId);
                _xiPlugin.addEventHandler(buttonRef, "click", function() { onClickEvent(this, ajaxSettings.data.FormFields); });
            }
        },
        submit: function(submitOptions) {
            submitSettings = _xiPlugin.extend(_xiPlugin.submitSettings, submitOptions);

            var isValid = true;
            if (submitSettings.validation)
                isValid = submitSettings.validation.apply(undefined, [submitSettings.data]);
            if (!isValid) return;

            var form = prepSubmitForm(submitSettings);
            try {
                form.submit();
            } catch (e) {

            }
        },
        ajax: function(ajaxOptions) {

            function done(xhr, clientFunction, response) {
                if (xhr && clientFunction && response)
                    clientFunction(response);
            }

            ajaxSettings = _xiPlugin.extend(_xiPlugin.ajaxSettings, ajaxOptions);

            var isValid = true;
            if (ajaxSettings.validation)
                isValid = ajaxSettings.validation.apply(undefined, [ajaxSettings.data]);

            if (!isValid) {
                if (ajaxSettings.actionButtonId) {
                    var sender = _xiPlugin.find(ajaxSettings.actionButtonId);
                    if (sender) sender.disabled = false;
                }

                return;
            }

            if (ajaxSettings.data) {
                ajaxSettings.data = _xiPlugin.param(ajaxSettings.data);
            }
            if (ajaxSettings.type == "GET") {
                ajaxSettings.url = ajaxSettings.url + "?" + ajaxSettings.data;
                ajaxSettings.data = null;
            }


            headers = {};
            if (!ajaxSettings.crossDomain)
                headers["x-requested-with"] = "XMLHttpRequest";
            headers["accept"] = "application/json";
            if (ajaxOptions.data)
                headers["Content-Type"] = "application/x-www-form-urlencoded";

            var transport = prepAjaxTransport(ajaxSettings);
            try {
                if (ajaxSettings.beforeSend) {
                    ajaxSettings.beforeSend.call();
                }
                transport.send(headers, done);
            } catch (e) {
                done(null, ajaxSettings.error);
            }
        },
        tokenize: function(ajaxOptions) {
            _xiPlugin.ajax(ajaxOptions);
        }
    });

    function prepAjaxTransport(s) {
        var callback;

        return {
            send: function (headers, done) {
                var xhr = s.XHRequest(headers);
                xhr.onload = function () {
                    if (xhr.responseText) {
                        var result = JSON.parse(xhr.responseText);
                        //3DS Check
                        if (result.UrlsAndPayloadsFor3Ds && s.intcp3DSecure) {
                            s.intcp3DSecure(result);
                        }
                        else if (result.UrlsAndPayloadsFor3Ds) {
                            var form = window.document.createElement("form");
                            form.setAttribute('method', "post");
                            form.setAttribute('action', result.UrlsAndPayloadsFor3Ds.CentinelAcsUrl);
                            window.document.body.appendChild(form);

                            var centinelPayload = document.createElement('input');
                            centinelPayload.type = 'hidden';
                            centinelPayload.name = 'PaReq';
                            centinelPayload.value = result.UrlsAndPayloadsFor3Ds.CentinelPayload;
                            form.appendChild(centinelPayload);

                            var centinelTermUrl = document.createElement('input');
                            centinelTermUrl.type = 'hidden';
                            centinelTermUrl.name = 'TermUrl';
                            centinelTermUrl.value = result.UrlsAndPayloadsFor3Ds.CentinelTermUrl;
                            form.appendChild(centinelTermUrl);

                            var paymetricPayload = document.createElement('input');
                            paymetricPayload.type = 'hidden';
                            paymetricPayload.name = 'MD';
                            paymetricPayload.value = result.UrlsAndPayloadsFor3Ds.PaymetricPayload;
                            form.appendChild(paymetricPayload);

                            form.submit();
                        }
                        else {
                            done(xhr, result.HasPassed ? s.success : s.error, result);
                        }
                    }
                    if (s.complete) {
                        s.complete.call();
                    }
                };
                xhr.onerror = function () {
                    s.error(xhr);
                    if (s.ajaxSettings.complete) {
                        s.ajaxSettings.complete.call();
                    }
                };
                xhr.onprogress = function () { };
                xhr.send(s.data);
            }
        }
    };

    function prepSubmitForm(s) {

        return {
            submit: function () {
                var form = window.document.createElement("form");
                form.setAttribute('method', "post");
                form.setAttribute('action', s.url);

                var inputCtrl = {};
                if (s.data)
                    inputCtrl["formdata"] = _xiPlugin.jsonSerialize(s.data);

                _xiPlugin.each(inputCtrl, function (key, value) {
                    var i = window.document.createElement("input");
                    i.setAttribute('type', "hidden");
                    i.setAttribute('name', key);
                    i.setAttribute('value', value);
                    form.appendChild(i);
                });

                window.document.body.appendChild(form);
                form.submit();

            }
        }
    };

    _xiPlugin.ajaxSettings.XHRequest = function (headers) {
        var xmlhttp = false;
        //TODO ClearUp :IE8/9 use only
        var is_IE = window.XDomainRequest ? true : false;
        if (is_IE) {
            xmlhttp = new window.XDomainRequest();
            xmlhttp.open(_xiPlugin.ajaxSettings.type, _xiPlugin.ajaxSettings.url);
        }
        else {
            xmlhttp = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
            xmlhttp.open(_xiPlugin.ajaxSettings.type, _xiPlugin.ajaxSettings.url, _xiPlugin.ajaxSettings.async);
            try {
                _xiPlugin.each(headers, function (key, value) { xmlhttp.setRequestHeader(key, value); });
            } catch (_) {
            }

        }
        return xmlhttp;
    };
    //TODO ClearUp :IE8/9 use only(can be remove when not supported)
    //_xiPlugin.ajaxSettings.IsOldIE() function is used
    _xiPlugin.ajaxSettings.IsOldIE = function () {
        return window.XDomainRequest ? true : false;
    };

})(window);
