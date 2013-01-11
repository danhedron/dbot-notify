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

    function process_new(data) {
        var updated = [];
        var added = [];
        for(var x = 0; x < data.length; x++) {
            var found = false;
            data[x].toString = function() { return this.Name + ' (' + this.AppID + ', ' + this.AppType +')'; };
            for(var y = 0; y < item_cache.length; y++) {
                if(item_cache[y].AppID == data[x].AppID) {
                    found = true;
                    if(item_cache[y].LastUpdated < data[x].LastUpdated) {
                        updated.push(data[x]);
                        item_cache[y] = data[x];
                    }
                }
            }
            if(found === false) {
                added.push(data[x]);
                item_cache.push(data[x]);
            }
        }
        return { 'updated': updated, 'added': added };
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
                    process_new(data);
                }  
                else if( item_cache.length < data.length ) {
                    var res = process_new(data);
                    var output = [];
                    if( res.updated.length > 0 ) {
                        output.push(res.updated.length);
                        output.push('updated:');
                        output.push(res.updated.join(', '));
                    }
                    if( res.added.length > 0 ) {
                        output.push(res.added.length);
                        output.push('added:');
                        output.push(res.added.join(', '));
                    }
                    announce(output.join(' '));
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
