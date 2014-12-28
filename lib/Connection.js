/**
 * Expose the Connection class.
 */
module.exports = Connection;


/**
 * Dependencies.
 */
var EventEmitter =  require('events').EventEmitter;
var debug = require('debug')('rtcninja:Connection');
var Adapter = require('./Adapter');


/**
 * Internal constants.
 */
var C = {
	REGEXP_GOOD_CANDIDATE: new RegExp(/^candidate:/i)
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

	// Ensure the given configuration is fine.
	// iceServers is mandatory.
	if (! configuration) {
		configuration = {};
	}
	if (! Array.isArray(configuration.iceServers)) {
		configuration.iceServers = [];
	}

	// Store configuration.
	this.configuration = configuration || {};

	// Creawte a RTCPeerConnection.
	this.pc = new Adapter.RTCPeerConnection(this.configuration);  // jshint ignore:line

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


/**
 * Private API.
 */


function setEvents() {
	var self = this;
	var pc = this.pc;

	pc.onnegotiationneeded = function(event) {
		debug('onnegotiationneeded()');
		self.emit('negotiationneeded', event);
	};

	pc.onicecandidate = function(event) {
		var candidate = event.candidate;

		if (candidate) {
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
