const logger = require('./logger');
const http = require('http');
const moment = require('moment');

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
				'amqp-listener': [{ module: "amqp-listener", "name": "river_styx", host: config.river_styx.host, exchange: config.river_styx.exchange, queue: config.river_styx.queue }]
            }))))
            .then(() => core.start())
			.then(() => new Promise((resolve, reject) => {
				core.events.on('message-in', 'release_order_signal', message => {
                    const event = message.data;
                    var request =  http.request({
    					host: 'logs.laterooms.com',
    					port: 9200,
    					path: '/releases-' + moment().format('YYYY.MM') + '/release_order_signal',
    					method: 'POST'
    				}, function(response) {
    					var allData = '';

    					response.on('data', function (chunk) {
    						allData += chunk;
    					});

    					response.on('end', function () { });
    				});

    				var setUntil;

    				if(event["@timestamp"] && event["duration"]) {
    					var durationParser = /([0-9]+) ?(.+)/i;
    					var durationMatches = durationParser.exec(event["duration"]);

    					var durationMap = {
    						'secs': 'seconds',
    						'sec': 'seconds',
    						'second': 'seconds',
    						'mins': 'minutes',
    						'min': 'minutes',
    						'minute': 'minutes',
    						'hrs': 'hours',
    						'hr': 'hours',
    						'hour': 'hours'
    					};

    					if(durationMatches) {
    						setUntil = moment().add(parseInt(durationMatches[1], 10), durationMap[durationMatches[2]] || durationMatches[2]);
    					}
    				}

    				request.write(JSON.stringify({
    					"@timestamp": event['@timestamp'],
    					"newSignal": event.newSignal,
    					"setBy": event.setBy,
    			        "reason": event.reason,
    					"setUntil": setUntil,
                        "isRotHandler": true
    				}));

    				request.end();
				});

				core.logging.logInfo('Completed Start up');
			}))
            .catch(err => core.logging.logError('Start up failed', { error: err }))
	};
};
