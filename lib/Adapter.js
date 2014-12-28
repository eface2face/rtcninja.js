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
var browserVersion = Number(browser.version) || 0;
var isDesktop = !!(! browser.mobile || ! browser.tablet);


debug('detected browser: %s %s [mobile:%s, tablet:%s, android:%s, ios:%s]', browser.name, browser.version, !!browser.mobile, !!browser.tablet, !!browser.android, !!browser.ios);


// Chrome desktop.
if (isDesktop && browser.chrome && browserVersion >= 23) {
	getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
	RTCPeerConnection = global.webkitRTCPeerConnection;
}

// Firefox desktop.
else if (isDesktop && browser.firefox && browserVersion >= 22) {
	getUserMedia = navigator.mozGetUserMedia.bind(navigator);
	RTCPeerConnection = function(pcConfig, pcConstraints) {
		setSingleIceServer(pcConfig);
		setIceServersUrl(pcConfig);
		return new global.mozRTCPeerConnection(pcConfig, pcConstraints);
	};
}

// Opera desktop.
else if (isDesktop && browser.opera && browserVersion >= 27) {
	getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
	RTCPeerConnection = global.webkitRTCPeerConnection;
}

// Chrome Android.
else if (browser.android && browser.chrome && browserVersion >= 39) {
	getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
	RTCPeerConnection = global.webkitRTCPeerConnection;
}
// Firefox Android.
else if (browser.android && browser.firefox && browserVersion >= 33) {
	getUserMedia = navigator.mozGetUserMedia.bind(navigator);
	RTCPeerConnection = function(pcConfig, pcConstraints) {
		setSingleIceServer(pcConfig);
		setIceServersUrl(pcConfig);
		return new global.mozRTCPeerConnection(pcConfig, pcConstraints);
	};
}

// Opera Android.
else if (browser.android && browser.opera && browserVersion >= 24) {
	getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
	RTCPeerConnection = global.webkitRTCPeerConnection;
}

// Android native browser.
else if (browser.android && browserVersion >= 37) {
	getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
	RTCPeerConnection = global.webkitRTCPeerConnection;
}

// Others.
else if (navigator.webkitGetUserMedia && global.webkitRTCPeerConnection) {
	getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
	RTCPeerConnection = global.webkitRTCPeerConnection;
}
else if (navigator.mozGetUserMedia && global.mozRTCPeerConnection) {
	getUserMedia = navigator.mozGetUserMedia.bind(navigator);
	RTCPeerConnection = function(pcConfig, pcConstraints) {
		setSingleIceServer(pcConfig);
		setIceServersUrl(pcConfig);
		return new global.mozRTCPeerConnection(pcConfig, pcConstraints);
	};
}
else if (navigator.getUserMedia && global.RTCPeerConnection) {
	getUserMedia = navigator.getUserMedia.bind(navigator);
	RTCPeerConnection = global.RTCPeerConnection;
}


function setSingleIceServer(pcConfig) {
	for (var i=0, len=pcConfig.iceServers.length; i < len; i++) {
		var server = pcConfig.iceServers[i];
		var urls = server.urls || server.url;

		if (! Array.isArray(urls)) {
			continue;
		}
		else {
			// Just let the first URL.
			urls.splice(1, urls.length);
		}
	}
}


function setIceServersUrl(pcConfig) {
	for (var i=0, len=pcConfig.iceServers.length; i < len; i++) {
		if (pcConfig.iceServers[i].hasOwnProperty('urls')) {
			pcConfig.iceServers[i].url = pcConfig.iceServers[i].urls;
			delete pcConfig.iceServers[i].urls;
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

// Expose a WebRTC checker.
Adapter.hasWebRTC = !!(getUserMedia && RTCPeerConnection);

// Expose browser.
Adapter.browser = browser;
