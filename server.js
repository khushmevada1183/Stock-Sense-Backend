const app = require('./src/server');

if (typeof app.startServer === 'function') {
	app.startServer();
}
