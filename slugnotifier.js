var request = require('request');

var notifier = function(dbot) {
    var commands = {
        '~checknow': function(event) {
            var endpoint = dbot.config.slugnotifier.endpoint;
            request.post({
                'url': endpoint
            },
            function(error, response, body) {
                var data = JSON.parse(body);
                event.reply('got: ' + data.length + ' items');
            });
        }
    };
    commands['~checknow'].regex = [/^~checknow /, 2];

    return {
        'commands': commands
    };
};

exports.fetch = function(dbot) {
    return notifier(dbot);
};
