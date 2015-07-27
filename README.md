# rtcninja.js <img src="http://www.pubnub.com/blog/wp-content/uploads/2014/01/google-webrtc-logo.png" height="30" width="30">

WebRTC API wrapper to deal with different browsers transparently, [eventually](http://iswebrtcreadyyet.com/) this library shouldn't be needed. We only have to wait until W3C group in charge [finishes the specification](https://tools.ietf.org/wg/rtcweb/) and the different browsers implement it correctly :sweat_smile:.

<img src="http://images4.fanpop.com/image/photos/21800000/browser-fight-google-chrome-21865454-600-531.jpg" height="250" width="250">

Supported environments:
* [Google Chrome](https://www.google.com/chrome/browser/desktop/index.html) (desktop & mobile)
* [Google Canary](https://www.google.com/chrome/browser/canary.html) (desktop & mobile)
* [Mozilla Firefox](https://www.mozilla.org/en-GB/firefox/new) (desktop & mobile)
* [Firefox Nigthly](https://nightly.mozilla.org/) (desktop & mobile)
* [Opera](http://www.opera.com/)
* [Vivaldi](https://vivaldi.com/)
* [CrossWalk](https://crosswalk-project.org/)
* [Cordova](cordova.apache.org): iOS support, you only have to use our plugin [following these steps](https://github.com/eface2face/cordova-plugin-iosrtc#usage).
* [Node-webkit](https://github.com/nwjs/nw.js/)


## Installation

### **npm**:

```bash
$ npm install rtcninja
```

and then:

```javascript
var rtcninja = require('rtcninja');
```

### **bower**:

```bash
$ bower install rtcninja
```


## Browserified library

Take a browserified version of the library from the `dist/` folder:

* `dist/rtcninja.js`: The uncompressed version.
* `dist/rtcninja.min.js`: The compressed production-ready version.

They expose the global `window.rtcninja` module.


## Usage

In the [examples](./examples/) folder we provide a complete one.

```javascript
// Must first call it.
rtcninja();

// Then check.
if (rtcninja.hasWebRTC()) {
    // Do something.
}
else {
    // Do something.
}
```


## Documentation

You can read the full [API documentation](docs/index.md) in the docs folder.


## Issues

https://github.com/eface2face/rtcninja.js/issues


## Developer guide

* Create a branch with a name including your user and a meaningful word about the fix/feature you're going to implement, ie: "jesusprubio/fixstuff"
* Use [GitHub pull requests](https://help.github.com/articles/using-pull-requests).
* Conventions:
 * We use [JSHint](http://jshint.com/) and [Crockford's Styleguide](http://javascript.crockford.com/code.html).
 * Please run `grunt lint` to be sure your code fits with them.


### Debugging

The library includes the Node [debug](https://github.com/visionmedia/debug) module. In order to enable debugging:

In Node set the `DEBUG=rtcninja*` environment variable before running the application, or set it at the top of the script:

```javascript
process.env.DEBUG = 'rtcninja*';
```

In the browser run `rtcninja.debug.enable('rtcninja*');` and reload the page. Note that the debugging settings are stored into the browser LocalStorage. To disable it run `rtcninja.debug.disable('rtcninja*');`.


## Copyright & License

* eFace2Face Inc.
* [MIT](./LICENSE)
