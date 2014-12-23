/**
 * Get the package version for the Node.js library.
 *
 * NOTE: This file is just load when running the library on Node.js (check the
 * "browser" field in package.json for details).
 */


/**
 * Expose the 'version' field of package.json.
 */
module.exports = require('../package.json').version;

