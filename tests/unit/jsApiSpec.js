'use strict';

describe('Modalbox JS API Test', function() {

	var options = {
		agbUrl: 'http://www.visit-x.com/agb',
		host: '3135103_PrettyNina',
		hostImg: 'www.example.com/image.png',
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
			expect(modalbox.isMobile()).toBe(false);
		});

		it('should have options set', function() {
			expect(modalbox.options.aurl).toBe(options.agbUrl);
			expect(modalbox.options.pfm).toBe(options.pfm);
			expect(modalbox.options.s).toBe(options.host);
			expect(modalbox.options.simg).toBe(options.hostImg);
			expect(modalbox.options.w).toBe(options.w);
			expect(modalbox.options.ws).toBe(options.ws);
			expect(modalbox.transferToken).toBe('');
			expect(modalbox.options.ref).toBe(options.ref);
			expect(modalbox.options.ruri).toBe(options.ruri);
			expect(modalbox.options.wt).toBe(options.wt);
			expect(modalbox.redirectToken).toBe(modalbox.getGet('redirect_token'));
			expect(modalbox.options.option).toBe(options.option);
			expect(modalbox.baseUrl).toBe(baseUrl);
			expect(modalbox.startUrl).toBe(modalbox.window.location.href);
			expect(modalbox.window.ModalboxPayment).toBe(modalbox);
		});

		it('is success URL correct?', function() {
			expect(modalbox._generateSuccessUrl()).toMatch(new RegExp('http:\/\/www.visit\-x\.net\/CAMS\/DE\/Darsteller\/' + options.host, 'i'));
		});
	});

	describe('testing transfer_token', function() {
		var baseUrl = 'https://ph.vxpayment.x/';
		var win = {};
		var tt_token = 'tt_token';

		win.location = {};
		win.location.search = '?redirect_token=ttt';
		win.location.href = 'http://ph.vxpayment-test.x';
		win.parent = {};
		win.parent.document = {};
		win.parent.document.body = { clientWidth: 1000 };

		var modalbox = new ModalboxPayment(baseUrl, win, options);
		modalbox.transferToken = tt_token;

		var hostUrlRegex = 'http:\/\/www.visit\-x\.net\/CAMS\/DE\/Darsteller\/' + options.host + '\/';

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
	});

	describe('testing module config and urls', function() {
		var baseUrl = 'https://ph.vxpayment.x/';
		var win = {};
		var tt_token = 'tt_token';
		var conf = {
			showTeaser: 1
		};
		var successUrl = 'http://www.visit-x.net/';

		win.location = {};
		win.location.search = '?redirect_token=ttt';
		win.location.href = 'http://ph.vxpayment-test.x';
		win.parent = {};
		win.parent.document = {};
		win.parent.document.body = { clientWidth: 1000 };

		var modalbox = new ModalboxPayment(baseUrl, win, options, conf);
		modalbox.transferToken = tt_token;

		it('modConfig params in URL?', function() {
			expect(modalbox._generateUrl(modalbox.baseUrl, options, modalbox.modConfig)).toMatch(new RegExp('mc\[[a-z]+\]=', 'i'));
		});
	});

	describe('urls as object', function() {
		var baseUrl = 'https://ph.vxpayment.x/';
		var win = {};
		var successUrl = 'http://www.visit-x.xxx/';

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
	});

	describe('Modalbox for Landing page', function() {
		var adtv = '11467_c7c8c2_e68b6';
		var selHost = 'PrettyNina';
		var option = 'CSB10E';

		var baseUrl = '/paytour1?ovif=1&option=CSB10E&s=4310290& ' + adtv;
		var win = {};
		var successUrl = 'http://www.visit-x.xxx/';

		win.location = {};
		win.location.search = '?redirect_token=ttt';
		win.location.href = 'http://ph.vxpayment-test.x';
		win.parent = {};
		win.parent.document = {};
		win.parent.document.body = { clientWidth: 1000 };

		var opts = {
			agbUrl: 'https://www.visit-x.net/CAMS/DE/Info/Zentrum.html?submod=AGB&track=PaymentdefaultLS_Complete',
			pfm: 751,
			host: selHost,
			hostImg: 'https://www.visit-x.net/smif/host/imageRedirect?actor=' + selHost,
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
			expect(modalbox.options.aurl).toBe(opts.agbUrl);
			expect(modalbox.options.s).toBe(opts.host);
			expect(modalbox.options.simg).toBe(opts.hostImg);
			expect(modalbox.options.pfm).toBe(opts.pfm);
			expect(modalbox.options.option).toBe(opts.option);
		});
		it('adtv in URL', function() {
			var generatedUrl = modalbox._generateUrl(modalbox.baseUrl, opts);
			expect(generatedUrl).toMatch(new RegExp('adtv=' + adtv, 'i'));
		});
	});
});
