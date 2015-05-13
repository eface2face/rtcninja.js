# rtcninja.js

## Installation
## Installation
WebRTC API wrapper to deal with different browsers, eventually this library is not going to be needed. We only have to wait until W3C group in charge [finishes the specification](https://tools.ietf.org/wg/rtcweb/) and the different browsers implement it correctly :sweat_smile:.


## Installation

### **npm**:
```bash
$ npm install rtcninja
```
#### Usage
```javascript
var rtcninja = require('rtcninja');
```

### **bower**:
```bash
$ bower install rtcninja
```


## Transpiled library

Take a browserified version of the library from the `dist/` folder:

* `dist/rtcninja-X.Y.Z.js`: The uncompressed version.
* `dist/rtcninja-X.Y.Z.min.js`: The compressed production-ready version.
* `dist/rtcninja.js`: A copy of the uncompressed version.
* `dist/rtcninja.min.js`: A copy of the compressed version.

They expose the global `window.rtcninja` module.


## Usage Example

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


## Developer guide

- Create a branch with a name including your user and a meaningful word about the fix/feature you're going to implement, ie: "jesusprubio/fixstuff"
- Use [GitHub pull requests](https://help.github.com/articles/using-pull-requests).
- Conventions:
 - We use [JSHint](http://jshint.com/) and [Crockford's Styleguide](http://javascript.crockford.com/code.html).
 - Please run `grunt contribute` to be sure your code fits with them.

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