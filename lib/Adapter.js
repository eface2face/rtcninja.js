/**
 * Expose the Adapter object.
 */
var Adapter = module.exports = {};


/**
 * Dependencies.
 */
var browser = require('bowser').browser;  // TODO: Fix when my PR accepted.
var debug = require('debug')('rtcninja:Adapter');


/**
 * Local variables.
 */
var getUserMedia = null;
var RTCPeerConnection = null;
var RTCSessionDescription = null;
var RTCIceCandidate = null;
var updateIce = null;
var browserVersion = Number(browser.version) || 0;
var isDesktop = !!(! browser.mobile || ! browser.tablet);


debug('detected browser: %s %s [mobile:%s, tablet:%s, android:%s, ios:%s]', browser.name, browser.version, !!browser.mobile, !!browser.tablet, !!browser.android, !!browser.ios);


// Chrome desktop, Chrome Android, Opera desktop, Opera Android, Android native browser
// or generic Webkit browser.
// TODO: restric versions.
if (
	(isDesktop && browser.chrome && browserVersion >= 32) ||
	(browser.android && browser.chrome && browserVersion >= 39) ||
	(isDesktop && browser.opera && browserVersion >= 27) ||
	(browser.android && browser.opera && browserVersion >= 24) ||
	(browser.android && browser.webkit && ! browser.chrome && browserVersion >= 37) ||
	(navigator.webkitGetUserMedia && global.webkitRTCPeerConnection)
) {
	getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
	RTCPeerConnection = global.webkitRTCPeerConnection;
	RTCSessionDescription = global.RTCSessionDescription;
	RTCIceCandidate = global.RTCIceCandidate;
	updateIce = global.webkitRTCPeerConnection.prototype.updateIce;
}

// Firefox desktop, Firefox Android.
// TODO: restric versions.
else if (
	(isDesktop && browser.firefox && browserVersion >= 22) ||
	(browser.android && browser.firefox && browserVersion >= 33) ||
	(navigator.mozGetUserMedia && global.mozRTCPeerConnection)
) {
	getUserMedia = navigator.mozGetUserMedia.bind(navigator);
	RTCPeerConnection = function(pcConfig) {
		useIceServersUrl(pcConfig);
		setIceServerSingleUrl(pcConfig);
		return new global.mozRTCPeerConnection(pcConfig);
	};
	RTCSessionDescription = global.mozRTCSessionDescription;
	RTCIceCandidate = global.mozRTCIceCandidate;
	updateIce = function(pcConfig) {
		// This function is called with the mozRTCPeerConnection binded as this.
		useIceServersUrl(pcConfig);
		setIceServerSingleUrl(pcConfig);
		this.updateIce(pcConfig);
	};
}

// Best effort.
else if (navigator.getUserMedia && global.RTCPeerConnection) {
	getUserMedia = navigator.getUserMedia.bind(navigator);
	RTCPeerConnection = global.RTCPeerConnection;
	RTCSessionDescription = global.RTCSessionDescription;
	RTCIceCandidate = global.RTCIceCandidate;
	updateIce = global.RTCPeerConnection.prototype.updateIce;
}


/**
 * If .urls is found copy its value as .url (and keep the .urls).
 */
function useIceServersUrl(pcConfig) {
	if (! pcConfig) { return; }

	for (var i=0, len=pcConfig.iceServers.length; i < len; i++) {
		if (pcConfig.iceServers[i].hasOwnProperty('urls')) {
			pcConfig.iceServers[i].url = pcConfig.iceServers[i].urls;
		}
	}
}


/**
 * Ensure .url is a single URL string.
 */
function setIceServerSingleUrl(pcConfig) {
	if (! pcConfig) { return; }

	for (var i=0, len=pcConfig.iceServers.length; i < len; i++) {
		var server = pcConfig.iceServers[i];
		var url = server.url;

		if (Array.isArray(url)) {
			server.url = url[0];
		}
	}
}


function throwNonSupported(item) {
	return function() {
		throw new Error('rtcninja: WebRTC not supported, missing ' +item+ ' [browser: ' +browser.name+ ' ' +browser.version + ']');
	};
}


// Expose getUserMedia.
Adapter.getUserMedia = getUserMedia || throwNonSupported('getUserMedia');

// Expose RTCPeerConnection.
Adapter.RTCPeerConnection = RTCPeerConnection || throwNonSupported('RTCPeerConnection');

// Expose RTCSessionDescription.
Adapter.RTCSessionDescription = RTCSessionDescription || throwNonSupported('RTCSessionDescription');

// Expose RTCIceCandidate.
Adapter.RTCIceCandidate = RTCIceCandidate || throwNonSupported('RTCIceCandidate');

// Expose updateIce.
Adapter.updateIce = updateIce;

// Expose a WebRTC checker.
Adapter.hasWebRTC = !!(getUserMedia && RTCPeerConnection);

// Expose browser.
Adapter.browser = browser;
