/**
 * Expose the Adapter object.
 */
var Adapter = module.exports = {};


/**
 * Dependencies.
 */
var browser = require('bowser').browser;
var debug = require('debug')('rtcninja:Adapter');
var TemasysPlugin = require('./TemasysPlugin');


/**
 * Local variables.
 */
var getUserMedia = null;
var RTCPeerConnection = null;
var RTCSessionDescription = null;
var RTCIceCandidate = null;
var MediaStreamTrack = null;
var attachMediaStream = null;
var browserVersion = Number(browser.version) || 0;
var isDesktop = !!(! browser.mobile || ! browser.tablet);


debug('detected browser: %s %s [mobile:%s, tablet:%s, android:%s, ios:%s]', browser.name, browser.version, !!browser.mobile, !!browser.tablet, !!browser.android, !!browser.ios);


// Chrome desktop, Chrome Android, Opera desktop, Opera Android, Android native browser
// or generic Webkit browser.
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
	MediaStreamTrack = global.MediaStreamTrack;
	attachMediaStream = function(element, stream) {
		element.src = URL.createObjectURL(stream);
		return element;
	};
}

// Firefox desktop, Firefox Android.
else if (
	(isDesktop && browser.firefox && browserVersion >= 22) ||
	(browser.android && browser.firefox && browserVersion >= 33) ||
	(navigator.mozGetUserMedia && global.mozRTCPeerConnection)
) {
	getUserMedia = navigator.mozGetUserMedia.bind(navigator);
	RTCPeerConnection = global.mozRTCPeerConnection;
	RTCSessionDescription = global.mozRTCSessionDescription;
	RTCIceCandidate = global.mozRTCIceCandidate;
	MediaStreamTrack = global.MediaStreamTrack;
	attachMediaStream = function(element, stream) {
		element.src = URL.createObjectURL(stream);
		return element;
	};
}

// Best effort.
else if (navigator.getUserMedia && global.RTCPeerConnection) {
	getUserMedia = navigator.getUserMedia.bind(navigator);
	RTCPeerConnection = global.RTCPeerConnection;
	RTCSessionDescription = global.RTCSessionDescription;
	RTCIceCandidate = global.RTCIceCandidate;
	MediaStreamTrack = global.MediaStreamTrack;
	attachMediaStream = function(element, stream) {
		element.src = URL.createObjectURL(stream);
		return element;
	};
}

// IE or Safari with the Temasys plugin.
else if ((browser.msie || browser.safari) && TemasysPlugin()) {  // jshint ignore:line
	getUserMedia = TemasysPlugin.getUserMedia;
	RTCPeerConnection = TemasysPlugin.RTCPeerConnection;
	RTCSessionDescription = TemasysPlugin.RTCSessionDescription;
	RTCIceCandidate = TemasysPlugin.RTCIceCandidate;
	MediaStreamTrack = TemasysPlugin.MediaStreamTrack;
	attachMediaStream = TemasysPlugin.attachMediaStream;
}


/**
 * Private API.
 */


function throwNonSupported(item) {
	return function() {
		throw new Error('rtcninja: WebRTC not supported, missing ' +item+ ' [browser: ' +browser.name+ ' ' +browser.version + ']');
	};
}


/**
 * Public API.
 */


// Expose browser.
Adapter.browser = browser;

// Expose a WebRTC checker.
Adapter.hasWebRTC = !!(getUserMedia && RTCPeerConnection && RTCSessionDescription && RTCIceCandidate);

// Expose getUserMedia.
if (getUserMedia) {
	Adapter.getUserMedia = function(constraints, successCallback, errorCallback) {
		debug('getUserMedia() | constraints:', constraints);

		try {
			getUserMedia(constraints,
				function(stream) {
					debug('getUserMedia() | success');
					if (successCallback) { successCallback(stream); }
				},
				function(error) {
					debug('getUserMedia() | error:', error);
					if (errorCallback) { errorCallback(error); }
				}
			);
		}
		catch(error) {
			debug('getUserMedia() | error:', error);
			if (errorCallback) { errorCallback(error); }
		}
	};
}
else {
	Adapter.getUserMedia = throwNonSupported('getUserMedia');
}

// Expose RTCPeerConnection.
Adapter.RTCPeerConnection = RTCPeerConnection || throwNonSupported('RTCPeerConnection');

// Expose RTCSessionDescription.
Adapter.RTCSessionDescription = RTCSessionDescription || throwNonSupported('RTCSessionDescription');

// Expose RTCIceCandidate.
Adapter.RTCIceCandidate = RTCIceCandidate || throwNonSupported('RTCIceCandidate');

// Expose MediaStreamTrack.
Adapter.MediaStreamTrack = MediaStreamTrack || throwNonSupported('MediaStreamTrack');

// Expose MediaStreamTrack.
Adapter.attachMediaStream = attachMediaStream || throwNonSupported('attachMediaStream');

// Expose closeMediaStream.
Adapter.closeMediaStream = function(stream) {
	if (! stream) { return; }

	var _MediaStreamTrack = global.MediaStreamTrack;

	// Latest spec states that MediaStream has no stop() method and instead must
	// call stop() on every MediaStreamTrack.
	if (_MediaStreamTrack && _MediaStreamTrack.prototype && _MediaStreamTrack.prototype.stop) {
		debug('closeMediaStream() | calling stop() on all the MediaStreamTrack');

		var tracks, i, len;

		if (_MediaStreamTrack.prototype.getTracks) {
			tracks = stream.getTracks();
			for (i=0, len=tracks.length; i<len; i++) {
				tracks[i].stop();
			}
		}
		else {
			tracks = stream.getAudioTracks();
			for (i=0, len=tracks.length; i<len; i++) {
				tracks[i].stop();
			}

			tracks = stream.getVideoTracks();
			for (i=0, len=tracks.length; i<len; i++) {
				tracks[i].stop();
			}
		}
	}

	// Deprecated by the spec, but still in use.
	else if (typeof stream.stop === 'function') {
		debug('closeMediaStream() | calling stop() on the MediaStream');

		stream.stop();
	}
};

// Expose fixPeerConnectionConfig.
Adapter.fixPeerConnectionConfig = function(pcConfig) {
	if (! Array.isArray(pcConfig.iceServers)) {
		pcConfig.iceServers = [];
	}

	for (var i=0, len=pcConfig.iceServers.length; i < len; i++) {
		var iceServer = pcConfig.iceServers[i];
		var hasUrls = iceServer.hasOwnProperty('urls');
		var hasUrl = iceServer.hasOwnProperty('url');

		if (typeof iceServer !== 'object') { continue; }

		// Has .urls but not .url, so add .url with a single string value.
		if (hasUrls && ! hasUrl) {
			iceServer.url = (Array.isArray(iceServer.urls) ? iceServer.urls[0] : iceServer.urls);
		}
		// Has .url but not .urls, so add .urls with same value.
		else if (! hasUrls && hasUrl) {
			iceServer.urls = (Array.isArray(iceServer.url) ? iceServer.url.slice() : iceServer.url);
		}

		// Ensure .url is a single string.
		if (hasUrl && Array.isArray(iceServer.url)) {
			iceServer.url = iceServer.url[0];
		}
	}
};


// Log WebRTC support.
if (Adapter.hasWebRTC) {
	debug('WebRTC supported');
}
else {
	debug('WebRTC not supported');
}
