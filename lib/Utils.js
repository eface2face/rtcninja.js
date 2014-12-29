/**
 * Expose the Utils object.
 */
var Utils = module.exports = {};


/**
 * Dependencies.
 */
var debug = require('debug')('rtcninja:Utils');
var debugerror = require('debug')('rtcninja:ERROR:Utils');


Utils.attachMediaStream = function(element, stream) {
	// TODO
	element.src = URL.createObjectURL(stream);
};


Utils.closeMediaStream = function(stream) {
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

	else {
		debugerror('closeMediaStream() | no stop() method neither in MediaStreamTrack nor in MediaStream');
	}
};
