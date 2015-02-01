/**
 * Expose the rtcninja function/object.
 */
module.exports = rtcninja;


/**
 * Dependencies.
 */
var browser = require('bowser').browser;
var debug = require('debug')('rtcninja');
var debugerror = require('debug')('rtcninja:ERROR');
debugerror.log = console.warn.bind(console);
var version = require('./version');
var Adapter = require('./Adapter');
var RTCPeerConnection = require('./RTCPeerConnection');


/**
 * Local variables.
 */
var called = false;


debug('version %s', version);
debug('detected browser: %s %s [mobile:%s, tablet:%s, android:%s, ios:%s]', browser.name, browser.version, !!browser.mobile, !!browser.tablet, !!browser.android, !!browser.ios);


function rtcninja(options) {
	// Load adapter.
	var interface = Adapter(options || {});  // jshint ignore:line

	called = true;

	// Expose RTCPeerConnection class.
	rtcninja.RTCPeerConnection = RTCPeerConnection;

	// Expose WebRTC API and utils.
	rtcninja.getUserMedia = interface.getUserMedia;
	rtcninja.RTCSessionDescription = interface.RTCSessionDescription;
	rtcninja.RTCIceCandidate = interface.RTCIceCandidate;
	rtcninja.MediaStreamTrack = interface.MediaStreamTrack;
	rtcninja.attachMediaStream = interface.attachMediaStream;
	rtcninja.closeMediaStream = interface.closeMediaStream;
	rtcninja.canRenegotiate = interface.canRenegotiate;

	// Log WebRTC support.
	if (interface.hasWebRTC()) {
		debug('WebRTC supported');
		return true;
	}
	else {
		debugerror('WebRTC not supported');
		return false;
	}
}

// If called without calling rtcninja(), call it.
rtcninja.hasWebRTC = function() {
	if (! called) {
		rtcninja();
	}

	return Adapter.hasWebRTC();
};

// Expose version property.
Object.defineProperty(rtcninja, 'version', {
	get: function() {
		return version;
	}
});

// Expose called property.
Object.defineProperty(rtcninja, 'called', {
	get: function() {
		return called;
	}
});


// Expose debug module.
rtcninja.debug = require('debug');

// Expose browser.
rtcninja.browser = browser;
