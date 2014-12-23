/**
 * Get the package version for the browserified library.
 *
 * NOTE: This file is just load when building a browserified library (check
 * the "browser" field in package.json for details).
 */


/**
 * Expose a Lo-Dash template that will be replaced in the browserified file (gulp-template).
 */
module.exports = '<%= pkg.version %>';
