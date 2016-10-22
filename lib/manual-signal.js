const http = require('http');
const moment = require('moment');

const durationParser = /([0-9]+) ?(.+)/i;
const durationMap = {
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

module.exports = function(app, config) {
    const logger = app.logging.forModule('RoT Manual Signal');

    return {
        start: () => new Promise(resolve => {
            logger.logInfo('Starting Release Order Manual Signal Handler');

            app.events.on('message-in', 'release_order_signal', message => {
                const event = message.data;
                var request =  http.request({
					host: config.elasticsearch.host,
					port: config.elasticsearch.port,
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
					const durationMatches = durationParser.exec(event["duration"]);

					if(durationMatches) {
						setUntil = moment().add(parseInt(durationMatches[1], 10), durationMap[durationMatches[2]] || durationMatches[2]);
					}
				}

				request.write(JSON.stringify({
					"@timestamp": event['@timestamp'],
					"newSignal": event.newSignal,
					"setBy": event.setBy,
			        "reason": event.reason,
					"setUntil": setUntil
				}));

				request.end();
			});

            resolve();
        })
    };
};
