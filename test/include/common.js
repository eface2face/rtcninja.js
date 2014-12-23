// Show uncaught errors.
process.on('uncaughtException', function(error) {
	console.error('uncaught exception:', error.stack);
	process.exit(1);
});
