function Peer(id, stream, configuration) {
	var self = this;

	this.debug = rtcninja.debug('index.html:Peer' + id);

	// Create rtcninja.Connection.
	this.connection = new rtcninja.Connection(configuration);

	// Attach local stream.
	this.connection.addStream(stream);
}


Peer.prototype.call = function(callback, errback) {
	this.debug('call()');

	var self = this;

	this.connection.createOffer(
		// success
		function(offer) {
			self.connection.setLocalDescription(offer,
				// success
				function() {
					callback(self.connection.localDescription);
				},
				// failure
				errback
			);
		},
		// failure
		errback
	);
};


Peer.prototype.answer = function(offer, callback, errback) {
	this.debug('answer()');

	var self = this;

	this.connection.setRemoteDescription(offer,
		// success
		function() {
			self.connection.createAnswer(
				// success
				function(answer) {
					self.connection.setLocalDescription(answer,
						// success
						function() {
							callback(self.connection.localDescription);
						},
						// failure
						errback
					);
				},
				// failure
				errback
			);
		},
		// failure
		errback
	);
};
