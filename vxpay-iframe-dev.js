/**
 * Copyright (c) 2011-2014 Felix Gnass
 * Licensed under the MIT license
 */
/* jshint ignore:start */
(function(root, factory) {

  /* CommonJS */
  if (typeof exports == 'object')  module.exports = factory()

  /* AMD module */
  else if (typeof define == 'function' && define.amd) define(factory)

  /* Browser global */
  else root.Spinner = factory()
}
(this, function() {
  "use strict";

  var prefixes = ['webkit', 'Moz', 'ms', 'O'], /* Vendor prefixes */
     animations = {}, /* Animation rules keyed by their name */
     useCssAnimations; /* Whether to use CSS animations or setTimeout */

  /**
   * Utility function to create elements. If no tag name is given,
   * a DIV is created. Optionally properties can be passed.
   */
  function createEl(tag, prop) {
    var el = document.createElement(tag || 'div')
      , n

    for(n in prop) el[n] = prop[n]
    return el
  }

  /**
   * Appends children and returns the parent.
   */
  function ins(parent /* child1, child2, ...*/) {
    for (var i=1, n=arguments.length; i<n; i++)
      parent.appendChild(arguments[i])

    return parent
  }

  /**
   * Insert a new stylesheet to hold the @keyframe or VML rules.
   */
  var sheet = (function() {
    var el = createEl('style', {type : 'text/css'})
    ins(document.getElementsByTagName('head')[0], el)
    return el.sheet || el.styleSheet
  }())

  /**
   * Creates an opacity keyframe animation rule and returns its name.
   * Since most mobile Webkits have timing issues with animation-delay,
   * we create separate rules for each line/segment.
   */
  function addAnimation(alpha, trail, i, lines) {
    var name = ['opacity', trail, ~~(alpha*100), i, lines].join('-')
      , start = 0.01 + i/lines * 100
      , z = Math.max(1 - (1-alpha) / trail * (100-start), alpha)
      , prefix = useCssAnimations.substring(0, useCssAnimations.indexOf('Animation')).toLowerCase()
      , pre = prefix && '-' + prefix + '-' || ''

    if (!animations[name]) {
      sheet.insertRule(
        '@' + pre + 'keyframes ' + name + '{' +
        '0%{opacity:' + z + '}' +
        start + '%{opacity:' + alpha + '}' +
        (start+0.01) + '%{opacity:1}' +
        (start+trail) % 100 + '%{opacity:' + alpha + '}' +
        '100%{opacity:' + z + '}' +
        '}', sheet.cssRules.length)

      animations[name] = 1
    }

    return name
  }

  /**
   * Tries various vendor prefixes and returns the first supported property.
   */
  function vendor(el, prop) {
    var s = el.style
      , pp
      , i

    prop = prop.charAt(0).toUpperCase() + prop.slice(1)
    for(i=0; i<prefixes.length; i++) {
      pp = prefixes[i]+prop
      if(s[pp] !== undefined) return pp
    }
    if(s[prop] !== undefined) return prop
  }

  /**
   * Sets multiple style properties at once.
   */
  function css(el, prop) {
    for (var n in prop)
      el.style[vendor(el, n)||n] = prop[n]

    return el
  }

  /**
   * Fills in default values.
   */
  function merge(obj) {
    for (var i=1; i < arguments.length; i++) {
      var def = arguments[i]
      for (var n in def)
        if (obj[n] === undefined) obj[n] = def[n]
    }
    return obj
  }

  /**
   * Returns the absolute page-offset of the given element.
   */
  function pos(el) {
    var o = { x:el.offsetLeft, y:el.offsetTop }
    while((el = el.offsetParent))
      o.x+=el.offsetLeft, o.y+=el.offsetTop

    return o
  }

  /**
   * Returns the line color from the given string or array.
   */
  function getColor(color, idx) {
    return typeof color == 'string' ? color : color[idx % color.length]
  }

  // Built-in defaults

  var defaults = {
    lines: 12,            // The number of lines to draw
    length: 7,            // The length of each line
    width: 5,             // The line thickness
    radius: 10,           // The radius of the inner circle
    rotate: 0,            // Rotation offset
    corners: 1,           // Roundness (0..1)
    color: '#000',        // #rgb or #rrggbb
    direction: 1,         // 1: clockwise, -1: counterclockwise
    speed: 1,             // Rounds per second
    trail: 100,           // Afterglow percentage
    opacity: 1/4,         // Opacity of the lines
    fps: 20,              // Frames per second when using setTimeout()
    zIndex: 2e9,          // Use a high z-index by default
    className: 'spinner', // CSS class to assign to the element
    top: '50%',           // center vertically
    left: '50%',          // center horizontally
    position: 'absolute'  // element position
  }

  /** The constructor */
  function Spinner(o) {
    this.opts = merge(o || {}, Spinner.defaults, defaults)
  }

  // Global defaults that override the built-ins:
  Spinner.defaults = {}

  merge(Spinner.prototype, {

    /**
     * Adds the spinner to the given target element. If this instance is already
     * spinning, it is automatically removed from its previous target b calling
     * stop() internally.
     */
    spin: function(target) {
      this.stop()

      var self = this
        , o = self.opts
        , el = self.el = css(createEl(0, {className: o.className}), {position: o.position, width: 0, zIndex: o.zIndex})
        , mid = o.radius+o.length+o.width

      css(el, {
        left: o.left,
        top: o.top
      })
        
      if (target) {
        target.insertBefore(el, target.firstChild||null)
      }

      el.setAttribute('role', 'progressbar')
      self.lines(el, self.opts)

      if (!useCssAnimations) {
        // No CSS animation support, use setTimeout() instead
        var i = 0
          , start = (o.lines - 1) * (1 - o.direction) / 2
          , alpha
          , fps = o.fps
          , f = fps/o.speed
          , ostep = (1-o.opacity) / (f*o.trail / 100)
          , astep = f/o.lines

        ;(function anim() {
          i++;
          for (var j = 0; j < o.lines; j++) {
            alpha = Math.max(1 - (i + (o.lines - j) * astep) % f * ostep, o.opacity)

            self.opacity(el, j * o.direction + start, alpha, o)
          }
          self.timeout = self.el && setTimeout(anim, ~~(1000/fps))
        })()
      }
      return self
    },

    /**
     * Stops and removes the Spinner.
     */
    stop: function() {
      var el = this.el
      if (el) {
        clearTimeout(this.timeout)
        if (el.parentNode) el.parentNode.removeChild(el)
        this.el = undefined
      }
      return this
    },

    /**
     * Internal method that draws the individual lines. Will be overwritten
     * in VML fallback mode below.
     */
    lines: function(el, o) {
      var i = 0
        , start = (o.lines - 1) * (1 - o.direction) / 2
        , seg

      function fill(color, shadow) {
        return css(createEl(), {
          position: 'absolute',
          width: (o.length+o.width) + 'px',
          height: o.width + 'px',
          background: color,
          boxShadow: shadow,
          transformOrigin: 'left',
          transform: 'rotate(' + ~~(360/o.lines*i+o.rotate) + 'deg) translate(' + o.radius+'px' +',0)',
          borderRadius: (o.corners * o.width>>1) + 'px'
        })
      }

      for (; i < o.lines; i++) {
        seg = css(createEl(), {
          position: 'absolute',
          top: 1+~(o.width/2) + 'px',
          transform: o.hwaccel ? 'translate3d(0,0,0)' : '',
          opacity: o.opacity,
          animation: useCssAnimations && addAnimation(o.opacity, o.trail, start + i * o.direction, o.lines) + ' ' + 1/o.speed + 's linear infinite'
        })

        if (o.shadow) ins(seg, css(fill('#000', '0 0 4px ' + '#000'), {top: 2+'px'}))
        ins(el, ins(seg, fill(getColor(o.color, i), '0 0 1px rgba(0,0,0,.1)')))
      }
      return el
    },

    /**
     * Internal method that adjusts the opacity of a single line.
     * Will be overwritten in VML fallback mode below.
     */
    opacity: function(el, i, val) {
      if (i < el.childNodes.length) el.childNodes[i].style.opacity = val
    }

  })


  function initVML() {

    /* Utility function to create a VML tag */
    function vml(tag, attr) {
      return createEl('<' + tag + ' xmlns="urn:schemas-microsoft.com:vml" class="spin-vml">', attr)
    }

    // No CSS transforms but VML support, add a CSS rule for VML elements:
    sheet.addRule('.spin-vml', 'behavior:url(#default#VML)')

    Spinner.prototype.lines = function(el, o) {
      var r = o.length+o.width
        , s = 2*r

      function grp() {
        return css(
          vml('group', {
            coordsize: s + ' ' + s,
            coordorigin: -r + ' ' + -r
          }),
          { width: s, height: s }
        )
      }

      var margin = -(o.width+o.length)*2 + 'px'
        , g = css(grp(), {position: 'absolute', top: margin, left: margin})
        , i

      function seg(i, dx, filter) {
        ins(g,
          ins(css(grp(), {rotation: 360 / o.lines * i + 'deg', left: ~~dx}),
            ins(css(vml('roundrect', {arcsize: o.corners}), {
                width: r,
                height: o.width,
                left: o.radius,
                top: -o.width>>1,
                filter: filter
              }),
              vml('fill', {color: getColor(o.color, i), opacity: o.opacity}),
              vml('stroke', {opacity: 0}) // transparent stroke to fix color bleeding upon opacity change
            )
          )
        )
      }

      if (o.shadow)
        for (i = 1; i <= o.lines; i++)
          seg(i, -2, 'progid:DXImageTransform.Microsoft.Blur(pixelradius=2,makeshadow=1,shadowopacity=.3)')

      for (i = 1; i <= o.lines; i++) seg(i)
      return ins(el, g)
    }

    Spinner.prototype.opacity = function(el, i, val, o) {
      var c = el.firstChild
      o = o.shadow && o.lines || 0
      if (c && i+o < c.childNodes.length) {
        c = c.childNodes[i+o]; c = c && c.firstChild; c = c && c.firstChild
        if (c) c.opacity = val
      }
    }
  }

  var probe = css(createEl('group'), {behavior: 'url(#default#VML)'})

  if (!vendor(probe, 'transform') && probe.adj) initVML()
  else useCssAnimations = vendor(probe, 'animation')

  return Spinner

}));
/* jshint ignore:end */
/** @version 1.5.56 */
/*jshint strict:false */

(function(window) {
	/**
	 * ModalboxPayment - JS Api for Payment
	 * - needs to be compressed after each change to this file
	 *
	 * @author ph
	 */
	var ModalboxPayment = function (urls, window, options, config, events) {
		this.window            = window;
		this.transferToken     = '';
		// token to initialize session - either from parameter, URL or as access token
		this.redirectToken     = options.tt || this._getGet('redirect_token') || options.at;
		this.defaultSuccessUrl = 'http://www.visit-x.net/';

		this.setUrls(urls);
		this.setOptions(options);
		this.setConfig(config);
		this.setEvents(events);

		this.window.modalboxPaymentInstance = this;
		this.iframeId                       = 'modalboxiframe';
		this.overlayId                      = this.iframeId + 'Overlay';
		this.spinnerId                      = this.iframeId + 'Spinner';

		// save viewport scale on start
		this.view        = '';
		this.iframeReady = false;
		this.ready       = false;
		this.loaded      = false;
		this.visible     = false;
		this.tabTarget   = '_blank';
		this.overlayShow = true;

		this.useTab        = false;
		this.useTabDefault = false;

		// explicitly trigger new tab feature?
		if (typeof options.enableTab !== 'undefined') {
			this._setUseTab(options.enableTab && this._supportsTabs(), true);
		}

		// enforce a new tab instead of modalbox
		if (typeof options.forceTab !== 'undefined') {
			this._setUseTab(options.forceTab, true);
		}

		// set target for new tab
		if (typeof options.tabTarget !== 'undefined') {
			this.tabTarget = options.tabTarget;
		}

		this._responseHandlers = {};
		this._storedValues     = {};
		this._hooks            = {};
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
		this.options.pfmsub = options.pfmsub || this.options.pfmsub;
		this.options.s = options.host || this.options.s;
		this.options.w = options.w || this.options.w;
		this.options.ws = options.ws || this.options.ws;
		this.options.wt = options.wt || this.options.wt;
		this.options.gk_cid = options.gk_cid || this.options.gk_cid;
		this.options.adtv = options.adtv || this.options.adtv;
		this.options.sub = options.sub || this.options.sub;
		this.options.option = options.option || this.options.option;
		this.options.pc = options.pc || this.options.pc;
		this.options.lang = options.lang || this.options.lang;
		this.options.environment = options.environment || this.options.environment;
		this.options.flow = options.flow || this.options.flow;
		this.options.showOAuth = options.showOAuth || this.options.showOAuth;
		this.options.externalRefId = options.externalRefId || this.options.externalRefId;
		this.options.externalToken = options.externalToken || this.options.externalToken;
	};

	ModalboxPayment.prototype._setOptionsLazy = function (options) {
		this.optionsLazy = this.optionsLazy || {};

		this.optionsLazy.ref = options.ref !== undefined ? options.ref : this.window.document.referrer;
		this.optionsLazy.ruri = options.ruri !== undefined ? options.ruri : this.window.location.href;
		this.optionsLazy.surl = options.surl !== undefined ? options.surl : this.window.location.href;
		this.optionsLazy.aurl = options.agbUrl;
		this.optionsLazy.prurl = options.privacyUrl;
		this.optionsLazy.purl = this.window.location.href;
		this.optionsLazy.externalRefId = options.externalRefId || this.options.externalRefId;
	};

	ModalboxPayment.prototype._setOptionsApi = function (options) {
		this.optionsApi = this.optionsApi || {};

		this.optionsApi.disableJump = options.disableJump || false;
		this.optionsApi.hideIframe  = options.hideIframe || false;
	};

	ModalboxPayment.prototype._getUseTab = function (resetToPermanent) {
		resetToPermanent = resetToPermanent || false;
		if (resetToPermanent) {
			this._setUseTab(this.useTabDefault);
		}

		return this.useTab;
	};

	ModalboxPayment.prototype._setUseTab = function (useTab, permanent) {
		permanent = permanent || false;
		if (permanent) {
			this.useTabDefault = useTab;
		}
		this.useTab = useTab;
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
			if (typeof events.onLogout === 'function') {
				this.on('logout', events.onLogout);
			}
			if (typeof events.onCountdownfinished === 'function') {
				this.on('countdownfinished', events.onCountdownFinished);
			}
			if (typeof events.onSignup === 'function') {
				this.on('signup', events.onSignup);
			}
		}

		// set defaults
		this._setDefaultEvents();
	};

	ModalboxPayment.prototype._setDefaultEvents = function () {
		if (typeof this.onAfterShow !== 'function') {
			this.on('afterShow', function (event) {
				if (!this._getUseTab()) {
					if (typeof event.modalbox._storedValues.parentBodyOverflow === 'undefined') {
						// store orig. overflow and set new
						event.modalbox._storedValues.parentBodyOverflow    = this.window.document.body.style.overflow;
						event.modalbox.window.document.body.style.overflow = 'hidden';
					}
				}

				// scroll parent to top - for mobiles
				if (this._isMobile()) {
					event.modalbox._scrollTo(1);
				}
			});
		}
		if (typeof this.onAfterHide !== 'function') {
			this.on('afterHide', function (event) {
				if (!this._getUseTab()) {
					// restore overflow on body
					if (typeof event.modalbox._storedValues.parentBodyOverflow !== 'undefined') {
						event.modalbox.window.document.body.style.overflow = event.modalbox._storedValues.parentBodyOverflow;
						event.modalbox._storedValues.parentBodyOverflow    = undefined;
					}
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
		var modalbox = this;

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
			modalbox.iframeReady = !this._getUseTab();
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
				modalbox.options.s     = typeof msgObject.data === 'object' ? msgObject.data.hostId : modalbox.options.s;
				modalbox.options.uhash = typeof msgObject.data === 'object' ? msgObject.data.uhash : null;

				modalbox.window.location.href = modalbox._generateSuccessUrl();
				modalbox.hide();
			}
		}
		else if (msgObject.type === 'modalbox-view-ready') {
			if (!modalbox.tab || modalbox.tab.closed) {
				modalbox._postMessage(JSON.stringify({
					type: 'modalbox-is-visible'
				}));
			}
		}
		// process action response
		else if ((res = msgObject.type.match(/^modalbox-response-(.*)/))) {
			if (modalbox._responseHandlers[res[1]]) {
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
		else if (msgObject.type === 'modalbox-logout') {
			modalbox._trigger('logout', msgObject.data);
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
		else if (msgObject.type === 'modalbox-countdownfinished') {
			modalbox._trigger('countdownfinished');
		}
		else if (msgObject.type === 'modalbox-signup') {
			modalbox._trigger('signup');
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
		this._addEvent('message', this.window, this._messageHandler.bind(this));
	};

	// restore Modalbox after previous extern redirect
	ModalboxPayment.prototype._restore = function (flow, view) {
		this._setUseTab(false, true);
		this.view = view;
		this.options.flow = flow;
		this._initIframe();
		this._show();
	};

	ModalboxPayment.prototype._showIframe = function (path) {
		this._showOverlay();
		this._setParentViewport();

		if (!this.iframeReady) {
			this._initIframe();
			this._showSpinner();
			window.setTimeout(function() {
				this._showIframe(path);
			}.bind(this), 1000);
			return false;
		} else if(typeof path !== 'undefined' && path !== '') {
			this._changeRoute('/' + path);
		} else {
			this._changeRoute(undefined);
		}
		this.visible = true;
		this._initSession();

		if (this.iframe) {
			this.iframe.style.display = 'block';
		}
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

	ModalboxPayment.prototype._show = function (path, resetUseTab) {
		if (typeof resetUseTab === 'undefined') {
			resetUseTab = true;
		}

		if (!this._getUseTab(resetUseTab)) {
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
		ifrm.allow = 'microphone; camera';
		ifrm.setAttribute('allowFullScreen', '');
		ifrm.setAttribute('allow', 'payment');
		
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

		this._trigger('createIframe', ifrm);

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
				window.scrollTo(0, top);
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
			this.iframe.style.height = this.options.flow === 'autorecharge' ? '100vh' : '100%'; // fix for modern mobile Chrome on autoRecharge flow
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

		div.style.cssText = 'position:  fixed;' +
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
		if(!this.overlay && this.overlayShow) {
			this.overlay = this._createOverlay();
			this.window.document.body.appendChild(this.overlay);
		}
	};

	ModalboxPayment.prototype._getGet = function (sVar) {
		return decodeURIComponent(this.window.location.search.replace(new RegExp('^(?:.*[&\\?]' + encodeURI(sVar).replace(/[\.\+\*]/g, '\\$&') + '(?:\\=([^&]*))?)?.*$', 'i'), '$1'));
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

	ModalboxPayment.prototype._initSession = function (token) {
		token = token || null;

		// init lazy loading session
		this._postMessage(JSON.stringify({
			type: 'modalbox-init-session',
			token: token
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

		if (win) {
			win.postMessage(message, origin);
		}
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
		// either use user hash or transfer token
		if (this.options.uhash) {
			url += (url.indexOf('?') >= 0 ? '&' : '?') + 'uhash=' + encodeURIComponent(this.options.uhash);
		} else if (this.transferToken) {
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

				// always init iframe - e.g. if previously closed
				that._initIframe();

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

			this._setUseTab(false, true);
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
		if (!this._getUseTab()) {
			this._initIframe();
		}
	};

	/**
	 * Init the session with a given token
	 * @param token
	 */
	ModalboxPayment.prototype.loadSessionWithExternalToken = function (token) {
		this.redirectToken = token;
		this._initSession(token);
	};

	/**
	 * Hides Iframe and overlay on the page, restores viewport
	 */
	ModalboxPayment.prototype.hide = function () {
		this._hideIframe();
		this._hideTab();
	};

	/**
	 * Always hide AND remove Iframe from DOM or close tab
	 */
	ModalboxPayment.prototype.remove = function () {
		this._hideIframe(true);
		this._hideTab();
	};

	ModalboxPayment.prototype._hideIframe = function (remove) {
		if (this.iframe && (this.visible || remove)) {
			if (this.visible) {
				this._trigger('afterHide', {
					modalbox: this
				});
			}

			this._restoreParentViewport();
			this._removeOverlay();
			this._removeSpinner();
			if (this.optionsApi.hideIframe && !remove) {
				this.iframe.style.display = 'none';
			} else {
				this._removeIframe();
				this.iframeReady = false;
			}
			this.visible = false;
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

			if (this._getUseTab()) {
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
	 *
	 */
	ModalboxPayment.prototype.openPaytour = function () {
		var route, options;

		if (arguments.length > 1) {
			route   = arguments[0];
			options = arguments[1];
		} else if (typeof arguments[0] === 'object') {
			options = arguments[0];
		} else {
			route = arguments[0];
		}

		var flow           = 'moneycharge';
		var shouldSendOpts = this.options.flow !== flow || typeof options !== 'undefined';
		this.options.flow  = flow;

		if (shouldSendOpts) {
			var data = this.buildFlowOptions({
				flow : this.options.flow
			}, options);

			this.sendOptions(data);
			this._show(route ? route : 'payment');
		} else {
			this._show(route ? route : 'payment');
		}
	};

	/**
	 * Opens Modalbox Paytour with preselected paytype
	 *
	 * @param {string} paytype
	 * @param {object} options
	 */
	ModalboxPayment.prototype.openPaytourByPaytype = function () {
		var paytype, options;

		if (arguments.length > 1) {
			paytype = arguments[0];
			options = arguments[1];
		} else if (typeof arguments[0] === 'object') {
			options = arguments[0];
		} else {
			paytype = arguments[0];
		}

		this.options.flow = 'moneycharge';
		/** TODO: Move into business logic **/
		var data          = this.buildFlowOptions({
			flow:    this.options.flow,
			paytype: paytype
		}, options);

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
		var data          = this.buildFlowOptions({
			flow:    this.options.flow,
			paytype: ''
		}, options);

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
		var data          = this.buildFlowOptions({
			flow:    this.options.flow,
			paytype: ''
		}, options);

		this.sendOptions(data);
		this._show('');
	};

	/**
	 * Opens Modalbox Paytour in AutoRecharge Mode
	 *
	 * @param {object} options
	 */
	ModalboxPayment.prototype.openAutoRechargePaytour = function (options) {
		this.options.flow = 'autorecharge';
		this._setUseTab(false);

		var data = this.buildFlowOptions({
			flow: this.options.flow
		}, options);

		this.sendOptions(data);
		this._show('', false);
	};

	/**
	 * Open Paytour in abo flow
	 *
	 * @param {object} options
	 */
	ModalboxPayment.prototype.openAboPaytour = function (options) {
		this.options.flow = 'vipabo';
		var data          = this.buildFlowOptions({
			flow: this.options.flow
		}, options);

		this.sendOptions(data);
		this._show('abo');
	};

	/**
	 * Open Paytour in VXAbo flow
	 *
	 * @param {object} options
	 */
	ModalboxPayment.prototype.openVXAboPaytour = function (options) {
		this.options.flow = 'vxabo';
		var data          = this.buildFlowOptions({
			flow: this.options.flow
		}, options);

		this.sendOptions(data);
		this._show('vxabo');
	};

	/**
	 * Open Paytour in trial abo flow
	 *
	 * @param {object} options
	 */
	ModalboxPayment.prototype.openTrialAboPaytour = function (options) {
		this.options.flow = 'trialvipabo';
		var data          = this.buildFlowOptions({
			flow: this.options.flow
		}, options);

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
		var data          = this.buildFlowOptions({
			flow: this.options.flow
		}, options);

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
	 * Open Paytour in Trial MoneyCharge flow
	 *
	 * @param {object} options
	 */
	ModalboxPayment.prototype.openTrialPaytour = function (options) {
		this.options.flow = 'trialmoneycharge';
		var data          = this.buildFlowOptions({
			flow:    this.options.flow
		}, options);

		this.sendOptions(data);
		this._show();
	};

	/**
	 * Open Paytour in Creditcard change flow
	 *
	 * @param {object} options
	 */
	ModalboxPayment.prototype.openChangeCreditcard = function (options) {
		this.options.flow = 'changecc';
		var data          = this.buildFlowOptions({
			flow:    this.options.flow,
			paytype: 'CC'
		}, options);

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
		var data          = this.buildFlowOptions({
			flow:    this.options.flow,
			paytype: 'LS'
		}, options);

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
		var data          = this.buildFlowOptions({
			flow:    this.options.flow,
			paytype: ''
		}, options);

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
		var data          = this.buildFlowOptions({
			flow:    this.options.flow,
			paytype: ''
		}, options);

		this.sendOptions(data);
		this._show();
	};

	/**
	 * Open Password reset flow
	 *
	 * @param {object} options
	 */
	ModalboxPayment.prototype.openPasswordReset = function (options) {
		var data = this.buildFlowOptions({
			flow:             'pwdreset',
			pwdresetUserId:   this._getGet('u'),
			pwdresetUserName: this._getGet('tpLoginPwdLost'),
			pwdresetKey:      this._getGet('key')
		}, options);

		this.sendOptions(data);
		this._show();
	};

	/**
	 * Open Password lost flow
	 *
	 * @param {object} options
	 */
	ModalboxPayment.prototype.openPasswordLost = function (options) {
		var data = this.buildFlowOptions({
			flow:             'pwdlost',
			pwdresetUserId:   this._getGet('u'),
			pwdresetUserName: this._getGet('tpLoginPwdLost'),
			pwdresetEmail:    this._getGet('tpEmailPwdLost')
		}, options);

		this.sendOptions(data);
		this._show();
	};

	/**
	 * Open Paytour in Login flow
	 *
	 * @param {object} options
	 */
	ModalboxPayment.prototype.openLogin = function (options) {
		var data = this.buildFlowOptions({
			flow: 'login'
		}, options);

		this.sendOptions(data);
		this._show('login');
	};

	/**
	 * Opens Signup in Login Flow
	 *
	 * @param {object} options
	 */
	ModalboxPayment.prototype.openSignup = function (options) {
		var data = this.buildFlowOptions({
			flow: 'login'
		}, options);

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
		var data          = this.buildFlowOptions({
			flow: this.options.flow
		}, options);

		this.sendOptions(data);
		this._show('avs');
	};

	/**
	 * Opens PromoCode
	 *
	 * @param {object} options
	 */
	ModalboxPayment.prototype.openPromoCode = function (options) {
		var data = this.buildFlowOptions({
			flow: 'promocode'
		}, options);

		this.sendOptions(data);
		this._show('promocode');
	};

	/**
	 * Opens ScratchCard
	 *
	 * @param {object} options
	 */
	ModalboxPayment.prototype.openScratchCard = function (options) {
		var data = this.buildFlowOptions({
			flow : 'scratchcard'
		}, options);

		this.sendOptions(data);
		this._show('promocode');
	};

	/**
	 * Opens Carrier Flow
	 *
	 * @param {object} options
	 */
	ModalboxPayment.prototype.openCarrier = function (options) {
		var data = this.buildFlowOptions({
			flow: 'carrier'
		}, options);

		this.sendOptions(data);
		this._show('carrier');
	};

	/**
	 * Open Open Collections compensation flow
	 *
	 * @param {object} options
	 */
	ModalboxPayment.prototype.openOPCompensation = function (options) {
		var data = this.buildFlowOptions({
			flow: 'opcompensation'
		}, options);

		this.sendOptions(data);
		this._show('opcompensation');
	};

	/**
	 * Open moneycharge flow with voicecall
	 *
	 * @param {object} options
	 */
	ModalboxPayment.prototype.openVoicecall = function(options) {
		this.openPaytourByPaytype('Voice', options);
	};

	/**
	 * Open moneycharge flow with voicecall
	 *
	 * @param {object} options
	 */
	ModalboxPayment.prototype.openAnonymousVoicecall = function(options) {
		options                 = options || {};
		options.isGuestLoggedIn = false;

		this.openPaytourByPaytype('Voice', options);
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
	 * Merge initial, callback und default flow options
	 *
	 * @param {object} initOptions
	 * @param {object} callOptions
	 * @returns {*|{}}
	 */
	ModalboxPayment.prototype.buildFlowOptions = function (initOptions, callOptions) {
		var data    = Object.assign({}, this.defaultFlowOptions || {});
		initOptions = initOptions || {};
		callOptions = callOptions || {};

		var key;
		for (key in initOptions) {
			if (!initOptions.hasOwnProperty(key)) {
				continue;
			}
			if (typeof initOptions[key] === 'object' && !Array.isArray(initOptions[key])) {
				data[key] = Object.assign(data[key] || {}, initOptions[key] || {});
			} else {
				data[key] = initOptions[key];
			}
		}

		for (key in callOptions) {
			if (!callOptions.hasOwnProperty(key)) {
				continue;
			}
			if (typeof callOptions[key] === 'object' && !Array.isArray(callOptions[key])) {
				data[key] = Object.assign(data[key] || {}, callOptions[key] || {});
			} else {
				data[key] = callOptions[key];
			}
		}

		return data;
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
	 * Set initial flow options
	 *
	 * @param {object} options
	 */
	ModalboxPayment.prototype.setDefaultFlowOptions = function (options) {
		this.defaultFlowOptions = options;
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

	/* loader */
	if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
		module.exports = ModalboxPayment;
	}
	else {
		window.ModalboxPayment            = ModalboxPayment;
		window.ModalboxPaymentConstructor = ModalboxPayment;
	}
	return ModalboxPayment;
})(window);
