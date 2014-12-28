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

// Expose Connection class.
rtcninja.Connection = Connection;

// Expose WebRTC classes and functions.
rtcninja.getUserMedia = Adapter.getUserMedia;
rtcninja.RTCPeerConnection = Adapter.RTCPeerConnection;
rtcninja.RTCSessionDescription = Adapter.RTCSessionDescription;
rtcninja.RTCIceCandidate = Adapter.RTCIceCandidate;

// Expose browser object.
rtcninja.browser = Adapter.browser;

// Expose debug module.
rtcninja.debug = require('debug');
