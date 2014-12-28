/**
 * Expose the rtcninja module.
 */
var rtcninja = module.exports = {};


/**
 * Dependencies.
 */
var debug = require('debug')('rtcninja');
var version = require('./version');
debug('version %s', version);
var Connection = require('./Connection');
var Adapter = require('./Adapter');


// Expose version property.
Object.defineProperty(rtcninja, 'version', {
	get: function() {
		return version;
	}
});

// Expose sub-components.
rtcninja.Connection = Connection;
rtcninja.getUserMedia = Adapter.getUserMedia;

// Expose browser object.
rtcninja.browser = Adapter.browser;

// Expose debug module.
rtcninja.debug = require('debug');
