function Peer(id, stream, configuration) {
	this.id = id;
	this.stream = stream;
	this.configuration = configuration;
	this.debug = rtcninja.debug('index.html:Peer#' + id);
	this.role = null  // 'caller' or 'callee'.

	// Create rtcninja.Connection.
	this.connection = new rtcninja.Connection(configuration);

	// Attach local stream.
	this.connection.addStream(stream);

	this._setEvents();

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


Peer.prototype._setEvents = function() {
	this.debug('_setEvents()');

	var self = this;
	var connection = this.connection;

	connection.on('icecandidate', function(candidate) {
		self.onIceCandidate && self.onIceCandidate(candidate);
	});

	connection.on('addstream', function(stream) {
		self.onAddStream && self.onAddStream(stream);
	});

	connection.on('iceconnectionstatechange', function(state) {
		self.debug('iceConnectionState: %s', state);
	});
};

