'use strict';

module.exports = function (grunt) {
	require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

	grunt.initConfig({
		concat: {
			options: {
				separator: ''
			},
			dist: {
				src: ['spin.min.js', 'vxpay-iframe-api.min.js'],
				dest: 'vxpay-iframe.min.js'
			},
			dev: {
				src: ['spin.js', 'vxpay-iframe.js'],
				dest: 'vxpay-iframe-dev.js'
			}
		},
	});


	grunt.registerTask('esm', 'Generate vxpay-iframe.esm.js from vxpay-iframe.js', function () {
		var src = grunt.file.read('vxpay-iframe.js');
		var esm = 'export default ' + src
			.replace(/\}\)\(window\);\s*$/, '})(typeof window !== \'undefined\' ? window : globalThis);');
		grunt.file.write('vxpay-iframe.esm.js', esm);
		grunt.log.writeln('Created vxpay-iframe.esm.js');
	});

	grunt.registerTask('default', ['concat']);
};