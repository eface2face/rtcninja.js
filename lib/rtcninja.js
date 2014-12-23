/**
 * Expose the rtcninja module.
 */
var rtcninja = module.exports = {};


/**
 * Dependencies.
 */
var version = require('./version');
// var debug = require('debug')('rtcninja');


// Expose version property.
Object.defineProperty(rtcninja, 'version', {
	get: function() {
		return version;
	}
});
