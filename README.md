# rtcninja.js

WebRTC API wrapper to deal with different browsers.


## Installation

* With **npm**:
```bash
$ npm install rtcninja
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


## Debugging

The library includes the Node [debug](https://github.com/visionmedia/debug) module. In order to enable debugging:

In Node set the `DEBUG=rtcninja*` environment variable before running the application, or set it at the top of the script:

```javascript
    process.env.DEBUG = 'rtcninja*';
```

In the browser run `rtcninja.debug.enable('rtcninja*');` and reload the page. Note that the debugging settings are stored into the browser LocalStorage. To disable it run `rtcninja.debug.disable('rtcninja*');`.


## Documentation

*TODO*


## Author

Iñaki Baz Castillo.


## License

ISC.
