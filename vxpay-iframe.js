/** @version 1.3.37 */
/*jshint strict:false */

/**
 * ModalboxPayment - JS Api for Payment
 * - needs to be compressed after each change to this file
 *
 * @author ph
 */
var ModalboxPayment = function (urls, window, options, config, events) {
	this.window = window;
	this.transferToken = '';
	// token to initialize session - either from parameter, URL or as access token
	this.redirectToken = options.tt || this._getGet('redirect_token') || options.at;
	this.defaultSuccessUrl = 'http://www.visit-x.net/';

	this.setUrls(urls);
	this.setOptions(options);
	this.setConfig(config);
	this.setEvents(events);

	this.iframeId = 'modalboxiframe';
	this.overlayId = this.iframeId + 'Overlay';
	this.spinnerId = this.iframeId + 'Spinner';

	// save viewport scale on start
	this.view = '';
	this.iframeReady = false;
	this.ready = false;
	this.loaded = false;
	this.visible = false;
	this.window.ModalboxPayment = this;
	this.tabTarget = '_blank';

	// explicitly trigger new tab feature?
	if (typeof options.enableTab !== 'undefined') {
		this.useTab = options.enableTab && this._supportsTabs();
	}

	// enforce a new tab instead of modalbox
	if (typeof options.forceTab !== 'undefined') {
		this.useTab = options.forceTab;
	}

	// set target for new tab
	if (typeof options.tabTarget !== 'undefined') {
		this.tabTarget = options.tabTarget;
	}

	this._responseHandlers = {};
	this._storedValues = {};
	this._hooks = {};
	this._registerListener();
};

/********************** Internal setter methods  **************************/

ModalboxPayment.prototype.setOptions = function (options) {
	this._setOptions(options);
	this._setOptionsLazy(options);
	this._setOptionsApi(options);
};

ModalboxPayment.prototype._setOptions = function (options) {
	this.options = this.options || {};

	this.options.pfm = options.pfm || this.options.pfm;
	this.options.s = options.host || this.options.s;
	this.options.w = options.w || this.options.w;
	this.options.ws = options.ws || this.options.ws;
	this.options.wt = options.wt || this.options.wt;
	this.options.option = options.option || this.options.option;
	this.options.pc = options.pc || this.options.pc;
	this.options.lang = options.lang || this.options.lang;
	this.options.environment = options.environment || this.options.environment;
	this.options.flow = options.flow || this.options.flow;
};

ModalboxPayment.prototype._setOptionsLazy = function (options) {
	this.optionsLazy = this.optionsLazy || {};

	this.optionsLazy.ref = options.ref || this.window.document.referrer;
	this.optionsLazy.ruri = options.ruri || this.window.location.href;
	this.optionsLazy.surl = options.surl || this.window.location.href;
	this.optionsLazy.aurl = options.agbUrl;
	this.optionsLazy.purl = this.window.location.href;
};

ModalboxPayment.prototype._setOptionsApi = function (options) {
	this.optionsApi = this.optionsApi || {};

	this.optionsApi.disableJump = options.disableJump || false;
};

ModalboxPayment.prototype.setConfig = function (config) {
	this.modConfig = config || {};
	this.modConfig.parentInFrame = this._isParentInFrame();
};

ModalboxPayment.prototype.setUrls = function (urls) {
	this.successUrl = this.defaultSuccessUrl;

	// only baseUrl?
	if (typeof urls === 'string') {
		this.baseUrl = urls;
	} else if (typeof urls === 'object') { /* we have a list of URLS? */
		if (urls.baseUrl) {
			this.baseUrl = urls.baseUrl;
		}
		this.successUrl = urls.successUrl || this.successUrl;
	}
};

ModalboxPayment.prototype.setEvents = function (events) {
	// events
	if (typeof events === 'object') {
		if (typeof events.onClose === 'function') {
			this.on('close', events.onClose);
		}
		if (typeof events.onSuccess === 'function') {
			this.on('success', events.onSuccess);
		}
		if (typeof events.onReady === 'function') {
			this.on('ready', events.onReady);
		}
		if (typeof events.onInit === 'function') {
			this.on('init', events.onInit);
		}
		if (typeof events.onAfterShow === 'function') {
			this.on('afterShow', events.onAfterShow);
		}
		if (typeof events.onAfterHide === 'function') {
			this.on('afterHide', events.onAfterHide);
		}
	}

	// set defaults
	this._setDefaultEvents();
};

ModalboxPayment.prototype._setDefaultEvents = function () {
	if (typeof this.onAfterShow !== 'function') {
		this.on('afterShow', function (event) {
			// store orig. overflow and set new
			event.modalbox._storedValues.parentBodyOverflow = this.window.document.body.style.overflow;
			event.modalbox.window.document.body.style.overflow = 'hidden';

			// scroll parent to top - for mobiles
			event.modalbox._scrollTo(1);
		});
	}
	if (typeof this.onAfterHide !== 'function') {
		this.on('afterHide', function (event) {
			// restore overflow on body
			if (typeof event.modalbox._storedValues.parentBodyOverflow !== 'undefined') {
				event.modalbox.window.document.body.style.overflow = event.modalbox._storedValues.parentBodyOverflow;
			}
		});
	}
};

/**
 * postMessage handler
 * @param evt
 */
ModalboxPayment.prototype._messageHandler = function (evt) {
	var res = null;
	var modalbox = ModalboxPayment;

	// serialized data?
	var msgObject = modalbox._parseMessage(evt.data);

	// ignore on invalid message
	if (!msgObject) {
		return;
	}

	// on closing modalbox
	if (msgObject.type === 'modalbox-iframe-close') {
		modalbox.hide();

		// onClose callback
		modalbox._trigger('close', msgObject.data);
	}
	else if (msgObject.type === 'modalbox-iframe-ready') {
		modalbox.iframeReady = true;
		modalbox._removeSpinner();
		modalbox._maximizeIframe();

		// init callback
		modalbox._trigger('init', {
			modalbox: modalbox
		});
	}
	else if (msgObject.type === 'modalbox-content-loaded') {
		modalbox.loaded = true;
		if (modalbox.visible) {
			modalbox._initSession();

			if (!modalbox.tab) {
				modalbox._postMessage(JSON.stringify({
					type: 'modalbox-is-visible'
				}));
			}
		}

		// trigger
		modalbox._trigger('loaded', msgObject.data);
	}
	// on finished paytour
	else if (msgObject.type === 'modalbox-success') {
		//modalbox._log('Paytour success');
		if (typeof modalbox.onSuccess === 'function') {
			modalbox._trigger('success', msgObject.data);
			modalbox.hide();
		} else {
			// update options
			modalbox.options.s = typeof msgObject.data === 'object' ? msgObject.data.hostId : modalbox.options.s;

			modalbox.window.location.href = modalbox._generateSuccessUrl();
			modalbox.hide();
		}
	}
	else if (msgObject.type === 'modalbox-view-ready') {
		if (!modalbox.tab) {
			modalbox._postMessage(JSON.stringify({
				type: 'modalbox-is-visible'
			}));
		}
	}
	// process action response
	else if ((res = msgObject.type.match(/^modalbox-response-(.*)/))) {
		if (typeof modalbox._responseHandlers[res[1]] !== 'undefined') {
			if (typeof modalbox._responseHandlers[res[1]].resolve === 'function') {
				modalbox._responseHandlers[res[1]].resolve(msgObject.data);
			}
			modalbox._responseHandlers[res[1]] = null;
		}
	}
	else if (msgObject.type === 'modalbox-scrollto') {
		modalbox._scrollTo(msgObject.data.top);
	}
	else if (msgObject.type === 'modalbox-hook') {
		modalbox._trigger(msgObject.data.hook, msgObject.data);
	}
	// catch transfer_token
	else if ((res = msgObject.type.match(/^redirect:(.*)/))) {
		modalbox.window.location.href = res[1];
	}
	// catch transfer_token
	else if ((res = msgObject.type.match(/^transfer_token:(.*)/))) {
		modalbox.transferToken = res[1];

		var opts = modalbox.optionsLazy;
		opts.type = 'modalbox-additional-info';

		// send additional parameters back
		modalbox._postMessage(JSON.stringify(opts));

		// paytour is ready with session
		modalbox.ready = true;
		modalbox._trigger('ready', {
			modalbox: modalbox
		});
	}
};

ModalboxPayment.prototype._parseMessage = function (evtData) {
	var obj = {};

	// we don't have valid message format?
	if (typeof evtData !== 'string') {
		return;
	}

	try {
		// parse event data to JSON object
		var json = JSON.parse(evtData);

		if (typeof json === 'object') {
			obj.type = json.type;
			obj.data = json.data;
		} else {
			obj.type = evtData;
			obj.data = null;
		}
	} catch (e) {
		obj.type = evtData;
		obj.data = null;
	}

	return (typeof obj.type === 'string') ? obj : null;
};

ModalboxPayment.prototype._updateState = function() {
	if (this.ready) {
		if(!this.iframe && (!this.tab || this.tab.closed === true)) {
			this.ready = false;
		}
	}
	if (this.loaded) {
		if(!this.iframe && (!this.tab || this.tab.closed === true)) {
			this.loaded = false;
		}
	}
};

// register event listener
ModalboxPayment.prototype._registerListener = function () {
	this._addEvent('message', this.window, this._messageHandler);
};

// restore Modalbox after previous extern redirect
ModalboxPayment.prototype._restore = function (flow, view) {
	this.useTab = false;
	this.view = view;
	this.options.flow = flow;
	this._initIframe();
	this._show();
};

ModalboxPayment.prototype._showIframe = function (path) {
	var that = this;
	this._showOverlay();
	this._setParentViewport();

	if (!this.iframeReady) {
		this._initIframe();
		this._showSpinner();
		window.setTimeout(function() {
			that._showIframe(path);
		}, 1000);
		return false;
	} else if(typeof path !== 'undefined' && path !== '') {
		this._changeRoute('/' + path);
	} else {
		this._changeRoute(undefined);
	}
	this.visible = true;
	this._initSession();
	this.iframe.style.display = 'block';
};

ModalboxPayment.prototype._showTab = function (path) {
	var that = this;
	this.view = path;
	this._openTab();

	this.visible = true;
	this._initSession();

	this.on('ready', function() {
		if(typeof path !== 'undefined' && path !== '') {
			that._changeRoute('/' + path);
		} else {
			that._changeRoute(undefined);
		}
		return true;
	}, 'append');
};

ModalboxPayment.prototype._show = function (path) {
	if (!this.useTab) {
		this._showIframe(path);
	} else {
		this._showTab(path);
	}

	this._trigger('afterShow', {
		modalbox: this
	});
};

ModalboxPayment.prototype._changeRoute = function (route) {
	this._postMessage(JSON.stringify({
		type: 'modalbox-change-route',
		route: route
	}));
};

ModalboxPayment.prototype._openTab = function () {
	var opts = this.options;
	opts.tt = this.redirectToken;
	opts.sview = this.view;
	opts.lazy = 0;
	opts.surl = this.optionsLazy.surl || this.options.surl;

	// VXPay should replace the current URL?
	if (this.tabTarget === '_top') {
		opts.successUrl = this._generateSuccessUrl();
	}

	// create URL with params
	var url = this._generateUrl(this.baseUrl, opts, this.modConfig);

	this.tab = this.window.open(url, this.tabTarget);
	this.contentWindow = this.tab;
};

ModalboxPayment.prototype._initIframe = function () {
	if (!this.iframe) {
		var opts = this.options;
		opts.tt = this.redirectToken;
		opts.sview = this.view;
		opts.lazy = 1;

		// create URL with params
		var url = this._generateUrl(this.baseUrl, opts, this.modConfig);

		this.iframe = this._createIframe(url);

		this.window.document.body.appendChild(this.iframe);
		this.contentWindow = this.iframe.contentWindow;
	}
};

ModalboxPayment.prototype._createIframe = function (url) {
	var ifrm = this.window.document.createElement('iframe');
	ifrm.src = url;
	ifrm.id = this.iframeId;
	ifrm.style.border = 'none';
	ifrm.style.width = '675px';
	ifrm.style.height = '740px';
	ifrm.style.top = '5%';
	ifrm.style.left = '50%';
	ifrm.style.marginLeft = '-325px';
	ifrm.style.zIndex = 10001;
	ifrm.style.display = 'none';
	// allow transparent iframe for <= IE8
	ifrm.allowTransparency = 'true';

	if (this._supportsStyleAttr(ifrm, 'maxHeight', '100vh')) {
		ifrm.style.maxHeight = '100vh';
	} else {
		if(this._isMobile()) {
			ifrm.style.maxHeight = this._getClientHeight() + 'px';
		}
	}

	// absolute only for mobile
	if(this._isMobile()) {
		ifrm.style.position = 'absolute';
	} else {
		ifrm.style.position = 'fixed';
	}

	return ifrm;
};

ModalboxPayment.prototype._getClientHeight = function () {
	return window.innerHeight ||
		document.documentElement.clientHeight ||
		document.body.clientHeight;
};

ModalboxPayment.prototype._scrollTo = function (top) {
	try {
		// Mootools FX
		if (typeof Fx !== 'undefined' && typeof Fx.Scroll !== 'undefined') {
			new Fx.Scroll(window, { duration: 500 }).start(0, top);
		}
		// jQuery animation
		else if (typeof jQuery !== 'undefined' && typeof jQuery.Animation !== 'undefined') {
			jQuery('html, body').animate({ scrollTop: top }, 500);
		}
		// default no animation
		else {
			window.scrollTo(0, msgObject.data.top);
		}
	} catch(e) {
	}
};

ModalboxPayment.prototype._supportsStyleAttr = function (elem, attribute, val){
	var supports = false;

	try {
		elem.style[attribute] = val;

		if(elem.style[attribute] === val){
			supports = true;
		}
	} catch(e){}

	return supports;
};

ModalboxPayment.prototype._maximizeIframe = function () {
	if (this.iframe) {
		this.iframe.style.width = '100%';
		this.iframe.style.height = '100%';
		this.iframe.style.left = 0;
		this.iframe.style.top = 0;
		this.iframe.style.marginLeft = 0;
	}
};

ModalboxPayment.prototype._updateOptions = function (options) {
	if (typeof options  === 'object') {
		this._setOptions(options);
	}
};

ModalboxPayment.prototype._createSpinner = function () {
	var div = this.window.document.createElement('div');
	div.id = this.spinnerId;

	div.style.cssText = 'position:  absolute;' +
	'width: 140px;' +
	'height: 140px;' +
	'background: #000;' +
	'-ms-filter: "progid:DXImageTransform.Microsoft.Alpha(Opacity=10)";' +
	'background: rgba(0,0,0,0.9);' +
	'left: 50%;' +
	'top: 50%;' +
	'margin-top: -70px;' +
	'margin-left: -70px;' +
	'opacity: 0.6;' +
	'border-radius: 15px;' +
	'z-index: 100000;';

	var opts = {
		color: '#fff',
		radius:30,
		lines: 17,
		length: 17,
		width: 7,
		hwaccel: true
	};

	if (typeof Spinner !== 'undefined') {
		var spinner = new Spinner(opts).spin(div);
	}
	return div;
};

ModalboxPayment.prototype._createOverlay = function () {
	var div = this.window.document.createElement('div');
	div.id = this.overlayId;
	div.style.display = 'block';
	div.style.opacity = '0.3';
	div.style.background = '#000000';

	/* ie8 opacity */
	div.style.filter = 'alpha(opacity=50)';

	div.style.width = '100%';
	div.style.height = '100%';
	div.style.top = '0';
	div.style.left = '0';
	div.style.zIndex = 10000;

	// cover whole screen
	div.style.position = 'fixed';

	return div;
};

ModalboxPayment.prototype._removeOverlay = function () {
	if (this.overlay) {
		var elem = this.window.document.getElementById(this.overlayId);
		elem.parentNode.removeChild(elem);
		this.overlay = null;
	}
};

ModalboxPayment.prototype._removeSpinner = function () {
	if (this.spinner) {
		var elem = this.window.document.getElementById(this.spinnerId);
		elem.parentNode.removeChild(elem);
		this.spinner = null;
	}
};

ModalboxPayment.prototype._removeIframe = function () {
	if (this.iframe) {
		this.iframe.parentNode.removeChild(this.iframe);
		this.iframe = null;
	}
};

ModalboxPayment.prototype._showSpinner = function () {
	if(!this.spinner) {
		this.spinner = this._createSpinner();
		this.window.document.body.appendChild(this.spinner);
	}
};

ModalboxPayment.prototype._showOverlay = function () {
	if(!this.overlay) {
		this.overlay = this._createOverlay();
		this.window.document.body.appendChild(this.overlay);
	}
};

ModalboxPayment.prototype._getGet = function (sVar) {
	return decodeURI(this.window.location.search.replace(new RegExp('^(?:.*[&\\?]' + encodeURI(sVar).replace(/[\.\+\*]/g, '\\$&') + '(?:\\=([^&]*))?)?.*$', 'i'), '$1'));
};

// cross-browser event registration
ModalboxPayment.prototype._addEvent = function (evnt, elem, func) {
	if (elem.addEventListener) {  // W3C DOM
		elem.addEventListener(evnt, func, false);
	}
	else if (elem.attachEvent) { // IE DOM
		elem.attachEvent('on' + evnt, func);
	}
	else { // No much to do
		elem[evnt] = func;
	}
};

ModalboxPayment.prototype._initSession = function () {
	// init lazy loading session
	this._postMessage(JSON.stringify({
		type: 'modalbox-init-session'
	}));
};

// cross-browser event unregistration
ModalboxPayment.prototype._removeEvent = function (evnt, elem, func) {
	if (elem.removeEventListener) {  // W3C DOM
		elem.removeEventListener(evnt, func, false);
	}
	else if (elem.attachEvent) { // IE DOM
		elem.detachEvent('on' + evnt, func);
	}
	else { // No much to do
		elem[evnt] = null;
	}
};

// sets viewport in the parent
ModalboxPayment.prototype._setParentViewport = function () {
	try {
		// set viewport for parent
		var viewPortTag = document.getElementById('viewport');

		if (!viewPortTag) {
			viewPortTag = document.createElement('meta');
			viewPortTag.id = 'viewport';
			viewPortTag.name = 'viewport';
			this.window.parent.document.getElementsByTagName('head')[0].appendChild(viewPortTag);
		}

		viewPortTag.content = 'width=device-width, minimum-scale=1.0, maximum-scale=1.0, initial-scale=1.0';

		// viewport on gesture for iphones
		if (navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i)) {
			this._addEvent('gesturestart', this.window.document.body, function () {
				viewPortTag.content = 'width=device-width, minimum-scale=0.25, maximum-scale=1.6';
			});
		}
	} catch(e) {
		return false;
	}
};

ModalboxPayment.prototype._restoreParentViewport = function () {
	try {
		var viewport = document.getElementById('viewport');

		if (viewport) {
			viewport.setAttribute('content', 'width=device-width, initial-scale=1');
		}
	} catch (e) {
		return false;
	}
};

ModalboxPayment.prototype._generateUrl = function (baseUrl, params, config) {
	var url = baseUrl;

	// fix url, remove existing hashes
	url = url.replace(/\#.*$/, '');

	// add params
	if (params) {
		var arr = [];
		for (var d in params) {
			if(typeof params[d] !== 'undefined') {
				arr.push(encodeURIComponent(d) + '=' + encodeURIComponent(params[d]));
			}
		}
		url += (url.indexOf('?') >= 0 ? '&' : '?') + arr.join('&');
	}

	// add module config
	if (config) {
		var arr2 = [];
		for (var d2 in config) {
			if(typeof config[d2] !== 'undefined') {
				arr2.push('mc[' + encodeURIComponent(d2) + ']' + '=' + encodeURIComponent(config[d2]));
			}
		}
		url += (url.indexOf('?') >= 0 ? '&' : '?') + arr2.join('&');
	}

	//this._log('modalbox URL length: ' + url.length + ' chars');
	return url;
};

ModalboxPayment.prototype._postMessage = function (message, win, origin) {
	origin = origin ? origin : '*';
	win = win || this.contentWindow;

	win.postMessage(message, origin);
};

ModalboxPayment.prototype._log = function (message) {
	if (typeof console !== 'undefined' && typeof console.log !== 'undefined') {
		console.log(message);
	}
};

ModalboxPayment.prototype._isMobile = function () {
	return (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
};

ModalboxPayment.prototype._supportsTabs = function () {
	return this._isMobile() && !(/IEMobile/i.test(navigator.userAgent));
};

ModalboxPayment.prototype._isParentInFrame = function () {
	try {
		return window.self !== window.top ? 1 : 0;
	} catch (e) {
		return 1;
	}
};

// creates final URL for redirect
ModalboxPayment.prototype._generateSuccessUrl = function () {
	var url = this.successUrl;

	// set hostId
	if (this.options.s) {
		url += (url.indexOf('?') >= 0 ? '&' : '?') + (!this.optionsApi.disableJump ? 'jump=shpprofile&' : '') + 's=' + encodeURIComponent(this.options.s);
	}
	if (this.transferToken) {
		url += (url.indexOf('?') >= 0 ? '&' : '?') + 'transfer_token=' + encodeURIComponent(this.transferToken);
	}
	if (this.options.pfm) {
		url += (url.indexOf('?') >= 0 ? '&' : '?') + 'xpfm=' + encodeURIComponent(this.options.pfm);
	}
	if (this.options.w) {
		url += (url.indexOf('?') >= 0 ? '&' : '?') + 'w=' + encodeURIComponent(this.options.w);
	}
	if (this.options.ws) {
		url += (url.indexOf('?') >= 0 ? '&' : '?') + 'ws=' + encodeURIComponent(this.options.ws);
	}

	return url;
};

/**
 * Sends action to Paytour
 */
ModalboxPayment.prototype._sendAction = function (actionKey, params) {
	if (typeof actionKey === 'string') {
		var that = this;
		that._updateState();

		var objToSend = {
			type: 'modalbox-action-' + actionKey,
			params: params
		};

		var sendCallback = function () {
			try {
				that._postMessage(JSON.stringify(objToSend), that.contentWindow);
			} catch(e) {}
		};

		if (that.ready) {
			sendCallback();
		} else {
			var intSend = null;

			if (that.useTab) {
				that._initIframe();
			}

			intSend = window.setInterval(function () {
				that._initSession();

				if (that.ready) {
					sendCallback();
					window.clearInterval(intSend);
				}
			}, 500);
		}
	}
};

ModalboxPayment.prototype._registerResponseHandler = function (name, resolveCallback) {
	this._responseHandlers[name] = {
		resolve: resolveCallback
	};
};

ModalboxPayment.prototype._trigger = function (event, params) {
	if (typeof event === 'string') {
		var eventName = 'on' + event.charAt(0).toUpperCase() + event.slice(1);

		this._triggerHooks(eventName, params);

		if (typeof this[eventName] === 'function') {
			return this[eventName](params);
		} else if (this._isArray(this[eventName])) {
			var i = this[eventName].length;
			while (i--) {
				var ret = this[eventName][i](params);

				if (ret) {
					this[eventName].splice(i, 1);
				}
			}
		}
	}
};

ModalboxPayment.prototype._triggerHooks = function (eventName, params) {
	if (typeof eventName === 'string' && typeof this._hooks[eventName] !== 'undefined') {
		var hooks = this._hooks[eventName];
		var i = hooks.length;
		while (i--) {
			var ret = hooks[i](params);

			if (ret) {
				this._hooks[eventName].splice(i, 1);
			}
		}
	}
};

ModalboxPayment.prototype._isArray = function(obj) {
	return (typeof obj !== 'undefined' &&
		obj && obj.constructor === Array);
};

/******************* Public methods **************************/

/**
 * Tries to restore Paytour according to the URL params
 * @returns {boolean}
 */
ModalboxPayment.prototype.tryRestore = function () {
	var getParam = this._getGet('showModalbox');
	var vxpOpen = this._getGet('vxpAutoFlow');
	var vxpFlow = this._getGet('vxpFlow');
	var retVal = false;

	if (getParam === '1') {
		this._restore(vxpFlow ? vxpFlow : 'moneycharge', 'wait');
		retVal = true;
	} else if (vxpOpen !== '') {
		var methodName = 'open' + vxpOpen;

		this.useTab = false;
		if (typeof this[methodName] === 'function') {
			this[methodName]();
			retVal = true;
		}
	}

	return retVal;
};

/**
 * Initializes Iframe and adds to DOM
 * @param path
 */
ModalboxPayment.prototype.init = function (path) {
	this.view = path || '';
	if (!this.useTab) {
		this._initIframe();
	}
};


/**
 * Hides Iframe and overlay on the page, restores viewport
 */
ModalboxPayment.prototype.hide = function () {
	this._hideIframe();
	this._hideTab();
};

ModalboxPayment.prototype._hideIframe = function () {
	if (this.iframe && this.visible) {
		this._trigger('afterHide', {
			modalbox: this
		});

		this._restoreParentViewport();
		this._removeOverlay();
		this._removeSpinner();
		this._removeIframe();
		this.visible = false;
		this.iframeReady = false;
	}
};

ModalboxPayment.prototype._hideTab = function () {
	if (this.tab) {
		this.tab.close();

		this._trigger('afterHide', {
			modalbox: this
		});

		this.visible = false;
		this._updateState();

		if (this.iframe) {
			this.iframe.src = this.iframe.src; // hack to reload iframe
			this.contentWindow = this.iframe.contentWindow;
		}
	}
};

/**
 * Sends additional parameters to the Paytour through postMessages
 * @param options
 */
ModalboxPayment.prototype.sendOptions = function (options) {
	if (typeof options  === 'object') {
		var that = this;
		that._updateState();
		that._updateOptions(options);

		var sendCallback = function () {
			try {
				var params = {};
				params.type = 'modalbox-update-params';
				params.options = options;
				that._postMessage(JSON.stringify(params), that.contentWindow);
				that._updateOptions(options);
			} catch(e) {}
		};

		if (that.loaded) {
			sendCallback();
		} else {
			var intSend = null;
			intSend = window.setInterval(function () {
				if (that.loaded) {
					sendCallback();
					window.clearInterval(intSend);
				}
			}, 500);
		}

		if (this.useTab) {
			this.on('loaded', function() {
				sendCallback();
				return true;
			}, 'append');
		}
	}
};

/**
 * Open paytour in MoneyCharge flow and show given route
 *
 * @param {string} route
 * @param {object} options
 */
ModalboxPayment.prototype.openPaytour = function (route, options) {
	var flow = 'moneycharge'; /** TODO: Move into business logic **/
	if (this.options.flow !== flow) {
		this.options.flow = flow;
		var data = {
			flow : this.options.flow
		};

		for (var key in options) {
			if (!options.hasOwnProperty(key)) continue;
			data[key] = options[key];
		}

		this.sendOptions(data);
		this._show(route ? route : 'payment');
	} else {
		this._show(route ? route : 'payment');
	}
};

/**
 * Opens Modalbox Paytour with preselected paytype
 *
 * @param {string} route
 * @param {object} options
 */
ModalboxPayment.prototype.openPaytourByPaytype = function (paytype, options) {
	this.options.flow = 'moneycharge'; /** TODO: Move into business logic **/
	var data = {
		flow    : this.options.flow,
		paytype : paytype
	};

	for (var key in options) {
		if (!options.hasOwnProperty(key)) continue;
		data[key] = options[key];
	}

	this.sendOptions(data);
	this._show('');
};

/**
 * Opens Modalbox Paytour with limit Workflow
 *
 * @param {object} options
 */
ModalboxPayment.prototype.openLimitPaytour = function (options) {
	this.options.flow = 'limit';
	var data = {
		flow    : this.options.flow,
		paytype : ''
	};

	for (var key in options) {
		if (!options.hasOwnProperty(key)) continue;
		data[key] = options[key];
	}

	this.sendOptions(data);
	this._show('');
};

/**
 * Opens Modalbox Paytour in Oneclickpayment Mode
 *
 * @param {object} options
 */
ModalboxPayment.prototype.openOneClickPaytour = function (options) {
	this.options.flow = 'oneclick';
	var data = {
		flow    : this.options.flow,
		paytype : ''
	};

	for (var key in options) {
		if (!options.hasOwnProperty(key)) continue;
		data[key] = options[key];
	}

	this.sendOptions(data);
	this._show('');
};

/**
 * Open Paytour in abo flow
 *
 * @param {object} options
 */
ModalboxPayment.prototype.openAboPaytour = function (options) {
	this.options.flow = 'vipabo';
	var data = {
		flow : this.options.flow
	};

	for (var key in options) {
		if (!options.hasOwnProperty(key)) continue;
		data[key] = options[key];
	}

	this.sendOptions(data);
	this._show('abo');
};

/**
 * Open Paytour in VXTV abo flow
 *
 * @param {object} options
 */
ModalboxPayment.prototype.openVXTVAbo = function (options) {
	this.options.flow = 'vxtvabo';
	var data = {
		flow : this.options.flow
	};

	for (var key in options) {
		if (!options.hasOwnProperty(key)) continue;
		data[key] = options[key];
	}

	this.sendOptions(data);
	this._show('abo');
};

/**
 * Returns list of active Abos from backend
 */
ModalboxPayment.prototype.getActiveAbos = function (resolve) {
	var key = 'getactiveabos';
	this._registerResponseHandler(key, resolve);
	this._sendAction(key);
};

/**
 * Returns the current account balance
 */
ModalboxPayment.prototype.getBalance = function (resolve) {
	var key = 'getbalance';
	this._registerResponseHandler(key, resolve);
	this._sendAction(key);
};

/**
 * Open Paytour in Creditcard change flow
 *
 * @param {object} options
 */
ModalboxPayment.prototype.openChangeCreditcard = function (options) {
	this.options.flow = 'changecc';
	var data = {
		flow    : this.options.flow,
		paytype : 'CC'
	};

	for (var key in options) {
		if (!options.hasOwnProperty(key)) continue;
		data[key] = options[key];
	}

	this.sendOptions(data);
	this._show();
};

/**
 * Open Paytour in Lastschrift change flow
 *
 * @param {object} options
 * @param {boolean} isAbo
 */
ModalboxPayment.prototype.openChangeLastschrift = function (options) {
	this.options.flow = 'changels';
	var data = {
		flow    : this.options.flow,
		paytype : 'LS'
	};

	for (var key in options) {
		if (!options.hasOwnProperty(key)) continue;
		data[key] = options[key];
	}

	this.sendOptions(data);
	this._show();
};

/**
 * Open Settings Flow
 *
 * @param {object} options
 */
ModalboxPayment.prototype.openSettings = function (options) {
	this.options.flow = 'settings';
	var data = {
		flow    : this.options.flow,
		paytype : ''
	};

	for (var key in options) {
		if (!options.hasOwnProperty(key)) continue;
		data[key] = options[key];
	}

	this.sendOptions(data);
	this._show();
};

/**
 * Open extended VX Settings Flow
 *
 * @param {object} options
 */
ModalboxPayment.prototype.openVXSettings = function (options) {
	this.options.flow = 'vxsettings';
	var data = {
		flow    : this.options.flow,
		paytype : ''
	};

	for (var key in options) {
		if (!options.hasOwnProperty(key)) continue;
		data[key] = options[key];
	}

	this.sendOptions(data);
	this._show();
};

/**
 * Open Password reset flow
 *
 * @param {object} options
 */
ModalboxPayment.prototype.openPasswordReset = function (options) {
	var data = {
		flow        : 'pwdreset',
		pwdresetKey : this._getGet('key')
	};

	for (var key in options) {
		if (!options.hasOwnProperty(key)) continue;
		data[key] = options[key];
	}

	this.sendOptions(data);
	this._show();
};

/**
 * Open Paytour in Login flow
 *
 * @param {object} options
 */
ModalboxPayment.prototype.openLogin = function (options) {
	var data = {
		flow : 'login'
	};

	for (var key in options) {
		if (!options.hasOwnProperty(key)) continue;
		data[key] = options[key];
	}

	this.sendOptions(data);
	this._show('login');
};

/**
 * Opens Signup in Login Flow
 *
 * @param {object} options
 */
ModalboxPayment.prototype.openSignup = function (options) {
	var data = {
		flow : 'login'
	};

	for (var key in options) {
		if (!options.hasOwnProperty(key)) continue;
		data[key] = options[key];
	}

	this.sendOptions(data);
	this._show('signup');
};

/** Logout current user */
ModalboxPayment.prototype.logout = function (resolve, clearToken) {
	var key    = 'logout';
	var params = {
		'clearToken' : typeof clearToken !== 'undefined' ? clearToken : false
	};

	this._registerResponseHandler(key, resolve);
	this._sendAction(key, params);
};

/** Checks if user is logged in and resolves callback */
ModalboxPayment.prototype.isLoggedIn = function (resolve) {
	var key = 'isLoggedIn';
	this._registerResponseHandler(key, resolve);

	this._sendAction(key);
};

/** Checks if login cookie has been set */
ModalboxPayment.prototype.hasLoginCookie = function (resolve) {
	var key = 'hasLoginCookie';
	this._registerResponseHandler(key, resolve);

	this._sendAction(key);
};

/**
 * Opens AVS flow
 *
 * @param {object} options
 */
ModalboxPayment.prototype.openAVS = function (options) {
	this.options.flow = 'avs';
	var data = {
		flow : this.options.flow
	};

	for (var key in options) {
		if (!options.hasOwnProperty(key)) continue;
		data[key] = options[key];
	}

	this.sendOptions(data);
	this._show('avs');
};

/**
 * Opens PromoCode
 *
 * @param {object} pc
 * @param {object} options
 */
ModalboxPayment.prototype.openPromoCode = function (pc, options) {
	var data = {
		pc : typeof pc !== 'undefined' ? pc : null,
		flow : 'promocode'
	};

	for (var key in options) {
		if (!options.hasOwnProperty(key)) continue;
		data[key] = options[key];
	}

	this.sendOptions(data);
	this._show('promocode');
};

/**
 * Opens Carrier Flow
 *
 * @param {object} options
 */
ModalboxPayment.prototype.openCarrier = function (options) {
	var data = {
		flow : 'carrier'
	};

	for (var key in options) {
		if (!options.hasOwnProperty(key)) continue;
		data[key] = options[key];
	}

	this.sendOptions(data);
	this._show('carrier');
};

/**
 * Returns user's AVS status
 */
ModalboxPayment.prototype.getAVSStatus = function (resolve) {
	var key = 'getavsstatus';
	this._registerResponseHandler(key, resolve);
	this._sendAction(key);
};

/**
 * initialize paytour with default options
 */
ModalboxPayment.prototype.initPaytour = function() {
	this.options.environment = this.options.environment || "lp";
	this.options.flow = this.options.flow || "moneycharge";

	if (!this.tryRestore()) {
		this.init('');
	}
};

/**
 * Open paytour and show given route
 */
ModalboxPayment.prototype.showPaytour = function (route) {
	this._show(route);
};

/**
 * Set callback for given event
 * e.g.: 'success', 'close'
 * @param event
 * @param callback
 * @param add
 */
ModalboxPayment.prototype.on = function (event, callback, add) {
	if (typeof event === 'string') {
		var eventName = 'on' + event.charAt(0).toUpperCase() + event.slice(1);
		if (add === 'append') {
			if (!this._isArray(this[eventName])) {
				var oldHandler = this[eventName];
				this[eventName] = [];

				if (oldHandler) {
					this[eventName].push(oldHandler);
				}
			}

			this[eventName].unshift(callback);
		} else {
			this[eventName] = callback;
		}
	}
};

/**
 * Set a hook being triggered on events
 * @param event
 * @param callback
 */
ModalboxPayment.prototype.hook = function (event, callback) {
	if (typeof event === 'string') {
		var eventName = 'on' + event.charAt(0).toUpperCase() + event.slice(1);

		if(!this._isArray(this._hooks[eventName])) {
			this._hooks[eventName] = [];
		}
		this._hooks[eventName].push(callback);
	}
};

/** Remove event handlers for event */
ModalboxPayment.prototype.off = function (event) {
	if (typeof event === 'string') {
		var eventName = 'on' + event.charAt(0).toUpperCase() + event.slice(1);
		delete this[eventName];
	}
};

/*********************** These methods will soon be removed *******************/

/**
 * Only provided to keep compatibility with older versions
 * @deprecated
 */
ModalboxPayment.prototype.show = function (route) {
	this._show(route);
};
