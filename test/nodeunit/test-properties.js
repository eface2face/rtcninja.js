require('./include/common');
var rtcninja = require('../../');
var pkg = require('../../package.json');


module.exports = {
	'version': function(test) {
		test.strictEqual(rtcninja.version, pkg.version);
		test.done();
	}
};
