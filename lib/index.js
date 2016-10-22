const logger = require('./logger');
const core = require('./core');

module.exports = function() {
	function start() {
	    return new Promise(resolve => resolve(core.logging.logInfo('Starting River Styx Release Order Telegraph Signal Handler')));
	}

	return {
		start: () => start()
            .then(() => core.logging.setLogger(require('./logger')))
            .then(() => core.config.setDefault({
                "http-server": { "port": 1234 }
            }))
            .then(() => core.config.setMapToModules(config => new Promise(resolve => resolve({
                'http-server': [{ module: 'http-server', port: config['http-server'].port }],
				'amqp-listener': [{ module: "amqp-listener", "name": "river_styx", host: config.river_styx.host, exchange: config.river_styx.exchange, queue: config.river_styx.queue }],
                'manual-signal': [{ module: 'manual-signal', config.elasticsearch }]
            }))))
            .then(() => core.use('manual-signal', require('./manual-signal')))
            .then(() => core.start())
            .then(() => new Promise(resolve => resolve(core.logging.logInfo('Start up completed'))))
            .catch(err => core.logging.logError('Start up failed', { error: err }))
	};
};
