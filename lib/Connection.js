/**
 * Expose the Connection class.
 */
module.exports = Connection;


/**
 * Dependencies.
 */
var EventEmitter =  require('events').EventEmitter;
var merge = require('merge');
var debug = require('debug')('rtcninja:Connection');
var debugerror = require('debug')('rtcninja:ERROR:Connection');
var Adapter = require('./Adapter');


/**
 * Internal constants.
 */
var C = {
	REGEXP_GOOD_CANDIDATE: new RegExp(/^candidate:/i),
	REGEXP_FIX_CANDIDATE: new RegExp(/(^a=|\r|\n)/gi),
	REGEXP_RELAY_CANDIDATE: new RegExp(/ relay /i),
	REGEXP_SDP_CANDIDATES: new RegExp(/^a=candidate:.*\r\n/igm),
	REGEXP_SDP_NON_RELAY_CANDIDATES: new RegExp(/^a=candidate:(.(?! relay ))*\r\n/igm)
};


/**
 * Internal variables.
 */
var VAR = {
	fixCandidate: null
};


function Connection(configuration) {
	debug('new | configuration: %o', configuration);

	// Inherit from EventEmitter.
	EventEmitter.call(this);

	// Clone configuration.
	this.configuration = merge(true, configuration);

	// Ensure the given configuration is fine (iceServers is mandatory).
	if (! this.configuration) {
		this.configuration = {};
	}
	if (! Array.isArray(this.configuration.iceServers)) {
		this.configuration.iceServers = [];
	}

	// Options.
	this.options = {
		iceTransportsRelay: (this.configuration.iceTransports === 'relay'),
		iceTransportsNone: (this.configuration.iceTransports === 'none'),
		gatheringTimeoutAfterRelay: this.configuration.gatheringTimeoutAfterRelay
	};

	// Remove custom options from configuration.
	delete this.configuration.gatheringTimeoutAfterRelay;

	// Create a RTCPeerConnection.
	this.pc = new Adapter.RTCPeerConnection(this.configuration);

	// localDescription and remoteDescription.
	this._localDescription = null;
	this._remoteDescription = null;

	// Latest values of PC attributes to avoid events with same value.
	this._signalingState = null;
	this._iceConnectionState = null;
	this._iceGatheringState = null;

	// Timer for options.gatheringTimeoutAfterRelay.
	this.timerGatheringTimeoutAfterRelay = null;

	// Set attributes.
	setAttributes.call(this);
}


// Inherit from EventEmitter.
Connection.prototype = Object.create(EventEmitter.prototype, {
	constructor: {
		value: Connection,
		enumerable: false,
		writable: true,
		configurable: true
	}
});


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

	// Set RTC events if pc.signalingState is 'stable'.
	if (this.pc.signalingState === 'stable') {
		setEvents.call(this);
	}

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
};


Connection.prototype.setRemoteDescription = function(description, successCallback, failureCallback) {
	debug('setRemoteDescription()');

	// Set RTC events if pc.signalingState is 'stable'.
	if (this.pc.signalingState === 'stable') {
		setEvents.call(this);
	}

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


Connection.prototype.addStream = function(stream) {
	debug('addStream() | stream: %o', stream);

	this.pc.addStream(stream);
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


Connection.prototype.close = function() {
	debug('close()');

	clearTimeout(this.timerGatheringTimeoutAfterRelay);
	delete this.timerGatheringTimeoutAfterRelay;

	this.pc.close();
};


/**
 * Private API.attributes */


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
	var options = this.options;

	pc.onnegotiationneeded = function(event) {
		debug('onnegotiationneeded()');
		self.emit('negotiationneeded', event);
	};

	pc.onicecandidate = function(event) {
		var candidate = event.candidate;

		// Ignore any candidate (event the null one) if iceTransports:'none' is set.
		if (options.iceTransportsNone) {
			return;
		}

		if (candidate) {
			var isRelay = C.REGEXP_RELAY_CANDIDATE.test(candidate.candidate);

			// Ignore if just relay candidates are requested.
			if (options.iceTransportsRelay && ! isRelay) {
				return;
			}

			// Handle options.gatheringTimeoutAfterRelay.
			if (isRelay && ! self.timerGatheringTimeoutAfterRelay && (typeof options.gatheringTimeoutAfterRelay === 'number')) {
				debug('onicecandidate() | first relay candidate found, ending gathering in %d ms', options.gatheringTimeoutAfterRelay);

				self.timerGatheringTimeoutAfterRelay = setTimeout(function() {
					debug('forced end of candidates after timeout');

					delete self.timerGatheringTimeoutAfterRelay;
					// Unset onicecandidate to ignore new candidates.
					pc.onicecandidate = null;

					self.emit('icecandidate', null, event);
				}, options.gatheringTimeoutAfterRelay);
			}

			var newCandidate = new Adapter.RTCIceCandidate({
				sdpMid: candidate.sdpMid,
				sdpMLineIndex: candidate.sdpMLineIndex,
				candidate: candidate.candidate
			});

			// Force correct candidate syntax (just check it once).
			if (VAR.fixCandidate === null) {
				if (C.REGEXP_GOOD_CANDIDATE.test(candidate.candidate)) {
					VAR.fixCandidate = false;
				}
				else {
					debug('onicecandidate() | fixing ICE candidate syntax (removing "a=" and "\\r\\n")');
					VAR.fixCandidate = true;
				}
			}
			if (VAR.fixCandidate) {
				newCandidate.candidate = candidate.candidate.replace(C.REGEXP_FIX_CANDIDATE, '');
			}

			debug('onicecandidate() | m%d(%s) %s', newCandidate.sdpMLineIndex, newCandidate.sdpMid || 'no mid', newCandidate.candidate);
			self.emit('icecandidate', newCandidate, event);
		}
		else {
			debug('onicecandidate() | end of candidates');
			self.emit('icecandidate', null, event);
		}
	};

	pc.onaddstream = function(event) {
		debug('onaddstream() | stream: %o', event.stream);
		self.emit('addstream', event.stream, event);
	};

	pc.onremovestream = function(event) {
		debug('onremovestream() | stream: %o', event.stream);
		self.emit('removestream', event.stream, event);
	};

	pc.ondatachannel = function(event) {
		debug('ondatachannel() | channel: %o', event.channel);
		self.emit('datachannel', event.channel, event);
	};

	pc.onsignalingstatechange = function(event) {
		if (self._signalingState === pc.signalingState) { return; }

		debug('onsignalingstatechange() | signalingState: %s', pc.signalingState);
		self._signalingState = pc.signalingState;
		self.emit('signalingstatechange', pc.signalingState, event);
	};

	pc.oniceconnectionstatechange = function(event) {
		if (self._iceConnectionState === pc.iceConnectionState) { return; }

		debug('oniceconnectionstatechange() | iceConnectionState: %s', pc.iceConnectionState);
		self._iceConnectionState = pc.iceConnectionState;
		self.emit('iceconnectionstatechange', pc.iceConnectionState, event);
	};

	pc.onicegatheringstatechange = function(event) {
		if (self._iceGatheringState === pc.iceGatheringState) { return; }

		debug('onicegatheringstatechange() | iceGatheringState: %s', pc.iceGatheringState);
		self._iceGatheringState = pc.iceGatheringState;
		self.emit('icegatheringstatechange', pc.iceGatheringState, event);
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
