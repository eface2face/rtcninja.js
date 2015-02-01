# `rtcninja.RTCPeerConnection` Class API

The `rtcninja.RTCPeerConnection` class wrappes a native `(webkit|moz)RTCPeerConnection` and attempts to provide a uniform behavior across different WebRTC implementations. The provided API mimics the `RTCPeerConnection` API in the latest [WebRTC draft](http://w3c.github.io/webrtc-pc/).


### Features

* Normalization of the `pcConfig.iceServers` field (it deals with both the deprecated `url` field and the new `urls` one).
* Filtering of certain events once the `RTCPeerConnection` is closed. For example, old versions of Firefox fire `onicecandidate` or `onaddstream` events even after `close()` is called.
* Filtering of duplicate events. For example, some old browsers fire consecutive `oniceconnectionstatechange` events having the `iceConnectionState` attribute the same value in them.
* Normalization of the ICE candidate syntax. In some old browsers the `candidate` String in a `RTCIceCandidate` object contains incorrect "a=" and "\r\n". Those chars are removed.
* Addition of the `pcConfig.iceTransports` field in browsers not supporting it.


### `new rtcninja.RTCPeerConnection(pcConfig)` constructor


#### `pcConfig` {Object} param

Mandatory Object holding the [`RTCConfiguration`](http://w3c.github.io/webrtc-pc/#idl-def-RTCConfiguration) dictionary of the `RTCPeerConnection`. Some features not implemented in some browsers (such a Firefox) are implemented in JavaScript (such as `iceTransports`).

There are also custom options not present in the WebRTC specification:

* `gatheringTimeout` {Number}: ICE gathering is terminated after the given time (milliseconds) and a faked `onicecandidate` event with `candidate = null` is fired. No more `onicecandidate` events are fired once this timeout.
* `gatheringTimeoutAfterRelay` {Number}: Once the first "relay" (TURN) candidate is gathered, ICE gathering is terminated after the given time (milliseconds) and a faked `onicecandidate` event with `candidate = null` is fired. No more `onicecandidate` events are fired once this timeout.


### RTCPeerConnection API

`rtcninja.RTCPeerConnection` provides the same functions and attributes as described in the latest WebRTC draft for the `RTCPeerConnection` class. There are a few exceptions:

#### Events

All the native `RTCPeerConnection` events are fired with a single `event` argument of type `Event`. Events in `rtcninja.RTCPeerConnection` are full compatible with the original ones, but some of them also provide a second argument:

* `onicecandidate(event, candidate)`: Second argument is the normalized `event.candidate` field.
* `onaddstream(event, stream)`
* `onremovestream(event, stream)`
* `ondatachannel(event, channel)`
* `onsignalingstatechange(event, signalingState)`
* `oniceconnectionstatechange(event, iceConnectionState)`
* `onicegatheringstatechange(event, iceGatheringState)`


### `reset(pcConfig)` function

By calling `reset()` on a `rtcninja.RTCPeerConnection` instance the native `RTCPeerConnection` is silently closed (no events are fired) and a new `RTCPeerConnection` is created. No local stream is attached to it (must be done by the application).

*NOTE:* This is just useful in case the remote peer does **also** reset its `RTCPeerConnection`. Otherwise a new SDP renegotiation would fail.

#### `pcConfig` {Object} param

Same as in the `RTCPeerConnection` construtor.
