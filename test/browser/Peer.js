function Peer(id, stream, pcConfig) {
	var self = this;

	this.id = id;
	this.stream = stream;
	this.pcConfig = pcConfig;
	this.debug = rtcninja.debug('index.html:Peer#' + id);
	this.role = null  // 'caller' or 'callee'.

	// Create rtcninja.Connection.
	this.connection = new rtcninja.Connection(pcConfig);

	// Attach local stream.
	this.connection.addStream(stream);

	// Set events.
	this.connection.onicecandidate = function(event, candidate) {
		self.onIceCandidate && self.onIceCandidate(candidate);
	};

	this.connection.onaddstream = function(event, stream) {
		self.onAddStream && self.onAddStream(stream);
	};

	this.connection.oniceconnectionstatechange = function(event, state) {
		self.debug('iceConnectionState: %s', state);
	};

	// Functions to be set by the user.
	this.onIceCandidate = null;
	this.onAddStream = null;
}


Peer.prototype.call = function(cb) {
	this.debug('call()');

	var self = this;

	this.role = 'caller';
	this.connection.createOffer(function(offer) {
		self.connection.setLocalDescription(offer, function() {
			cb(self.connection.localDescription);
		});
	});
};


Peer.prototype.answer = function(offer, cb) {
	this.debug('answer()');

	var self = this;

	this.role = 'callee';
	this.connection.setRemoteDescription(offer, function() {
		self.connection.createAnswer(function(answer) {
			self.connection.setLocalDescription(answer, function() {
				cb(self.connection.localDescription);
			});
		});
	});
};


Peer.prototype.setRemoteDescription = function(desc) {
	this.debug('setRemoteDescription()');

	this.connection.setRemoteDescription(desc);
};


Peer.prototype.addIceCandidate = function(candidate) {
	this.debug('addIceCandidate()');

	this.connection.addIceCandidate(candidate);
};


Peer.prototype.close = function() {
	this.debug('close()');

	this.connection.close();
}
