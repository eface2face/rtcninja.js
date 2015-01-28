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


function Connection(pcConfig, pcConstraints) {
	debug('new | original pcConfig:', pcConfig);

	// Set this.pcConfig and this.options.
	setConfigurationAndOptions.call(this, pcConfig);

	debug('new | processed pcConfig:', this.pcConfig);

	// Store given pcConstraints.
	this.pcConstraints = pcConstraints;

	// Own version of the localDescription.
	this._localDescription = null;

	// Latest values of PC attributes to avoid events with same value.
	this._signalingState = null;
	this._iceConnectionState = null;
	this._iceGatheringState = null;

	// Timer for options.gatheringTimeout.
	this.timerGatheringTimeout = null;

	// Timer for options.gatheringTimeoutAfterRelay.
	this.timerGatheringTimeoutAfterRelay = null;

	// Flag to ignore new gathered ICE candidates.
	this.ignoreIceGathering = false;

	// Flag set when closed.
	this.closed = false;

	// Set RTCPeerConnection.
	setPeerConnection.call(this);

	// Set properties.
	setProperties.call(this);
}


/**
 * Public API.
 */


Connection.prototype.createOffer = function(successCallback, failureCallback, options) {
	debug('createOffer()');

	var self = this;

	Adapter.fixRTCOfferOptions(options);

	this.pc.createOffer(
		function(offer) {
			if (isClosed.call(self)) { return; }
			debug('createOffer() | success');
			if (successCallback) { successCallback(offer); }
		},
		function(error) {
			if (isClosed.call(self)) { return; }
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
			if (isClosed.call(self)) { return; }
			debug('createAnswer() | success');
			if (successCallback) { successCallback(answer); }
		},
		function(error) {
			if (isClosed.call(self)) { return; }
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
		// success.
		function() {
			if (isClosed.call(self)) { return; }
			debug('setLocalDescription() | success');

			// Clear gathering timers.
			clearTimeout(self.timerGatheringTimeout);
			delete self.timerGatheringTimeout;
			clearTimeout(self.timerGatheringTimeoutAfterRelay);
			delete self.timerGatheringTimeoutAfterRelay;

			runTimerGatheringTimeout();
			if (successCallback) { successCallback(); }
		},
		// failure
		function(error) {
			if (isClosed.call(self)) { return; }
			debugerror('setLocalDescription() | error:', error);
			if (failureCallback) { failureCallback(error); }
		}
	);

	// Enable (again) ICE gathering.
	this.ignoreIceGathering = false;

	// Handle gatheringTimeout.
	function runTimerGatheringTimeout() {
		if (typeof self.options.gatheringTimeout !== 'number') { return; }
		// If setLocalDescription was already called, it may happen that
		// ICE gathering is not needed, so don't run this timer.
		if (self.pc.iceGatheringState === 'complete') { return; }

		debug('setLocalDescription() | ending gathering in %d ms (gatheringTimeout option)', self.options.gatheringTimeout);

		self.timerGatheringTimeout = setTimeout(function() {
			if (isClosed.call(self)) { return; }

			debug('forced end of candidates after gatheringTimeout timeout');

			// Clear gathering timers.
			delete self.timerGatheringTimeout;
			clearTimeout(self.timerGatheringTimeoutAfterRelay);
			delete self.timerGatheringTimeoutAfterRelay;

			// Ignore new candidates.
			self.ignoreIceGathering = true;
			if (self.onicecandidate) { self.onicecandidate({candidate: null}, null); }

		}, self.options.gatheringTimeout);
	}
};


Connection.prototype.setRemoteDescription = function(description, successCallback, failureCallback) {
	debug('setRemoteDescription()');

	var self = this;

	this.pc.setRemoteDescription(
		description,
		function() {
			if (isClosed.call(self)) { return; }
			debug('setRemoteDescription() | success');
			if (successCallback) { successCallback(); }
		},
		function(error) {
			if (isClosed.call(self)) { return; }
			debugerror('setRemoteDescription() | error:', error);
			if (failureCallback) { failureCallback(error); }
		}
	);
};


Connection.prototype.updateIce = function(pcConfig) {
	debug('updateIce() | pcConfig:', pcConfig);

	// Update this.pcConfig and this.options.
	setConfigurationAndOptions.call(this, pcConfig);

	this.pc.updateIce(this.pcConfig);

	// Enable (again) ICE gathering.
	this.ignoreIceGathering = false;
};


Connection.prototype.addIceCandidate = function(candidate, successCallback, failureCallback) {
	debug('addIceCandidate() | candidate:', candidate);

	var self = this;

	this.pc.addIceCandidate(
		candidate,
		function() {
			if (isClosed.call(self)) { return; }
			debug('addIceCandidate() | success');
			if (successCallback) { successCallback(); }
		},
		function(error) {
			if (isClosed.call(self)) { return; }
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

	// Clear gathering timers.
	clearTimeout(this.timerGatheringTimeout);
	delete this.timerGatheringTimeout;
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
 * Custom public API.
 */


Connection.prototype.reset = function() {
	debug('reset()');

	var pc = this.pc;

	// Remove events in the old PC.
	pc.onnegotiationneeded = null;
	pc.onicecandidate = null;
	pc.onaddstream = null;
	pc.onremovestream = null;
	pc.ondatachannel = null;
	pc.onsignalingstatechange = null;
	pc.oniceconnectionstatechange = null;
	pc.onicegatheringstatechange = null;
	pc.onidentityresult = null;
	pc.onpeeridentity = null;
	pc.onidpassertionerror = null;
	pc.onidpvalidationerror = null;

	// Clear gathering timers.
	clearTimeout(this.timerGatheringTimeout);
	delete this.timerGatheringTimeout;
	clearTimeout(this.timerGatheringTimeoutAfterRelay);
	delete this.timerGatheringTimeoutAfterRelay;

	// Silently close the old PC.
	pc.close();

	// Create a new PC.
	setPeerConnection.call(this);
};


/**
 * Private API.
 */


function isClosed() {
	return (
		(this.closed) ||
		(this.pc && this.pc.iceConnectionState === 'closed')
	);
}


function setConfigurationAndOptions(pcConfig) {
	// Clone pcConfig.
	this.pcConfig = merge(true, pcConfig);

	// Fix pcConfig.
	Adapter.fixPeerConnectionConfig(this.pcConfig);

	this.options = {
		iceTransportsRelay: (this.pcConfig.iceTransports === 'relay'),
		iceTransportsNone: (this.pcConfig.iceTransports === 'none'),
		gatheringTimeout: this.pcConfig.gatheringTimeout,
		gatheringTimeoutAfterRelay: this.pcConfig.gatheringTimeoutAfterRelay
	};

	// Remove custom rtcninja.Connection options from pcConfig.
	delete this.pcConfig.gatheringTimeout;
	delete this.pcConfig.gatheringTimeoutAfterRelay;
}


function setPeerConnection() {
	// Create a RTCPeerConnection.
	this.pc = new Adapter.RTCPeerConnection(this.pcConfig, this.pcConstraints);

	// Set RTC events.
	setEvents.call(this);
}


function setEvents() {
	var self = this;
	var pc = this.pc;

	pc.onnegotiationneeded = function(event) {
		if (isClosed.call(self)) { return; }

		debug('onnegotiationneeded()');
		if (self.onnegotiationneeded) { self.onnegotiationneeded(event); }
	};

	pc.onicecandidate = function(event) {
		if (isClosed.call(self)) { return; }
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
					if (isClosed.call(self)) { return; }

					debug('forced end of candidates after timeout');

					// Clear gathering timers.
					delete self.timerGatheringTimeoutAfterRelay;
					clearTimeout(self.timerGatheringTimeout);
					delete self.timerGatheringTimeout;

					// Ignore new candidates.
					self.ignoreIceGathering = true;
					if (self.onicecandidate) { self.onicecandidate({candidate: null}, null); }
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

			// Clear gathering timers.
			clearTimeout(self.timerGatheringTimeout);
			delete self.timerGatheringTimeout;
			clearTimeout(self.timerGatheringTimeoutAfterRelay);
			delete self.timerGatheringTimeoutAfterRelay;
			if (self.onicecandidate) { self.onicecandidate(event, null); }
		}
	};

	pc.onaddstream = function(event) {
		if (isClosed.call(self)) { return; }

		debug('onaddstream() | stream:', event.stream);
		if (self.onaddstream) { self.onaddstream(event, event.stream); }
	};

	pc.onremovestream = function(event) {
		if (isClosed.call(self)) { return; }

		debug('onremovestream() | stream:', event.stream);
		if (self.onremovestream) { self.onremovestream(event, event.stream); }
	};

	pc.ondatachannel = function(event) {
		if (isClosed.call(self)) { return; }

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
		if (isClosed.call(self)) { return; }

		if (pc.iceGatheringState === self._iceGatheringState) { return; }

		debug('onicegatheringstatechange() | iceGatheringState: %s', pc.iceGatheringState);
		self._iceGatheringState = pc.iceGatheringState;
		if (self.onicegatheringstatechange) { self.onicegatheringstatechange(event, pc.iceGatheringState); }
	};

	pc.onidentityresult = function(event) {
		if (isClosed.call(self)) { return; }

		debug('onidentityresult()');
		if (self.onidentityresult) { self.onidentityresult(event); }
	};

	pc.onpeeridentity = function(event) {
		if (isClosed.call(self)) { return; }

		debug('onpeeridentity()');
		if (self.onpeeridentity) { self.onpeeridentity(event); }
	};

	pc.onidpassertionerror = function(event) {
		if (isClosed.call(self)) { return; }

		debug('onidpassertionerror()');
		if (self.onidpassertionerror) { self.onidpassertionerror(event); }
	};

	pc.onidpvalidationerror = function(event) {
		if (isClosed.call(self)) { return; }

		debug('onidpvalidationerror()');
		if (self.onidpvalidationerror) { self.onidpvalidationerror(event); }
	};
}


function setProperties() {
	var self = this;

	Object.defineProperties(this, {
		peerConnection: {
			get: function() { return self.pc; }
		},

		signalingState: {
			get: function() { return self.pc.signalingState; }
		},

		iceConnectionState: {
			get: function() { return self.pc.iceConnectionState; }
		},

		iceGatheringState: {
			get: function() { return self.pc.iceGatheringState; }
		},

		localDescription: {
			get: function() {
				return getLocalDescription.call(self);
			}
		},

		remoteDescription: {
			get: function() {
				return self.pc.remoteDescription;
			}
		},

		peerIdentity: {
			get: function() { return self.pc.peerIdentity; }
		},
	});
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
