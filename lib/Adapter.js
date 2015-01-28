/**
 * Expose the Adapter function/object.
 */
module.exports = Adapter;


/**
 * Dependencies.
 */
var browser = require('bowser').browser;
var debug = require('debug')('rtcninja:Adapter');
var debugerror = require('debug')('rtcninja:ERROR:Adapter');
debugerror.log = console.warn.bind(console);


/**
 * Local variables.
 */
var getUserMedia = null;
var RTCPeerConnection = null;
var RTCSessionDescription = null;
var RTCIceCandidate = null;
var MediaStreamTrack = null;
var attachMediaStream = null;
var canRenegotiate = false;
var oldSpecRTCOfferOptions = false;
var browserVersion = Number(browser.version) || 0;
var isDesktop = !!(! browser.mobile || ! browser.tablet);
var hasWebRTC = false;
var _navigator = global.navigator || {};  // Don't fail in Node.


function Adapter(options) {
	// Chrome desktop, Chrome Android, Opera desktop, Opera Android, Android native browser
	// or generic Webkit browser.
	if (
		(isDesktop && browser.chrome && browserVersion >= 32) ||
		(browser.android && browser.chrome && browserVersion >= 39) ||
		(isDesktop && browser.opera && browserVersion >= 27) ||
		(browser.android && browser.opera && browserVersion >= 24) ||
		(browser.android && browser.webkit && ! browser.chrome && browserVersion >= 37) ||
		(_navigator.webkitGetUserMedia && global.webkitRTCPeerConnection)
	) {
		hasWebRTC = true;
		getUserMedia = _navigator.webkitGetUserMedia.bind(_navigator);
		RTCPeerConnection = global.webkitRTCPeerConnection;
		RTCSessionDescription = global.RTCSessionDescription;
		RTCIceCandidate = global.RTCIceCandidate;
		MediaStreamTrack = global.MediaStreamTrack;
		attachMediaStream = function(element, stream) {
			element.src = URL.createObjectURL(stream);
			return element;
		};
		canRenegotiate = true;
		oldSpecRTCOfferOptions = false;
	}

	// Firefox desktop, Firefox Android.
	else if (
		(isDesktop && browser.firefox && browserVersion >= 22) ||
		(browser.android && browser.firefox && browserVersion >= 33) ||
		(_navigator.mozGetUserMedia && global.mozRTCPeerConnection)
	) {
		hasWebRTC = true;
		getUserMedia = _navigator.mozGetUserMedia.bind(_navigator);
		RTCPeerConnection = global.mozRTCPeerConnection;
		RTCSessionDescription = global.mozRTCSessionDescription;
		RTCIceCandidate = global.mozRTCIceCandidate;
		MediaStreamTrack = global.MediaStreamTrack;
		attachMediaStream = function(element, stream) {
			element.src = URL.createObjectURL(stream);
			return element;
		};
		canRenegotiate = false;
		oldSpecRTCOfferOptions = false;
	}

	// WebRTC plugin required. For example IE or Safari with the Temasys plugin.
	else if (
		options.plugin &&
		typeof options.plugin.isRequired === 'function' &&
		options.plugin.isRequired() &&
		typeof options.plugin.isInstalled === 'function' &&
		options.plugin.isInstalled()
	) {
		var pluginInterface = options.plugin.interface;

		hasWebRTC = true;
		getUserMedia = pluginInterface.getUserMedia;
		RTCPeerConnection = pluginInterface.RTCPeerConnection;
		RTCSessionDescription = pluginInterface.RTCSessionDescription;
		RTCIceCandidate = pluginInterface.RTCIceCandidate;
		MediaStreamTrack = pluginInterface.MediaStreamTrack;
		attachMediaStream = pluginInterface.attachMediaStream;
		canRenegotiate = pluginInterface.canRenegotiate;
		oldSpecRTCOfferOptions = true;  // TODO: UPdate when fixed in the plugin.
	}

	// Best effort (may be adater.js is loaded).
	else if (_navigator.getUserMedia && global.RTCPeerConnection) {
		hasWebRTC = true;
		getUserMedia = _navigator.getUserMedia.bind(_navigator);
		RTCPeerConnection = global.RTCPeerConnection;
		RTCSessionDescription = global.RTCSessionDescription;
		RTCIceCandidate = global.RTCIceCandidate;
		MediaStreamTrack = global.MediaStreamTrack;
		attachMediaStream = global.attachMediaStream || function(element, stream) {
			element.src = URL.createObjectURL(stream);
			return element;
		};
		canRenegotiate = false;
		oldSpecRTCOfferOptions = false;
	}


	function throwNonSupported(item) {
		return function() {
			throw new Error('rtcninja: WebRTC not supported, missing ' +item+ ' [browser: ' +browser.name+ ' ' +browser.version + ']');
		};
	}

	// Expose a WebRTC checker.
	Adapter.hasWebRTC = function() {
		return hasWebRTC;
	};

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
				debugerror('getUserMedia() | error:', error);
				if (errorCallback) { errorCallback(error); }
			}
		};
	}
	else {
		Adapter.getUserMedia = function(constraints, successCallback, errorCallback) {
			debugerror('getUserMedia() | WebRTC not supported');
			if (errorCallback) {
				errorCallback(new Error('rtcninja: WebRTC not supported, missing getUserMedia [browser: ' +browser.name+ ' ' +browser.version + ']'));
			}
			else {
				throwNonSupported('getUserMedia');
			}
		};
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

	// Expose canRenegotiate attribute.
	Adapter.canRenegotiate = canRenegotiate;

	// Expose closeMediaStream.
	Adapter.closeMediaStream = function(stream) {
		if (! stream) { return; }

		// Latest spec states that MediaStream has no stop() method and instead must
		// call stop() on every MediaStreamTrack.
		if (MediaStreamTrack && MediaStreamTrack.prototype && MediaStreamTrack.prototype.stop) {
			debug('closeMediaStream() | calling stop() on all the MediaStreamTrack');

			var tracks, i, len;

			if (stream.getTracks) {
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

	// Expose fixRTCOfferOptions.
	Adapter.fixRTCOfferOptions = function(options) {
		options = options || {};

		// New spec.
		if (! oldSpecRTCOfferOptions) {
			if (options.mandatory && options.mandatory.OfferToReceiveAudio) {
				options.offerToReceiveAudio = 1;
			}
			if (options.mandatory && options.mandatory.OfferToReceiveVideo) {
				options.offerToReceiveVideo = 1;
			}
			delete options.mandatory;
		}
		// Old spec.
		else {
			if (options.offerToReceiveAudio) {
				options.mandatory = options.mandatory || {};
				options.mandatory.OfferToReceiveAudio = true;
			}
			if (options.offerToReceiveVideo) {
				options.mandatory = options.mandatory || {};
				options.mandatory.OfferToReceiveVideo = true;
			}
		}
	};

	return Adapter;
}
