/**
 * Expose the Connection class.
 */
module.exports = Connection;


/**
 * Dependencies.
 */
var EventEmitter =  require('events').EventEmitter;
var clone = require('clone');
var debug = require('debug')('rtcninja:Connection');
var Adapter = require('./Adapter');


/**
 * Internal constants.
 */
var C = {
	REGEXP_GOOD_CANDIDATE: new RegExp(/^candidate:/i),
	REGEXP_RELAY_CANDIDATE: new RegExp(/ relay /i)
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
	this.configuration = clone(configuration, false);

	// Ensure the given configuration is fine.
	// iceServers is mandatory.
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

	// Timer for options.gatheringTimeoutAfterRelay.
	this.timerGatheringTimeoutAfterRelay = null;

	// Set getters.
	setGetters.call(this);

	// Set RTC events.
	setEvents.call(this);
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


Connection.prototype.createOffer = function(successCallback, failureCallback, options) {
	debug('createOffer()');

	this.pc.createOffer(successCallback, failureCallback, options);
};


Connection.prototype.setLocalDescription = function(description, successCallback, failureCallback) {
	debug('setLocalDescription()');

	this.pc.setLocalDescription(description, successCallback, failureCallback);
};


Connection.prototype.addStream = function(stream) {
	debug('addStream() | stream: %o', stream);

	this.pc.addStream(stream);
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


function setGetters() {
	var pc = this.pc;

	Object.defineProperties(this, {
		signalingState: {
			get: function() { return pc.signalingState; }
		},
		iceConnectionState: {
			get: function() { return pc.iceConnectionState; }
		},
		iceGatheringState: {
			get: function() { return pc.iceGatheringState; }
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

		// Ignore any candidate if iceTransports:'none' is set.
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
			if (isRelay && ! self.timerGatheringTimeoutAfterRelay && (options.gatheringTimeoutAfterRelay || options.gatheringTimeoutAfterRelay === 0)) {
				debug('onicecandidate() | first relay candidate found, ending gathering in %d ms', options.gatheringTimeoutAfterRelay);

				self.timerGatheringTimeoutAfterRelay = setTimeout(function() {
					debug('forced end of candidates after timeout');

					delete self.timerGatheringTimeoutAfterRelay;
					// Unset onicecandidate to ignore new candidates.
					pc.onicecandidate = null;

					self.emit('icecandidate', null, event);
				}, options.gatheringTimeoutAfterRelay);
			}

			var data = {
				sdpMid: candidate.sdpMid,
				sdpMLineIndex: candidate.sdpMLineIndex
			};

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
				data.candidate = candidate.candidate.replace(/(^a=|\r|\n)/gi, '');
			}
			else {
				data.candidate = candidate.candidate;
			}

			debug('onicecandidate() | m%d(%s) %s', data.sdpMLineIndex, data.sdpMid || 'no mid', data.candidate);
			self.emit('icecandidate', data, event);
		}
		else {
			debug('onicecandidate() | end of candidates');
			self.emit('icecandidate', null, event);
		}
	};

	pc.onsignalingstatechange = function(event) {
		debug('onsignalingstatechange() | signalingState: %s', pc.signalingState);
		self.emit('signalingstatechange', pc.signalingState, event);
	};

	pc.onaddstream = function(event) {
		debug('onaddstream() | stream: %o', event.stream);
		self.emit('addstream', event.stream, event);
	};

	pc.onremovestream = function(event) {
		debug('onremovestream() | stream: %o', event.stream);
		self.emit('removestream', event.stream, event);
	};

	pc.oniceconnectionstatechange = function(event) {
		debug('oniceconnectionstatechange() | iceConnectionState: %s', pc.iceConnectionState);
		self.emit('iceconnectionstatechange', pc.iceConnectionState, event);
	};

	pc.onicegatheringstatechange = function(event) {
		debug('onicegatheringstatechange() | iceGatheringState: %s', pc.iceGatheringState);
		self.emit('icegatheringstatechange', pc.iceGatheringState, event);
	};

	pc.ondatachannel = function(event) {
		debug('ondatachannel() | channel: %o', event.channel);
		self.emit('datachannel', event.channel, event);
	};
}
