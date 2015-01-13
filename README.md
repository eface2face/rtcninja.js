# rtcninja.js

WebRTC API wrapper to deal with different browsers.


## Installation

* With **npm**:

```bash
$ npm install rtcninja
```

* With **bower**:

```bash
$ bower install rtcninja
```

## Usage in Node

```javascript
var rtcninja = require('rtcninja');
```


## Browserified library

Take a browserified version of the library from the `dist/` folder:

* `dist/rtcninja-X.Y.Z.js`: The uncompressed version.
* `dist/rtcninja-X.Y.Z.min.js`: The compressed production-ready version.
* `dist/rtcninja.js`: A copy of the uncompressed version.
* `dist/rtcninja.min.js`: A copy of the compressed version.

They expose the global `window.rtcninja` module.

```html
<script src='rtcninja-X.Y.Z.js'></script>
```


## Usage Example

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


## Debugging

The library includes the Node [debug](https://github.com/visionmedia/debug) module. In order to enable debugging:

In Node set the `DEBUG=rtcninja*` environment variable before running the application, or set it at the top of the script:

```javascript
process.env.DEBUG = 'rtcninja*';
```

In the browser run `rtcninja.debug.enable('rtcninja*');` and reload the page. Note that the debugging settings are stored into the browser LocalStorage. To disable it run `rtcninja.debug.disable('rtcninja*');`.


## Author

Iñaki Baz Castillo at [eFace2Face](http://eface2face.com).


## License

ISC.
