function Peer(id, stream, configuration) {
	var self = this;

	this.debug = rtcninja.debug('index.html:Peer' + id);

	// Create rtcninja.Connection.
	this.connection = new rtcninja.Connection(configuration);

	// Attach local stream.
	this.connection.addStream(stream);
}


Peer.prototype.call = function(cb) {
	this.debug('call()');

	var self = this;

	this.connection.createOffer(function(offer) {
		self.connection.setLocalDescription(offer, function() {
			cb(self.connection.localDescription);
		});
	});
};


Peer.prototype.answer = function(offer, cb) {
	this.debug('answer()');

	var self = this;

	this.connection.setRemoteDescription(offer, function() {
		self.connection.createAnswer(function(answer) {
			self.connection.setLocalDescription(answer, function() {
				cb(self.connection.localDescription);
			});
		});
	});
};
