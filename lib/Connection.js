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


function Connection(configuration) {
	debug('new | configuration: %o', configuration);

	// Set configuration and options.
	setConfigurationAndOptions.call(this, configuration);

	// Create a RTCPeerConnection.
	this.pc = new Adapter.RTCPeerConnection(this.configuration);

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

	this.pc.createOffer(
		function(offer) {
			debug('createOffer() | success');
			if (successCallback) { successCallback(offer); }
		},
		function(error) {
			debugerror('createOffer() | error:', error);
			if (failureCallback) { failureCallback(error); }
		},
		options
	);
};


Connection.prototype.createAnswer = function(successCallback, failureCallback, options) {
	debug('createAnswer()');

	this.pc.createAnswer(
		function(answer) {
			debug('createAnswer() | success');
			if (successCallback) { successCallback(answer); }
		},
		function(error) {
			debugerror('createAnswer() | error:', error);
			if (failureCallback) { failureCallback(error); }
		},
		options
	);
};


Connection.prototype.setLocalDescription = function(description, successCallback, failureCallback) {
	debug('setLocalDescription()');

	this.pc.setLocalDescription(
		description,
		function() {
			debug('setLocalDescription() | success');
			if (successCallback) { successCallback(); }
		},
		function(error) {
			debugerror('setLocalDescription() | error:', error);
			if (failureCallback) { failureCallback(error); }
		}
	);

	// Enable (again) ICE gathering.
	this.ignoreIceGathering = false;
};


Connection.prototype.setRemoteDescription = function(description, successCallback, failureCallback) {
	debug('setRemoteDescription()');

	this.pc.setRemoteDescription(
		description,
		function() {
			debug('setRemoteDescription() | success');
			if (successCallback) { successCallback(); }
		},
		function(error) {
			debugerror('setRemoteDescription() | error:', error);
			if (failureCallback) { failureCallback(error); }
		}
	);
};


Connection.prototype.updateIce = function(configuration) {
	debug('updateIce() | configuration: %o', configuration);

	Adapter.updateIce.call(this.pc, configuration);

	// Update configuration and options if the above call did not fail.
	setConfigurationAndOptions.call(this, configuration);

	// Enable (again) ICE gathering.
	this.ignoreIceGathering = false;
};


Connection.prototype.addIceCandidate = function(candidate, successCallback, failureCallback) {
	debug('addIceCandidate() | candidate: %o', candidate);

	this.pc.addIceCandidate(
		candidate,
		function() {
			debug('addIceCandidate() | success');
			if (successCallback) { successCallback(); }
		},
		function(error) {
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
	debug('addStream() | stream: %o', stream);

	this.pc.addStream(stream);
};


Connection.prototype.removeStream = function(stream) {
	debug('removeStream() | stream: %o', stream);

	this.pc.removeStream(stream);
};


Connection.prototype.close = function() {
	debug('close()');

	clearTimeout(this.timerGatheringTimeoutAfterRelay);
	delete this.timerGatheringTimeoutAfterRelay;

	this.pc.close();
};


/**
 * Private API.
 */


function setConfigurationAndOptions(configuration) {
	// Clone configuration.
	this.configuration = merge(true, configuration);

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
		}
	});
}


function setEvents() {
	var self = this;
	var pc = this.pc;

	pc.onnegotiationneeded = function(event) {
		debug('onnegotiationneeded()');
		if (self.onnegotiationneeded) { self.onnegotiationneeded(event); }
	};

	pc.onicecandidate = function(event) {
		var candidate = event.candidate;

		if (self.ignoreIceGathering) { return; }

		// Ignore any candidate (event the null one) if iceTransports:'none' is set.
		if (self.options.iceTransportsNone) { return; }

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
		debug('onaddstream() | stream: %o', event.stream);
		if (self.onaddstream) { self.onaddstream(event, event.stream); }
	};

	pc.onremovestream = function(event) {
		debug('onremovestream() | stream: %o', event.stream);
		if (self.onremovestream) { self.onremovestream(event, event.stream); }
	};

	pc.ondatachannel = function(event) {
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
		if (pc.iceGatheringState === self._iceGatheringState) { return; }

		debug('onicegatheringstatechange() | iceGatheringState: %s', pc.iceGatheringState);
		self._iceGatheringState = pc.iceGatheringState;
		if (self.onicegatheringstatechange) { self.onicegatheringstatechange(event, pc.iceGatheringState); }
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
