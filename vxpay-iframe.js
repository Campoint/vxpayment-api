/*jshint strict:false */

/**
 * ModalboxPayment - JS Api for Payment
 * - needs to be compressed after each change to this file
 *
 * @author ph
 */
var ModalboxPayment = function (urls, window, options, config) {
	this.window = window;
	this.transferToken = '';
	this.redirectToken = options.tt || this.getGet('redirect_token');

	this.setUrls(urls);
	this.setOptions(options);
	this.setConfig(config);

	this.iframeId = 'modalboxiframe';
	this.overlayId = this.iframeId + 'Overlay';
	this.spinnerId = this.iframeId + 'Spinner';

	// save viewport scale on start
	this.origScale = this.getScale();
	this.view = '';
	this.ready = false;
	this.loaded = false;
	this.visible = false;
	this.window.ModalboxPayment = this;

	// events
	this.onClose = null;
};

ModalboxPayment.prototype.setOptions = function (options) {
	this.options = this.options || {};

	this.options.aurl = options.agbUrl;
	this.options.pfm = options.pfm;
	this.options.s = options.host;
	this.options.simg = options.hostImg;
	this.options.w = options.w;
	this.options.ws = options.ws;
	this.options.ref = options.ref;
	this.options.ruri = options.ruri;
	this.options.wt = options.wt;
	this.options.option = options.option;
	this.options.lang = options.lang;
	this.options.environment = options.environment;
	this.options.flow = options.flow;
};

ModalboxPayment.prototype.setConfig = function (config) {
	this.modConfig = config || {};
	this.modConfig.parentInFrame = this.isParentInFrame();
};

ModalboxPayment.prototype.setUrls = function (urls) {
	this.startUrl = this.window.location.href;
	this.succesUrl = 'http://www.visit-x.net/';

	// only baseUrl?
	if (typeof urls === 'string') {
		this.baseUrl = urls;
	} else if (typeof urls === 'object') { /* we have a list of URLS? */
		this.baseUrl = urls.baseUrl;
		this.succesUrl = urls.successUrl || this.succesUrl;
	}
};

ModalboxPayment.prototype.setOption = function (key, value) {
	this.options = this.options || {};

	this.options[key] = value;
};

ModalboxPayment.prototype.messageHandler = function (evt) {
	var res = null;
	var data = evt.data;
	var modalbox = ModalboxPayment;

	// on closing modalbox
	if (data === 'modalbox-iframe-close') {
		modalbox.hide();

		// onClose callback
		if (typeof modalbox.onClose === 'function') {
			modalbox.onClose();
		}
	}
	else if (data === 'modalbox-iframe-ready') {
		modalbox.ready = true;
		modalbox.removeSpinner();
		modalbox.maximizeIframe();
	}
	else if (data === 'modalbox-content-loaded') {
		modalbox.loaded = true;
		if (modalbox.visible) {
			modalbox.initSession();

			modalbox.postMessage(JSON.stringify({
				type: 'modalbox-is-visible'
			}), modalbox.iframe.contentWindow);
		}
	}
	// on finished paytour
	else if (data === 'modalbox-success') {
		//modalbox.log('Paytour success');
		modalbox.window.location.href = modalbox._generateSuccessUrl();
		modalbox.removeIframe();
	}
	// catch transfer_token
	else if ((res = data.match(/^redirect:(.*)/))) {
		modalbox.window.location.href = res[1];
	}
	// catch transfer_token
	else if ((res = data.match(/^transfer_token:(.*)/))) {
		modalbox.transferToken = res[1];

		// send additional parameters back
		//modalbox.log('updating session');
		modalbox.postMessage(JSON.stringify({
			type: 'modalbox-additional-info',
			ref: modalbox.options.ref,
			ruri: modalbox.options.ruri
		}), modalbox.iframe.contentWindow);
	}
};

// register event listener
ModalboxPayment.prototype._registerListener = function () {
	var that = this;

	this.addEvent('message', this.window, this.messageHandler);
};

// tests, whether to restore or not
ModalboxPayment.prototype.tryRestore = function () {
	if (this.getGet('showModalbox') === '1') {
		this.restore();
		return true;
	}
	return false;
};

// restore Modalbox after previous extern redirect
ModalboxPayment.prototype.restore = function () {
	this.view = 'wait';
	this.initIframe(this.view);
	this.show();
};

ModalboxPayment.prototype.init = function (path) {
	this.view = path || '';
	this.initIframe(path);
};

ModalboxPayment.prototype.show = function (path) {
	var that = this;
	this.showOverlay();
	this._setParentViewport();

	if (!this.ready) {
		this.showSpinner();
		this.initIframe(path);
	} else if(typeof path !== 'undefined' && path !== '') {
		this._changeRoute('/' + path);
	}

	this.visible = true;

	this.initSession();

	this.iframe.style.display = 'block';

	// scroll parent to top - for mobiles
	this.window.scrollTo(0,1);

	this.postMessage(JSON.stringify({
		type: 'modalbox-is-visible'
	}), this.iframe.contentWindow);
};

ModalboxPayment.prototype._changeRoute = function (route) {
	this.postMessage(JSON.stringify({
		type: 'modalbox-change-route',
		route: route
	}), this.iframe.contentWindow);
};

ModalboxPayment.prototype.initIframe = function (path) {
	if (!this.iframe) {
		this._registerListener();

		var opts = this.options;
		opts.surl = this.startUrl;
		opts.tt = this.redirectToken;
		opts.sview = this.view;
		opts.lazy = 1;

		// create URL with params
		var url = this._generateUrl(this.baseUrl, opts, this.modConfig, (path ? path : ''));

		this.iframe = this.createIframe(url);

		this.window.document.body.appendChild(this.iframe);
	}
};

ModalboxPayment.prototype.createIframe = function (url) {
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

	// absolute only for mobile
	if(this.isMobile()) {
		ifrm.style.position = 'absolute';
	} else {
		ifrm.style.position = 'fixed';
	}

	return ifrm;
};

ModalboxPayment.prototype.maximizeIframe = function () {
	this.iframe.style.width = '100%';
	this.iframe.style.height = '100%';
	this.iframe.style.left = 0;
	this.iframe.style.top = 0;
	this.iframe.style.marginLeft = 0;
};

ModalboxPayment.prototype.sendOptions = function (options) {
	if (typeof options  === 'object') {
		var that = this;
		var sendCallback = function () {
			var params = {};
			params.type = 'modalbox-update-params';
			params.options = options;
			that.postMessage(JSON.stringify(params), that.iframe.contentWindow);
			that.updateOptions(options);
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
	}
};

ModalboxPayment.prototype.updateOptions = function (options) {
	if (typeof options  === 'object') {
		for (var key in options) {
			this.setOption(key, options[key]);
		}
	}
};

ModalboxPayment.prototype.createSpinner = function () {
	var div = this.window.document.createElement('div');
	div.id = this.spinnerId;
	div.style.width = '200px';
	div.style.height = '200px';
	div.style.lineHeight = '200px';
	div.style.top = '15%';
	div.style.left = '50%';
	div.style.marginLeft = '-100px';
	div.style.zIndex = 10002;
	div.style.position = 'absolute';
	div.style.background = '#FFFFFF';
	div.style.textAlign = 'center';
	div.innerHTML = '<img alt="spinner" src="https://www.visit-x.net/VXPAY/img/spinner.gif" style="vertical-align: middle;" />';

	return div;
};

ModalboxPayment.prototype.createOverlay = function () {
	var div = this.window.document.createElement('div');
	div.id = this.overlayId;
	div.style.display = 'block';
	div.style.opacity = '0.5';
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

ModalboxPayment.prototype.hide = function () {
	if (this.iframe && this.visible) {
		this.iframe.style.display = 'none';
		this._restoreParentViewport();
		this.removeOverlay();
		this.removeSpinner();
		this.visible = false;
	}
};

ModalboxPayment.prototype.removeIframe = function () {
	if (this.iframe) {
		var elem = this.window.document.getElementById(this.iframeId);
		elem.parentNode.removeChild(elem);
		this.removeEvent('message', this.window, this.messageHandler);
		this.iframe = null;
		this.visible = false;
		this.ready = false;
		this.loaded = false;
		this.window.ModalboxPayment = null;
		this._restoreParentViewport();
	}
};

ModalboxPayment.prototype.removeOverlay = function () {
	if (this.overlay) {
		var elem = this.window.document.getElementById(this.overlayId);
		elem.parentNode.removeChild(elem);
		this.overlay = null;
	}
};

ModalboxPayment.prototype.removeSpinner = function () {
	if (this.spinner) {
		var elem = this.window.document.getElementById(this.spinnerId);
		elem.parentNode.removeChild(elem);
		this.spinner = null;
	}
};

ModalboxPayment.prototype.showSpinner = function () {
	if(!this.spinner) {
		this.spinner = this.createSpinner();
		this.window.document.body.appendChild(this.spinner);
	}
};

ModalboxPayment.prototype.showOverlay = function () {
	if(!this.overlay) {
		this.overlay = this.createOverlay();
		this.window.document.body.appendChild(this.overlay);
	}
};

ModalboxPayment.prototype.getGet = function (sVar) {
	return decodeURI(this.window.location.search.replace(new RegExp('^(?:.*[&\\?]' + encodeURI(sVar).replace(/[\.\+\*]/g, '\\$&') + '(?:\\=([^&]*))?)?.*$', 'i'), '$1'));
};

// cross-browser event registration
ModalboxPayment.prototype.addEvent = function (evnt, elem, func) {
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

ModalboxPayment.prototype.initSession = function () {
	// init lazy loading session
	this.postMessage(JSON.stringify({
		type: 'modalbox-init-session'
	}), this.iframe.contentWindow);
};

// cross-browser event unregistration
ModalboxPayment.prototype.removeEvent = function (evnt, elem, func) {
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

// get current viewport scale
ModalboxPayment.prototype.getScale = function () {
	this.viewportScale = undefined;

	// Get viewport width
	var viewportWidth = document.documentElement.clientWidth;

	// Abort. Screen width is greater than the viewport width (not fullscreen).
	if (screen.width > viewportWidth) {
		//this.log('Aborted viewport scale measurement. Screen width > viewport width');
		return 1;
	}

	// Get the orientation corrected screen width
	this.updateOrientation();
	this.screenWidth = screen.width;

	if (this.orientation === 'portrait') {
		// Take smaller of the two dimensions
		if (screen.width > screen.height) { this.screenWidth = screen.height; }
	}
	else {
		// Take larger of the two dimensions
		if (screen.width < screen.height) { this.screenWidth = screen.height; }
	}

	// Calculate viewport scale
	this.viewportScale = this.screenWidth / this.window.innerWidth;

	return this.viewportScale;
};

// updates orientation status
ModalboxPayment.prototype.updateOrientation = function () {
	this.orientation = this.window.orientation;

	if (this.orientation === undefined) {
		// No JavaScript orientation support. Work it out.
		if (document.documentElement.clientWidth > document.documentElement.clientHeight) { this.orientation = 'landscape'; }
		else { this.orientation = 'portrait'; }

	}
	else if (this.orientation === 0 || this.orientation === 180) { this.orientation = 'portrait'; }
	else {
		this.orientation = 'landscape'; // Assumed default, most laptop and PC screens.
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
			this.addEvent('gesturestart', this.window.document.body, function () {
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

ModalboxPayment.prototype._generateUrl = function (baseUrl, params, config, hash) {
	var ret = [];
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

	// add hash
	if (hash) {
		url += '#/' + (hash ? hash : '');
	}

	//this.log('modalbox URL length: ' + url.length + ' chars');
	return url;
};

ModalboxPayment.prototype.postMessage = function (message, window, origin) {
	origin = origin ? origin : '*';

	window.postMessage(message, origin);
};

ModalboxPayment.prototype.log = function (message) {
	if (typeof console !== 'undefined' && typeof console.log !== 'undefined') {
		console.log(message);
	}
};

ModalboxPayment.prototype.isMobile = function () {
	return (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
};

ModalboxPayment.prototype.isParentInFrame = function () {
	try {
		return window.self !== window.top ? 1 : 0;
	} catch (e) {
		return 1;
	}
};

// creates final URL for redirect
ModalboxPayment.prototype._generateSuccessUrl = function () {
	var url;

	if (this.options.s) {
		url = this.succesUrl + 'CAMS/DE/Darsteller/' + encodeURIComponent(this.options.s) + '/';
	} else {
		url = this.succesUrl;
	}

	if (this.transferToken) {
		url += (url.indexOf('?') >= 0 ? '&' : '?') + 'transfer_token=' + encodeURIComponent(this.transferToken);
	}
	if (this.options.pfm) {
		url += (url.indexOf('?') >= 0 ? '&' : '?') + 'xpfm=' + encodeURIComponent(this.options.pfm);
	}

	return url;
};

/**
 * Opens Modalbox Paytour with preselected paytype
 * @param paytype
 */
ModalboxPayment.prototype.openPaytourByPaytype = function (paytype) {
	var flow = 'moneycharge'; /** TODO: Move into business logic **/
	this.options.flow = flow;
	this.sendOptions({ paytype: paytype, flow: flow });
	this.show('');
};

/**
 * Open Paytour in abo flow
 * @param paytype
 */
ModalboxPayment.prototype.openAboPaytour = function (flow) {
	this.options.flow = flow;
	this.sendOptions({ flow: flow });
	this.show('abo');
};

/**
 * @deprecated
 * @param paytype
 */
ModalboxPayment.prototype.showAmount = function (paytype) {
	this.openPaytourByPaytype(paytype);
};
