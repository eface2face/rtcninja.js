/*
 * rtcninja.js v0.1.3
 * WebRTC API wrapper to deal with different browsers
 * Copyright 2014-2015 Iñaki Baz Castillo <ibc@aliax.net>
 * License ISC
 */

!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var n;"undefined"!=typeof window?n=window:"undefined"!=typeof global?n=global:"undefined"!=typeof self&&(n=self),n.rtcninja=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
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
var browserVersion = Number(browser.version) || 0;
var isDesktop = !!(! browser.mobile || ! browser.tablet);


function Adapter(options) {
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

	// IE or Safari with the Temasys plugin.
	else if ((browser.msie || browser.safari) && options.TemasysPlugin && options.TemasysPlugin(options.TemasysPluginOptions)) {
		var TemasysPlugin = options.TemasysPlugin;

		getUserMedia = TemasysPlugin.getUserMedia;
		RTCPeerConnection = TemasysPlugin.RTCPeerConnection;
		RTCSessionDescription = TemasysPlugin.RTCSessionDescription;
		RTCIceCandidate = TemasysPlugin.RTCIceCandidate;
		MediaStreamTrack = TemasysPlugin.MediaStreamTrack;
		attachMediaStream = TemasysPlugin.attachMediaStream;
	}

	// Best effort (may be adater.js is loaded).
	else if (navigator.getUserMedia && global.RTCPeerConnection) {
		getUserMedia = navigator.getUserMedia.bind(navigator);
		RTCPeerConnection = global.RTCPeerConnection;
		RTCSessionDescription = global.RTCSessionDescription;
		RTCIceCandidate = global.RTCIceCandidate;
		MediaStreamTrack = global.MediaStreamTrack;
		attachMediaStream = global.attachMediaStream || function(element, stream) {
			element.src = URL.createObjectURL(stream);
			return element;
		};
	}


	function throwNonSupported(item) {
		return function() {
			throw new Error('rtcninja: WebRTC not supported, missing ' +item+ ' [browser: ' +browser.name+ ' ' +browser.version + ']');
		};
	}

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

	return Adapter;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"bowser":5,"debug":6}],2:[function(require,module,exports){
/**
 * Expose the Connection class.
 */
module.exports = Connection;


/**
 * Dependencies.
 */
var merge = require('merge');
var debug = require('debug')('rtcninja:Connection');
var debugerror = require('debug')('rtcninja:ERROR:Connection');
debugerror.log = console.warn.bind(console);
var Adapter = require('./Adapter');


/**
 * Internal constants.
 */
var C = {
	REGEXP_NORMALIZED_CANDIDATE: new RegExp(/^candidate:/i),
	REGEXP_FIX_CANDIDATE: new RegExp(/(^a=|\r|\n)/gi),
	REGEXP_RELAY_CANDIDATE: new RegExp(/ relay /i),
	REGEXP_SDP_CANDIDATES: new RegExp(/^a=candidate:.*\r\n/igm),
	REGEXP_SDP_NON_RELAY_CANDIDATES: new RegExp(/^a=candidate:(.(?! relay ))*\r\n/igm)
};


/**
 * Internal variables.
 */
var VAR = {
	normalizeCandidate: null
};


function Connection(configuration, constraints) {
	debug('new | original configuration:', configuration);

	// Set this.configuration and this.options.
	setConfigurationAndOptions.call(this, configuration);

	debug('new | processed configuration:', this.configuration);

	// Create a RTCPeerConnection.
	this.pc = new Adapter.RTCPeerConnection(this.configuration, constraints);

	// Own version of the localDescription.
	this._localDescription = null;

	// Latest values of PC attributes to avoid events with same value.
	this._signalingState = null;
	this._iceConnectionState = null;
	this._iceGatheringState = null;

	// Timer for options.gatheringTimeoutAfterRelay.
	this.timerGatheringTimeoutAfterRelay = null;

	// Flag to ignore new gathered ICE candidates.
	this.ignoreIceGathering = false;

	// Flag set when closed.
	this.closed = false;

	// Set attributes.
	setAttributes.call(this);

	// Set RTC events.
	setEvents.call(this);
}


/**
 * Public API.
 */


Connection.prototype.createOffer = function(successCallback, failureCallback, options) {
	debug('createOffer()');

	var self = this;

	this.pc.createOffer(
		function(offer) {
			if (self.closed) { return; }
			debug('createOffer() | success');
			if (successCallback) { successCallback(offer); }
		},
		function(error) {
			if (self.closed) { return; }
			debugerror('createOffer() | error:', error);
			if (failureCallback) { failureCallback(error); }
		},
		options
	);
};


Connection.prototype.createAnswer = function(successCallback, failureCallback, options) {
	debug('createAnswer()');

	var self = this;

	this.pc.createAnswer(
		function(answer) {
			if (self.closed) { return; }
			debug('createAnswer() | success');
			if (successCallback) { successCallback(answer); }
		},
		function(error) {
			if (self.closed) { return; }
			debugerror('createAnswer() | error:', error);
			if (failureCallback) { failureCallback(error); }
		},
		options
	);
};


Connection.prototype.setLocalDescription = function(description, successCallback, failureCallback) {
	debug('setLocalDescription()');

	var self = this;

	this.pc.setLocalDescription(
		description,
		function() {
			if (self.closed) { return; }
			debug('setLocalDescription() | success');
			if (successCallback) { successCallback(); }
		},
		function(error) {
			if (self.closed) { return; }
			debugerror('setLocalDescription() | error:', error);
			if (failureCallback) { failureCallback(error); }
		}
	);

	// Enable (again) ICE gathering.
	this.ignoreIceGathering = false;
};


Connection.prototype.setRemoteDescription = function(description, successCallback, failureCallback) {
	debug('setRemoteDescription()');

	var self = this;

	this.pc.setRemoteDescription(
		description,
		function() {
			if (self.closed) { return; }
			debug('setRemoteDescription() | success');
			if (successCallback) { successCallback(); }
		},
		function(error) {
			if (self.closed) { return; }
			debugerror('setRemoteDescription() | error:', error);
			if (failureCallback) { failureCallback(error); }
		}
	);
};


Connection.prototype.updateIce = function(configuration) {
	debug('updateIce() | configuration:', configuration);

	// Update this.configuration and this.options.
	setConfigurationAndOptions.call(this, configuration);

	this.pc.updateIce(this.configuration);

	// Enable (again) ICE gathering.
	this.ignoreIceGathering = false;
};


Connection.prototype.addIceCandidate = function(candidate, successCallback, failureCallback) {
	debug('addIceCandidate() | candidate:', candidate);

	var self = this;

	this.pc.addIceCandidate(
		candidate,
		function() {
			if (self.closed) { return; }
			debug('addIceCandidate() | success');
			if (successCallback) { successCallback(); }
		},
		function(error) {
			if (self.closed) { return; }
			debugerror('addIceCandidate() | error:', error);
			if (failureCallback) { failureCallback(error); }
		}
	);
};


Connection.prototype.getConfiguration = function() {
	debug('getConfiguration()');

	return this.pc.getConfiguration();
};


Connection.prototype.getLocalStreams = function() {
	debug('getLocalStreams()');

	return this.pc.getLocalStreams();
};


Connection.prototype.getRemoteStreams = function() {
	debug('getRemoteStreams()');

	return this.pc.getRemoteStreams();
};


Connection.getStreamById = function(streamId) {
	debug('getStreamById() | streamId:', streamId);

	this.pc.getStreamById(streamId);
};


Connection.prototype.addStream = function(stream) {
	debug('addStream() | stream:', stream);

	this.pc.addStream(stream);
};


Connection.prototype.removeStream = function(stream) {
	debug('removeStream() | stream:', stream);

	this.pc.removeStream(stream);
};


Connection.prototype.close = function() {
	debug('close()');

	this.closed = true;

	clearTimeout(this.timerGatheringTimeoutAfterRelay);
	delete this.timerGatheringTimeoutAfterRelay;

	this.pc.close();
};


Connection.prototype.createDataChannel = function() {
	debug('createDataChannel()');

	return this.pc.createDataChannel.apply(this.pc, arguments);
};


Connection.prototype.createDTMFSender = function(track) {
	debug('createDTMFSender()');

	return this.pc.createDTMFSender(track);
};


Connection.prototype.getStats = function() {
	debug('getStats()');

	return this.pc.getStats.apply(this.pc, arguments);
};


Connection.prototype.setIdentityProvider = function() {
	debug('setIdentityProvider()');

	return this.pc.setIdentityProvider.apply(this.pc, arguments);
};


Connection.prototype.getIdentityAssertion = function() {
	debug('getIdentityAssertion()');

	return this.pc.getIdentityAssertion();
};


/**
 * Private API.
 */


function setConfigurationAndOptions(configuration) {
	// Clone configuration.
	this.configuration = merge(true, configuration);

	// Fix pcConfig.
	Adapter.fixPeerConnectionConfig(this.configuration);

	this.options = {
		iceTransportsRelay: (this.configuration.iceTransports === 'relay'),
		iceTransportsNone: (this.configuration.iceTransports === 'none'),
		gatheringTimeoutAfterRelay: this.configuration.gatheringTimeoutAfterRelay
	};

	// Remove custom rtcninja.Connection options from configuration.
	delete this.configuration.gatheringTimeoutAfterRelay;
}


function setAttributes() {
	var self = this;
	var pc = this.pc;

	Object.defineProperties(this, {
		peerConnection: {
			get: function() { return pc; }
		},

		signalingState: {
			get: function() { return pc.signalingState; }
		},

		iceConnectionState: {
			get: function() { return pc.iceConnectionState; }
		},

		iceGatheringState: {
			get: function() { return pc.iceGatheringState; }
		},

		localDescription: {
			get: function() {
				return getLocalDescription.call(self);
			}
		},

		remoteDescription: {
			get: function() {
				return pc.remoteDescription;
			}
		},

		peerIdentity: {
			get: function() { return pc.peerIdentity; }
		},
	});
}


function setEvents() {
	var self = this;
	var pc = this.pc;

	pc.onnegotiationneeded = function(event) {
		if (self.closed) { return; }

		debug('onnegotiationneeded()');
		if (self.onnegotiationneeded) { self.onnegotiationneeded(event); }
	};

	pc.onicecandidate = function(event) {
		if (self.closed) { return; }
		if (self.ignoreIceGathering) { return; }

		// Ignore any candidate (event the null one) if iceTransports:'none' is set.
		if (self.options.iceTransportsNone) { return; }

		var candidate = event.candidate;

		if (candidate) {
			var isRelay = C.REGEXP_RELAY_CANDIDATE.test(candidate.candidate);

			// Ignore if just relay candidates are requested.
			if (self.options.iceTransportsRelay && ! isRelay) {
				return;
			}

			// Handle gatheringTimeoutAfterRelay.
			if (isRelay && ! self.timerGatheringTimeoutAfterRelay && (typeof self.options.gatheringTimeoutAfterRelay === 'number')) {
				debug('onicecandidate() | first relay candidate found, ending gathering in %d ms', self.options.gatheringTimeoutAfterRelay);

				self.timerGatheringTimeoutAfterRelay = setTimeout(function() {
					if (self.closed) { return; }

					debug('forced end of candidates after timeout');

					delete self.timerGatheringTimeoutAfterRelay;
					// Ignore new candidates.
					self.ignoreIceGathering = true;
					if (self.onicecandidate) { self.onicecandidate(event, null); }
				}, self.options.gatheringTimeoutAfterRelay);
			}

			var newCandidate = new Adapter.RTCIceCandidate({
				sdpMid: candidate.sdpMid,
				sdpMLineIndex: candidate.sdpMLineIndex,
				candidate: candidate.candidate
			});

			// Force correct candidate syntax (just check it once).
			if (VAR.normalizeCandidate === null) {
				if (C.REGEXP_NORMALIZED_CANDIDATE.test(candidate.candidate)) {
					VAR.normalizeCandidate = false;
				}
				else {
					debug('onicecandidate() | normalizing ICE candidates syntax (remove "a=" and "\\r\\n")');
					VAR.normalizeCandidate = true;
				}
			}
			if (VAR.normalizeCandidate) {
				newCandidate.candidate = candidate.candidate.replace(C.REGEXP_FIX_CANDIDATE, '');
			}

			debug('onicecandidate() | m%d(%s) %s', newCandidate.sdpMLineIndex, newCandidate.sdpMid || 'no mid', newCandidate.candidate);
			if (self.onicecandidate) { self.onicecandidate(event, newCandidate); }
		}

		// Null candidate (end of candidates).
		else {
			debug('onicecandidate() | end of candidates');
			clearTimeout(self.timerGatheringTimeoutAfterRelay);
			delete self.timerGatheringTimeoutAfterRelay;
			if (self.onicecandidate) { self.onicecandidate(event, null); }
		}
	};

	pc.onaddstream = function(event) {
		if (self.closed) { return; }

		debug('onaddstream() | stream:', event.stream);
		if (self.onaddstream) { self.onaddstream(event, event.stream); }
	};

	pc.onremovestream = function(event) {
		if (self.closed) { return; }

		debug('onremovestream() | stream:', event.stream);
		if (self.onremovestream) { self.onremovestream(event, event.stream); }
	};

	pc.ondatachannel = function(event) {
		if (self.closed) { return; }

		debug('ondatachannel()');
		if (self.ondatachannel) { self.ondatachannel(event, event.channel); }
	};

	pc.onsignalingstatechange = function(event) {
		if (pc.signalingState === self._signalingState) { return; }

		debug('onsignalingstatechange() | signalingState: %s', pc.signalingState);
		self._signalingState = pc.signalingState;
		if (self.onsignalingstatechange) { self.onsignalingstatechange(event, pc.signalingState); }
	};

	pc.oniceconnectionstatechange = function(event) {
		if (pc.iceConnectionState === self._iceConnectionState) { return; }

		debug('oniceconnectionstatechange() | iceConnectionState: %s', pc.iceConnectionState);
		self._iceConnectionState = pc.iceConnectionState;
		if (self.oniceconnectionstatechange) { self.oniceconnectionstatechange(event, pc.iceConnectionState); }
	};

	pc.onicegatheringstatechange = function(event) {
		if (self.closed) { return; }

		if (pc.iceGatheringState === self._iceGatheringState) { return; }

		debug('onicegatheringstatechange() | iceGatheringState: %s', pc.iceGatheringState);
		self._iceGatheringState = pc.iceGatheringState;
		if (self.onicegatheringstatechange) { self.onicegatheringstatechange(event, pc.iceGatheringState); }
	};

	pc.onidentityresult = function(event) {
		if (self.closed) { return; }

		debug('onidentityresult()');
		if (self.onidentityresult) { self.onidentityresult(event); }
	};

	pc.onpeeridentity = function(event) {
		if (self.closed) { return; }

		debug('onpeeridentity()');
		if (self.onpeeridentity) { self.onpeeridentity(event); }
	};

	pc.onidpassertionerror = function(event) {
		if (self.closed) { return; }

		debug('onidpassertionerror()');
		if (self.onidpassertionerror) { self.onidpassertionerror(event); }
	};

	pc.onidpvalidationerror = function(event) {
		if (self.closed) { return; }

		debug('onidpvalidationerror()');
		if (self.onidpvalidationerror) { self.onidpvalidationerror(event); }
	};
}


function getLocalDescription() {
	var pc = this.pc;
	var options = this.options;
	var sdp = null;

	if (! pc.localDescription) {
		this._localDescription = null;
		return null;
	}

	// Mangle the SDP string.
	if (options.iceTransportsRelay) {
		sdp = pc.localDescription.sdp.replace(C.REGEXP_SDP_NON_RELAY_CANDIDATES, '');
	}
	else if (options.iceTransportsNone) {
		sdp = pc.localDescription.sdp.replace(C.REGEXP_SDP_CANDIDATES, '');
	}

	this._localDescription = new Adapter.RTCSessionDescription({
		type: pc.localDescription.type,
		sdp: sdp || pc.localDescription.sdp
	});

	return this._localDescription;
}

},{"./Adapter":1,"debug":6,"merge":9}],3:[function(require,module,exports){
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



},{"./Adapter":1,"./Connection":2,"./version":4,"debug":6}],4:[function(require,module,exports){
/**
 * Get the package version for the browserified library.
 *
 * NOTE: This file is just load when building a browserified library (check
 * the "browser" field in package.json for details).
 */


/**
 * Expose a Lo-Dash template that will be replaced in the browserified file (gulp-template).
 */
module.exports = '0.1.3';

},{}],5:[function(require,module,exports){
/*!
  * Bowser - a browser detector
  * https://github.com/ded/bowser
  * MIT License | (c) Dustin Diaz 2014
  */

!function (name, definition) {
  if (typeof module != 'undefined' && module.exports) module.exports['browser'] = definition()
  else if (typeof define == 'function' && define.amd) define(definition)
  else this[name] = definition()
}('bowser', function () {
  /**
    * See useragents.js for examples of navigator.userAgent
    */

  var t = true

  function detect(ua) {

    function getFirstMatch(regex) {
      var match = ua.match(regex);
      return (match && match.length > 1 && match[1]) || '';
    }

    var iosdevice = getFirstMatch(/(ipod|iphone|ipad)/i).toLowerCase()
      , likeAndroid = /like android/i.test(ua)
      , android = !likeAndroid && /android/i.test(ua)
      , versionIdentifier = getFirstMatch(/version\/(\d+(\.\d+)?)/i)
      , tablet = /tablet/i.test(ua)
      , mobile = !tablet && /[^-]mobi/i.test(ua)
      , result

    if (/opera|opr/i.test(ua)) {
      result = {
        name: 'Opera'
      , opera: t
      , version: versionIdentifier || getFirstMatch(/(?:opera|opr)[\s\/](\d+(\.\d+)?)/i)
      }
    }
    else if (/windows phone/i.test(ua)) {
      result = {
        name: 'Windows Phone'
      , windowsphone: t
      , msie: t
      , version: getFirstMatch(/iemobile\/(\d+(\.\d+)?)/i)
      }
    }
    else if (/msie|trident/i.test(ua)) {
      result = {
        name: 'Internet Explorer'
      , msie: t
      , version: getFirstMatch(/(?:msie |rv:)(\d+(\.\d+)?)/i)
      }
    }
    else if (/chrome|crios|crmo/i.test(ua)) {
      result = {
        name: 'Chrome'
      , chrome: t
      , version: getFirstMatch(/(?:chrome|crios|crmo)\/(\d+(\.\d+)?)/i)
      }
    }
    else if (iosdevice) {
      result = {
        name : iosdevice == 'iphone' ? 'iPhone' : iosdevice == 'ipad' ? 'iPad' : 'iPod'
      }
      // WTF: version is not part of user agent in web apps
      if (versionIdentifier) {
        result.version = versionIdentifier
      }
    }
    else if (/sailfish/i.test(ua)) {
      result = {
        name: 'Sailfish'
      , sailfish: t
      , version: getFirstMatch(/sailfish\s?browser\/(\d+(\.\d+)?)/i)
      }
    }
    else if (/seamonkey\//i.test(ua)) {
      result = {
        name: 'SeaMonkey'
      , seamonkey: t
      , version: getFirstMatch(/seamonkey\/(\d+(\.\d+)?)/i)
      }
    }
    else if (/firefox|iceweasel/i.test(ua)) {
      result = {
        name: 'Firefox'
      , firefox: t
      , version: getFirstMatch(/(?:firefox|iceweasel)[ \/](\d+(\.\d+)?)/i)
      }
      if (/\((mobile|tablet);[^\)]*rv:[\d\.]+\)/i.test(ua)) {
        result.firefoxos = t
      }
    }
    else if (/silk/i.test(ua)) {
      result =  {
        name: 'Amazon Silk'
      , silk: t
      , version : getFirstMatch(/silk\/(\d+(\.\d+)?)/i)
      }
    }
    else if (android) {
      result = {
        name: 'Android'
      , version: versionIdentifier
      }
    }
    else if (/phantom/i.test(ua)) {
      result = {
        name: 'PhantomJS'
      , phantom: t
      , version: getFirstMatch(/phantomjs\/(\d+(\.\d+)?)/i)
      }
    }
    else if (/blackberry|\bbb\d+/i.test(ua) || /rim\stablet/i.test(ua)) {
      result = {
        name: 'BlackBerry'
      , blackberry: t
      , version: versionIdentifier || getFirstMatch(/blackberry[\d]+\/(\d+(\.\d+)?)/i)
      }
    }
    else if (/(web|hpw)os/i.test(ua)) {
      result = {
        name: 'WebOS'
      , webos: t
      , version: versionIdentifier || getFirstMatch(/w(?:eb)?osbrowser\/(\d+(\.\d+)?)/i)
      };
      /touchpad\//i.test(ua) && (result.touchpad = t)
    }
    else if (/bada/i.test(ua)) {
      result = {
        name: 'Bada'
      , bada: t
      , version: getFirstMatch(/dolfin\/(\d+(\.\d+)?)/i)
      };
    }
    else if (/tizen/i.test(ua)) {
      result = {
        name: 'Tizen'
      , tizen: t
      , version: getFirstMatch(/(?:tizen\s?)?browser\/(\d+(\.\d+)?)/i) || versionIdentifier
      };
    }
    else if (/safari/i.test(ua)) {
      result = {
        name: 'Safari'
      , safari: t
      , version: versionIdentifier
      }
    }
    else result = {}

    // set webkit or gecko flag for browsers based on these engines
    if (/(apple)?webkit/i.test(ua)) {
      result.name = result.name || "Webkit"
      result.webkit = t
      if (!result.version && versionIdentifier) {
        result.version = versionIdentifier
      }
    } else if (!result.opera && /gecko\//i.test(ua)) {
      result.name = result.name || "Gecko"
      result.gecko = t
      result.version = result.version || getFirstMatch(/gecko\/(\d+(\.\d+)?)/i)
    }

    // set OS flags for platforms that have multiple browsers
    if (android || result.silk) {
      result.android = t
    } else if (iosdevice) {
      result[iosdevice] = t
      result.ios = t
    }

    // OS version extraction
    var osVersion = '';
    if (iosdevice) {
      osVersion = getFirstMatch(/os (\d+([_\s]\d+)*) like mac os x/i);
      osVersion = osVersion.replace(/[_\s]/g, '.');
    } else if (android) {
      osVersion = getFirstMatch(/android[ \/-](\d+(\.\d+)*)/i);
    } else if (result.windowsphone) {
      osVersion = getFirstMatch(/windows phone (?:os)?\s?(\d+(\.\d+)*)/i);
    } else if (result.webos) {
      osVersion = getFirstMatch(/(?:web|hpw)os\/(\d+(\.\d+)*)/i);
    } else if (result.blackberry) {
      osVersion = getFirstMatch(/rim\stablet\sos\s(\d+(\.\d+)*)/i);
    } else if (result.bada) {
      osVersion = getFirstMatch(/bada\/(\d+(\.\d+)*)/i);
    } else if (result.tizen) {
      osVersion = getFirstMatch(/tizen[\/\s](\d+(\.\d+)*)/i);
    }
    if (osVersion) {
      result.osversion = osVersion;
    }

    // device type extraction
    var osMajorVersion = osVersion.split('.')[0];
    if (tablet || iosdevice == 'ipad' || (android && (osMajorVersion == 3 || (osMajorVersion == 4 && !mobile))) || result.silk) {
      result.tablet = t
    } else if (mobile || iosdevice == 'iphone' || iosdevice == 'ipod' || android || result.blackberry || result.webos || result.bada) {
      result.mobile = t
    }

    // Graded Browser Support
    // http://developer.yahoo.com/yui/articles/gbs
    if ((result.msie && result.version >= 10) ||
        (result.chrome && result.version >= 20) ||
        (result.firefox && result.version >= 20.0) ||
        (result.safari && result.version >= 6) ||
        (result.opera && result.version >= 10.0) ||
        (result.ios && result.osversion && result.osversion.split(".")[0] >= 6) ||
        (result.blackberry && result.version >= 10.1)
        ) {
      result.a = t;
    }
    else if ((result.msie && result.version < 10) ||
        (result.chrome && result.version < 20) ||
        (result.firefox && result.version < 20.0) ||
        (result.safari && result.version < 6) ||
        (result.opera && result.version < 10.0) ||
        (result.ios && result.osversion && result.osversion.split(".")[0] < 6)
        ) {
      result.c = t
    } else result.x = t

    return result
  }

  var bowser = detect(typeof navigator !== 'undefined' ? navigator.userAgent : '')


  /*
   * Set our detect method to the main bowser object so we can
   * reuse it to test other user agents.
   * This is needed to implement future tests.
   */
  bowser._detect = detect;

  return bowser
});

},{}],6:[function(require,module,exports){

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;

/**
 * Use chrome.storage.local if we are in an app
 */

var storage;

if (typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined')
  storage = chrome.storage.local;
else
  storage = window.localStorage;

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return ('WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      storage.removeItem('debug');
    } else {
      storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = storage.debug;
  } catch(e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

},{"./debug":7}],7:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof exports.formatArgs) {
      args = exports.formatArgs.apply(self, args);
    }
    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":8}],8:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options){
  options = options || {};
  if ('string' == typeof val) return parse(val);
  return options.long
    ? long(val)
    : short(val);
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  var match = /^((?:\d+)?\.?\d+) *(ms|seconds?|s|minutes?|m|hours?|h|days?|d|years?|y)?$/i.exec(str);
  if (!match) return;
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 's':
      return n * s;
    case 'ms':
      return n;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function short(ms) {
  if (ms >= d) return Math.round(ms / d) + 'd';
  if (ms >= h) return Math.round(ms / h) + 'h';
  if (ms >= m) return Math.round(ms / m) + 'm';
  if (ms >= s) return Math.round(ms / s) + 's';
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function long(ms) {
  return plural(ms, d, 'day')
    || plural(ms, h, 'hour')
    || plural(ms, m, 'minute')
    || plural(ms, s, 'second')
    || ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) return;
  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],9:[function(require,module,exports){
/*!
 * @name JavaScript/NodeJS Merge v1.2.0
 * @author yeikos
 * @repository https://github.com/yeikos/js.merge

 * Copyright 2014 yeikos - MIT license
 * https://raw.github.com/yeikos/js.merge/master/LICENSE
 */

;(function(isNode) {

	/**
	 * Merge one or more objects 
	 * @param bool? clone
	 * @param mixed,... arguments
	 * @return object
	 */

	var Public = function(clone) {

		return merge(clone === true, false, arguments);

	}, publicName = 'merge';

	/**
	 * Merge two or more objects recursively 
	 * @param bool? clone
	 * @param mixed,... arguments
	 * @return object
	 */

	Public.recursive = function(clone) {

		return merge(clone === true, true, arguments);

	};

	/**
	 * Clone the input removing any reference
	 * @param mixed input
	 * @return mixed
	 */

	Public.clone = function(input) {

		var output = input,
			type = typeOf(input),
			index, size;

		if (type === 'array') {

			output = [];
			size = input.length;

			for (index=0;index<size;++index)

				output[index] = Public.clone(input[index]);

		} else if (type === 'object') {

			output = {};

			for (index in input)

				output[index] = Public.clone(input[index]);

		}

		return output;

	};

	/**
	 * Merge two objects recursively
	 * @param mixed input
	 * @param mixed extend
	 * @return mixed
	 */

	function merge_recursive(base, extend) {

		if (typeOf(base) !== 'object')

			return extend;

		for (var key in extend) {

			if (typeOf(base[key]) === 'object' && typeOf(extend[key]) === 'object') {

				base[key] = merge_recursive(base[key], extend[key]);

			} else {

				base[key] = extend[key];

			}

		}

		return base;

	}

	/**
	 * Merge two or more objects
	 * @param bool clone
	 * @param bool recursive
	 * @param array argv
	 * @return object
	 */

	function merge(clone, recursive, argv) {

		var result = argv[0],
			size = argv.length;

		if (clone || typeOf(result) !== 'object')

			result = {};

		for (var index=0;index<size;++index) {

			var item = argv[index],

				type = typeOf(item);

			if (type !== 'object') continue;

			for (var key in item) {

				var sitem = clone ? Public.clone(item[key]) : item[key];

				if (recursive) {

					result[key] = merge_recursive(result[key], sitem);

				} else {

					result[key] = sitem;

				}

			}

		}

		return result;

	}

	/**
	 * Get type of variable
	 * @param mixed input
	 * @return string
	 *
	 * @see http://jsperf.com/typeofvar
	 */

	function typeOf(input) {

		return ({}).toString.call(input).slice(8, -1).toLowerCase();

	}

	if (isNode) {

		module.exports = Public;

	} else {

		window[publicName] = Public;

	}

})(typeof module === 'object' && module && typeof module.exports === 'object' && module.exports);
},{}]},{},[3])(3)
});