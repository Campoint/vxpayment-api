'use strict';

module.exports = function (grunt) {
	require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

	grunt.initConfig({
		concat: {
			options: {
				separator: ';'
			},
			dist: {
				src: ['spin.min.js', 'vxpay-iframe-api.min.js'],
				dest: 'vxpay-iframe.min.js'
			}
		}
	});


	grunt.registerTask('default', ['concat']);
};