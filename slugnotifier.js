var request = require('request');

var notifier = function(dbot) {

    var announce = function(msg) {
        var servers = dbot.config.slugnotifier.servers;
        for(var s in servers) {
            if(servers.hasOwnProperty(s)) {
                for(var c = 0; c < servers[s].length; c++) {
                    dbot.say(s, servers[s][c], msg);
                }
            }
        }
    }

    var checkItems = function(notifchange) {
        var endpoint = dbot.config.slugnotifier.endpoint;
        console.log('Checking ' + endpoint);
        request.post({
            'url': endpoint
        },
        function(error, response, body) {
            var data = JSON.parse(body);
            if(Array.isArray(data)) {
                if( item_cache.length == 0 ) {
                    announce('Built initial cache with ' + data.length + ' items');
                    for(var i = 0; i < data.length; i++) {
                        item_cache.push(data[i].AppID);
                    }
                }  
                else if( item_cache.length < data.length ) {
                    var delta = data.length - item_cache.length;
                    var new_items = [];
                    for(var i = 0; i < data.length; i++) {
                        console.log(data[i].AppID);
                        if(item_cache.indexOf(data[i].AppID) == -1) {
                            new_items.push(data[i].Name + ' (' + data[i].AppID + ')');
                            item_cache.push(data[i].AppID);
                        }
                    }
                    announce(new_items.length + ' new items: ' + new_items.join(', '));
                }
                else if(notifchange) {
                    announce('No new items (' + data.length + ' items)');
                }
            }
            else {
                announce('Malformed response');
            }
        });
    }

    var tcal = function() {
        checkItems();
        dbot.timers.addOnceTimer(dbot.config.slugnotifier.refresh, tcal );
    }
    tcal();

    var item_cache = [];

    var commands = {
        '~checknow': function(event) {
            checkItems(true);
        },
        '~forcenew': function(event) {
            item_cache.length = item_cache.length-1;
        }
    };

    return {
        'commands': commands
    };
};

exports.fetch = function(dbot) {
    return notifier(dbot);
};
