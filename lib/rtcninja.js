/**
 * Expose the rtcninja function/object.
 */
module.exports = rtcninja;


/**
 * Dependencies.
 */
var debug = require('debug')('rtcninja');
var debugerror = require('debug')('rtcninja:ERROR');
debugerror.log = console.warn.bind(console);
var version = require('./version');
var Connection = require('./Connection');


function rtcninja(options) {
	debug('version %s', version);

	// Load adapter.
	var Adapter = require('./Adapter')(options || {});

	// Expose Connection class.
	rtcninja.Connection = Connection;

	// Expose WebRTC classes and functions.
	rtcninja.hasWebRTC = Adapter.hasWebRTC;
	rtcninja.getUserMedia = Adapter.getUserMedia;
	rtcninja.RTCPeerConnection = Adapter.RTCPeerConnection;
	rtcninja.RTCSessionDescription = Adapter.RTCSessionDescription;
	rtcninja.RTCIceCandidate = Adapter.RTCIceCandidate;
	rtcninja.MediaStreamTrack = Adapter.MediaStreamTrack;
	rtcninja.attachMediaStream = Adapter.attachMediaStream;
	rtcninja.closeMediaStream = Adapter.closeMediaStream;

	// Log WebRTC support.
	if (Adapter.hasWebRTC) {
		debug('WebRTC supported');
		return true;
	}
	else {
		debugerror('WebRTC not supported');
		return false;
	}
}


// Expose version property.
Object.defineProperty(rtcninja, 'version', {
	get: function() {
		return version;
	}
});

// Expose debug module.
rtcninja.debug = require('debug');


