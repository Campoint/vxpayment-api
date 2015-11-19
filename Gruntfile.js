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
			},
			rc: {
				src: ['spin.min.js', 'vxpay-iframe-rc-api.min.js'],
				dest: 'vxpay-iframe-rc.min.js'
			}
		},
	});


	grunt.registerTask('default', ['concat']);
};