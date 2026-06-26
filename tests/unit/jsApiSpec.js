'use strict';

/* just temporarily before karma update */
if (!Function.prototype.bind) {
	Function.prototype.bind = function(oThis) {
		if (typeof this !== 'function') {
			// closest thing possible to the ECMAScript 5
			// internal IsCallable function
			throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
		}

		var aArgs   = Array.prototype.slice.call(arguments, 1),
		    fToBind = this,
		    fNOP    = function() {},
		    fBound  = function() {
			    return fToBind.apply(this instanceof fNOP
					    ? this
					    : oThis,
				    aArgs.concat(Array.prototype.slice.call(arguments)));
		    };

		if (this.prototype) {
			// Function.prototype doesn't have a prototype property
			fNOP.prototype = this.prototype;
		}
		fBound.prototype = new fNOP();

		return fBound;
	};
}

function shallowCopy( original )
{
	// First create an empty object with
	// same prototype of our original source
	var clone = Object.create( Object.getPrototypeOf( original ) ) ;

	var i , keys = Object.getOwnPropertyNames( original ) ;

	for ( i = 0 ; i < keys.length ; i ++ )
	{
		// copy each property into the clone
		Object.defineProperty( clone , keys[ i ] ,
			Object.getOwnPropertyDescriptor( original , keys[ i ] )
		) ;
	}

	return clone ;
}

describe('Modalbox JS API Test', function() {

	var options = {
		agbUrl: 'http://www.visit-x.com/agb',
		host: '3135103',
		pfm: 751,
		w: 'webid',
		ws: 'websubref',
		wt: 'wt',
		ref: 'http://www.referer.com',
		ruri: 'https://ph.vxpayment.x/',
		option: 'BONUS100'
	};

	beforeEach(function() {
	});

	describe('General tests', function() {
		var baseUrl = 'https://ph.vxpayment.x/';
		var win = {};
		win.location = {};
		win.location.search = '?redirect_token=ttt';
		win.location.href = 'http://ph.vxpayment-test.x';
		win.parent = {};
		win.parent.document = {};
		win.parent.document.body = { clientWidth: 1000 };


		var modalbox = new ModalboxPayment(baseUrl, win, options);

		it('should not be Mobile', function() {
			expect(modalbox._isMobile()).toBe(false);
		});

		it('should have options set', function() {
			expect(modalbox.optionsLazy.aurl).toBe(options.agbUrl);
			expect(modalbox.options.pfm).toBe(options.pfm);
			expect(modalbox.options.s).toBe(options.host);
			expect(modalbox.options.w).toBe(options.w);
			expect(modalbox.options.ws).toBe(options.ws);
			expect(modalbox.transferToken).toBe('');
			expect(modalbox.optionsLazy.ref).toBe(options.ref);
			expect(modalbox.optionsLazy.ruri).toBe(options.ruri);
			expect(modalbox.options.wt).toBe(options.wt);
			expect(modalbox.redirectToken).toBe(modalbox._getGet('redirect_token'));
			expect(modalbox.options.option).toBe(options.option);
			expect(modalbox.baseUrl).toBe(baseUrl);
			expect(modalbox.optionsLazy.surl).toBe(modalbox.window.location.href);
			expect(modalbox.window.ModalboxPayment).toBe(modalbox);
		});

		var hostUrlRegex = 'http:\/\/www.visit\-x\.net\/\\?jump=shpprofile&s=' + options.host;

		it('is success URL correct?', function() {
			expect(modalbox._generateSuccessUrl()).toMatch(new RegExp(hostUrlRegex, 'i'));
		});
		it('w in URL?', function() {
			expect(modalbox._generateSuccessUrl()).toMatch(new RegExp(hostUrlRegex + '.*w=' + options.w, 'i'));
		});
		it('ws in URL?', function() {
			expect(modalbox._generateSuccessUrl()).toMatch(new RegExp(hostUrlRegex + '.*ws=' + options.ws, 'i'));
		});
		it('w,ws not in URL?', function() {
			modalbox.options.w = undefined;
			modalbox.options.ws = undefined;

			expect(modalbox._generateSuccessUrl()).not.toMatch(new RegExp(hostUrlRegex + '.*w=' + options.w, 'i'));
			expect(modalbox._generateSuccessUrl()).not.toMatch(new RegExp(hostUrlRegex + '.*ws=' + options.ws, 'i'));
		});
		it('buildFlowOptions empty', function() {
			expect(modalbox.buildFlowOptions()).toEqual({});
		});
		it('buildFlowOptions init', function() {
			expect(modalbox.buildFlowOptions({
				flow: 'xxx'
			})).toEqual({
				flow: 'xxx'
			});
			expect(modalbox.buildFlowOptions({
				flow: 'xxx'
			}, {})).toEqual({
				flow: 'xxx'
			});
			expect(modalbox.buildFlowOptions({
				flow: 'xxx'
			}, null)).toEqual({
				flow: 'xxx'
			});
		});
		it('buildFlowOptions init with callback', function() {
			expect(modalbox.buildFlowOptions({
				flow:  'xxx',
				texts: {
					text: 'a'
				}
			}, {
				texts: {
					text: 'b'
				}
			})).toEqual({
				flow:  'xxx',
				texts: {
					text: 'b'
				}
			});
		});
		it('buildFlowOptions with defaults', function() {
			modalbox.setDefaultFlowOptions({texts: {text: 'c'}});
			expect(modalbox.buildFlowOptions({
				flow: 'login'
			})).toEqual({
				flow:  'login',
				texts: {text: 'c'}
			});
		});
	});

	describe('setting options test', function() {
		var baseUrl = 'https://ph.vxpayment.x/';
		var win = {};
		win.location = {};
		win.location.search = '';
		win.location.href = 'http://ph.vxpayment-test.x';
		win.parent = {};
		win.parent.document = {};
		win.parent.document.body = { clientWidth: 1000 };

		win.document = {};
		win.document.referer = 'http://www.google.com';

		var newpfm = 1123;
		var hostId = 1234567;
		var newHostId = 12345678;

		var custOpts = shallowCopy(options);
		custOpts.at = 'TOK_access_token';
		var paramToken = 'TOK_via_param';

		var modalbox = new ModalboxPayment(baseUrl, win, custOpts);

		it('should not change pfm', function() {
			modalbox.setOptions({ pfm: newpfm });

			expect(modalbox.options.pfm).toBe(newpfm);
		});
		it('should not change host and not erase pfm', function() {
			modalbox.setOptions({ host: hostId });

			expect(modalbox.options.s).toBe(hostId);
			expect(modalbox.options.pfm).toBe(newpfm);
		});
		it('updating options after sending to angular', function() {
			modalbox._updateOptions({ host: newHostId });

			expect(modalbox.options.s).toBe(newHostId);
			expect(modalbox.options.pfm).toBe(newpfm);
		});
		it('injecting access token as redirect token', function() {
			expect(modalbox.redirectToken).toBe(custOpts.at);
		});
		it('injecting access token as redirect token', function() {
			modalbox.loadSessionWithExternalToken(paramToken);

			expect(modalbox.redirectToken).toBe(paramToken);
		});
	});

	describe('testing generated success url', function() {
		var baseUrl = 'https://ph.vxpayment.x/';
		var win = {};
		var tt_token = 'tt_token';

		win.location = {};
		win.location.search = '';
		win.location.href = 'http://ph.vxpayment-test.x';
		win.parent = {};
		win.parent.document = {};
		win.parent.document.body = { clientWidth: 1000 };

		var custOpts = shallowCopy(options);
		custOpts.tt = 'TT_injected_transfer_token_which_has_higher_priority';
		custOpts.at = 'TOK_injected_transfer_token_will_be_ignored';

		var modalbox = new ModalboxPayment(baseUrl, win, custOpts);
		modalbox.transferToken = tt_token;

		var hostUrlRegex = 'http:\/\/www.visit\-x\.net\/\\?jump=shpprofile&s=' + options.host;

		it('can we genearate url with transfer_token?', function() {
			expect(modalbox._generateSuccessUrl()).toMatch(new RegExp(hostUrlRegex + '.*[\?&]transfer_token=' + tt_token, 'i'));
		});
		it('empty transfer_token set, not in URL?', function() {
			modalbox.transferToken = '';
			expect(modalbox._generateSuccessUrl()).not.toMatch(new RegExp(hostUrlRegex + '.*transfer_token=.*', 'i'));
		});
		it('null transfer_token set, not in URL?', function() {
			modalbox.transferToken = null;
			expect(modalbox._generateSuccessUrl()).not.toMatch(new RegExp(hostUrlRegex + '.*transfer_token=.*', 'i'));
		});
		it('pfm set, in URL?', function() {
			expect(modalbox._generateSuccessUrl()).toMatch(new RegExp(hostUrlRegex + '.*xpfm=' + options.pfm, 'i'));
		});
		it('empty pfm, not in URL?', function() {
			modalbox.options.pfm = '';
			expect(modalbox._generateSuccessUrl()).not.toMatch(new RegExp(hostUrlRegex + '.*xpfm=.*', 'i'));
		});
		it('pfm null, not in URL?', function() {
			modalbox.options.pfm = null;
			expect(modalbox._generateSuccessUrl()).not.toMatch(new RegExp(hostUrlRegex + '.*xpfm=.*', 'i'));
		});
		it('injected transfer token in constructor', function() {
			expect(modalbox.redirectToken).toBe(custOpts.tt);
		});
		it('disable jumplink', function() {
			modalbox.optionsApi.disableJump = true;
			expect(modalbox._generateSuccessUrl()).not.toMatch(new RegExp('.*jump=shpprofile.*', 'i'));
		});
	});

	describe('testing module config and urls', function() {
		var baseUrl = 'https://ph.vxpayment.x/';
		var win = {};
		var tt_token = 'tt_token';
		var conf = {
			showTeaser: 1
		};
		var events = {
			onSuccess: function () {
				return true;
			},
			onReady: function () {
				return true;
			},
			onInit: function () {
				return true;
			},
			onAfterShow: function () {
				return true;
			},
			onAfterHide: function () {
				return true;
			}
		};

		win.location = {};
		win.location.search = '?redirect_token=ttt';
		win.location.href = 'http://ph.vxpayment-test.x';
		win.parent = {};
		win.parent.document = {};
		win.parent.document.body = { clientWidth: 1000 };

		var modalbox = new ModalboxPayment(baseUrl, win, options, conf, events);
		modalbox.transferToken = tt_token;

		// set onClose extern
		modalbox.onClose = function () { return 'over'; };

		it('modConfig params in URL?', function() {
			expect(modalbox._generateUrl(modalbox.baseUrl, options, modalbox.modConfig)).toMatch(new RegExp('mc\[[a-z]+\]=', 'i'));
		});
		it('callbacks set?', function() {
			expect(typeof modalbox.onSuccess).toEqual('function');
			expect(typeof modalbox.onClose).toEqual('function');
			expect(typeof modalbox.onReady).toEqual('function');
			expect(typeof modalbox.onInit).toEqual('function');
			expect(typeof modalbox.onAfterShow).toEqual('function');
			expect(typeof modalbox.onAfterHide).toEqual('function');
		});
		it('callback overwritten?', function() {
			expect(modalbox.onClose()).toEqual('over');
			expect(modalbox._trigger('close', {})).toEqual('over');
		});
	});

	describe('urls as object', function() {
		var baseUrl = 'https://ph.vxpayment.x/';
		var win = {};
		var successUrl = 'http://www.visit-x.xxx/';
		var successUrlNew = 'http://www.visit-x.tv/';

		win.location = {};
		win.location.search = '?redirect_token=ttt';
		win.location.href = 'http://ph.vxpayment-test.x';
		win.parent = {};
		win.parent.document = {};
		win.parent.document.body = { clientWidth: 1000 };

		var modalbox = new ModalboxPayment({
			baseUrl: baseUrl,
			successUrl: successUrl
		}, win, options);
		var modalbox2 = new ModalboxPayment(baseUrl, win, options);

		it('base URL set in object', function() {
			expect(modalbox.baseUrl).toMatch(new RegExp('vxpayment\.x', 'i'));
		});
		it('success URL set in object', function() {
			expect(modalbox._generateSuccessUrl()).toMatch(new RegExp('\.xxx', 'i'));
		});
		it('base URL set as string', function() {
			expect(modalbox2.baseUrl).toMatch(new RegExp('vxpayment\.x', 'i'));
		});
		it('successURL changed on the fly', function() {
			modalbox.setUrls({
				successUrl: successUrlNew
			});

			// new successUrl?
			expect(modalbox.successUrl).toMatch(successUrlNew);
			// old baseUrl is the same?
			expect(modalbox.baseUrl).toMatch(baseUrl);
		});
	});

	describe('Modalbox for Landing page', function() {
		var adtv = '11467_c7c8c2_e68b6';
		var selHost = '3135103';
		var option = 'CSB10E';

		var baseUrl = '/paytour1?ovif=1&option=CSB10E&s=4310290& ' + adtv;
		var win = {};

		win.location = {};
		win.location.search = '?redirect_token=ttt';
		win.location.href = 'http://ph.vxpayment-test.x';
		win.parent = {};
		win.parent.document = {};
		win.parent.document.body = { clientWidth: 1000 };

		win.document = {};
		win.document.referer = 'http://www.google.com';

		var opts = {
			agbUrl: 'https://www.visit-x.net/CAMS/DE/Info/Zentrum.html?submod=AGB&track=PaymentdefaultLS_Complete',
			pfm: 751,
			host: selHost,
			w: '',
			ws: '',
			wt: '',
			adtv: adtv,
			option: option,
			ref: '',
			ruri: ''
		};

		var modalbox = new ModalboxPayment(baseUrl, win, opts);

		it('base URL set in object', function() {
			expect(modalbox.optionsLazy.aurl).toBe(opts.agbUrl);
			expect(modalbox.options.s).toBe(opts.host);
			expect(modalbox.options.pfm).toBe(opts.pfm);
			expect(modalbox.options.option).toBe(opts.option);
		});
		it('adtv in URL', function() {
			var generatedUrl = modalbox._generateUrl(modalbox.baseUrl, opts);
			expect(generatedUrl).toMatch(new RegExp('adtv=' + adtv, 'i'));
		});
		it('default referer from request', function() {
			expect(modalbox.optionsLazy.ref).toEqual(win.document.referrer);
		});
		it('undefined default referer from request', function() {
			win.document.referer = undefined;
			expect(modalbox.optionsLazy.ref).toEqual(win.document.referrer);
		});
		it('default REQUEST_URL from request', function() {
			expect(modalbox.optionsLazy.ruri).toMatch(win.location.href);
		});
	});

	describe('postMessage parser', function() {
		//var msgObject = modalbox._parseMessage(evt.data);
		var baseUrl = 'https://ph.vxpayment.x/';

		var win = {};
		win.location = {};
		win.location.search = '?redirect_token=ttt';
		win.location.href = 'http://ph.vxpayment-test.x';
		win.parent = {};
		win.parent.document = {};
		win.parent.document.body = { clientWidth: 1000 };

		var modalbox = new ModalboxPayment(baseUrl, win, options);

		it('string as postMessage', function() {
			var msg = 'modalbox-success';
			var res = { type: msg, data: null };

			expect(modalbox._parseMessage(msg)).toEqual(res);
		});
		it('serialized object as postMessage', function() {
			var obj = { type: 'modalbox-success', data: { availableMoney: 300 }};
			var msg = JSON.stringify(obj);

			expect(modalbox._parseMessage(msg)).toEqual(obj);
		});
	});

	/** specials for calling Paytour on LPs */
	describe('common public methods: init, tryRestore, initPaytour', function() {
		//var msgObject = modalbox._parseMessage(evt.data);
		var baseUrl = 'https://ph.vxpayment.x/';

		var win = {};
		win.location = {};
		win.location.search = '';
		win.location.href = 'http://ph.vxpayment-test.x';
		win.parent = {};
		win.parent.document = {};
		win.parent.document.body = { clientWidth: 1000 };

		var modalbox = new ModalboxPayment(baseUrl, win, options);

		it('show() method exists?', function() {
			expect(typeof modalbox.show).toEqual('function');
		});
		it('hide() method exists?', function() {
			expect(typeof modalbox.hide).toEqual('function');
		});
		it('sendOptions() method exists?', function() {
			expect(typeof modalbox.sendOptions).toEqual('function');
		});
		it('setOptions() method exists?', function() {
			expect(typeof modalbox.setOptions).toEqual('function');
		});
		it('old init() method exists?', function() {
			expect(typeof modalbox.init).toEqual('function');
		});
		it('old tryRestore() method exists?', function() {
			expect(typeof modalbox.tryRestore).toEqual('function');
		});
		it('new wrapping initPaytour() method exists and works?', function() {
			expect(typeof modalbox.initPaytour).toEqual('function');

			spyOn(modalbox, 'init');
			modalbox.initPaytour();
			expect(modalbox.init).toHaveBeenCalled();
			
			spyOn(modalbox, 'tryRestore');
			modalbox.initPaytour();
			expect(modalbox.init).toHaveBeenCalled();
		});
		it('old showPaytour() method exists?', function() {
			expect(typeof modalbox.showPaytour).toEqual('function');
		});
		it('getBalance() method exists?', function() {
			expect(typeof modalbox.getBalance).toEqual('function');
		});
		it('test GET params', function() {
			win.location.search = '?tpEmailPwdLost=test%40campoint.net&flow=vxpay-flow&access_token=TOK_Aasdadlkjad46464-asdasdasd161asd&show=1&u=123456';

			expect(modalbox._getGet('tpEmailPwdLost')).toEqual('test@campoint.net');
			expect(modalbox._getGet('flow')).toEqual('vxpay-flow');
			expect(modalbox._getGet('access_token')).toEqual('TOK_Aasdadlkjad46464-asdasdasd161asd');
			expect(modalbox._getGet('show')).toEqual('1');
			expect(modalbox._getGet('u')).toEqual('123456');
		});
	});

	/** Flow tests */
	describe('existing Flow methods?', function() {
		var baseUrl = 'https://ph.vxpayment.x/';

		var win = {};
		win.location = {};
		win.location.search = '';
		win.location.href = 'http://ph.vxpayment-test.x';
		win.parent = {};
		win.parent.document = {};
		win.parent.document.body = { clientWidth: 1000 };

		var modalbox = new ModalboxPayment(baseUrl, win, options);

		it('exist flow methods?', function() {
			expect(typeof modalbox.openPaytour).toEqual('function');
			expect(typeof modalbox.openPaytourByPaytype).toEqual('function');
			expect(typeof modalbox.openLogin).toEqual('function');
			expect(typeof modalbox.openSignup).toEqual('function');
			expect(typeof modalbox.openAboPaytour).toEqual('function');
			expect(typeof modalbox.openAVS).toEqual('function');
			expect(typeof modalbox.openChangeCreditcard).toEqual('function');
			expect(typeof modalbox.openSettings).toEqual('function');
			expect(typeof modalbox.openVXSettings).toEqual('function');
			expect(typeof modalbox.openPromoCode).toEqual('function');
			expect(typeof modalbox.openPasswordReset).toEqual('function');
			expect(typeof modalbox.openOPCompensation).toEqual('function');
			expect(typeof modalbox.logout).toEqual('function');
			expect(typeof modalbox.isLoggedIn).toEqual('function');
			expect(typeof modalbox.hook).toEqual('function');
		});

		modalbox.hook('login', function() {
			console.log('LOG');
		});

		window.postMessage(JSON.stringify({type: 'modalbox-hook', data: { hook: 'login' }}), '*');

	});

	/** Hooks tests */
	xdescribe('existing Hooks?', function() {
		var baseUrl = 'https://ph.vxpayment.x/';

		var modalbox = new ModalboxPayment(baseUrl, window, options);

		var hooks = {};
		var loginHook = 'login';

		it("should simulate login HOOK", function () {

			runs(function() {
				modalbox.hook(loginHook, function(data) {
					hooks[data.hook] = true;
				});

				// trigger hooks
				window.postMessage(JSON.stringify({type: 'modalbox-hook', data: { hook: loginHook }}), '*');
			});

			waitsFor(function() {
				return hooks[loginHook];
			}, "Login hook not triggered", 500);

			runs(function() {
				expect(hooks.login).toEqual(true);
			});
		});

	});

});
