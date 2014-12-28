// Show uncaught errors.
process.on('uncaughtException', function(error) {
	console.error('uncaught exception:', error.stack);
	process.exit(1);
});

// Define global.navigator with an empty userAgent field.
global.navigator = {
	userAgent: ''
};
