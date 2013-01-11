var request = require('request');

var notifier = function(dbot) {

    var protocols = {
        'cdr': {
            'are_equal': function(a, b) {
                return a.AppID == b.AppID;
            },
            'is_update': function(db, data) {
                return (db.AppID == data.AppID) && (db.LastUpdated < data.LastUpdated);
            },
            'parse': function(body) {
                return JSON.parse(body);
            },
            'printable': function(data) {
                return data.Name + ' (' + data.AppID + ', ' + data.AppType +')';
            }
        }
    }

    var announce = function(thing, msg) {
        var servers = thing.servers;
        for(var s in servers) {
            if(servers.hasOwnProperty(s)) {
                for(var c = 0; c < servers[s].length; c++) {
                    dbot.say(s, servers[s][c], msg);
                }
            }
        }
    }

    function process_data(thing, data) {
        var updated = [];
        var added = [];
        var handler = protocols[thing.type];
        for(var x = 0; x < data.length; x++) {
            var found = false;
            for(var y = 0; y < thing.item_cache.length; y++) {
                if(handler.are_equal(thing.item_cache[y], data[x])) {
                    found = true;
                    if(handler.is_update(thing.item_cache[y], data[x])) {
                        updated.push(handler.printable(data[x]));
                        thing.item_cache[y] = data[x];
                    }
                }
            }
            if(found === false) {
                added.push(handler.printable(data[x]));
                thing.item_cache.push(data[x]);
            }
        }
        return { 'updated': updated, 'added': added };
    }

    var checkItems = function(thing, no_changes) {
        var endpoint = thing.endpoint;
        var handler = protocols[thing.type];
        console.log('Checking ' + endpoint);
        request.post({
            'url': endpoint
        },
        function(error, response, body) {
            var data = handler.parse(body); 
            if(Array.isArray(data)) {
                if( thing.item_cache.length == 0 ) {
                    announce(thing, 'Built initial cache with ' + data.length + ' items');
                    process_data(thing,data);
                }  
                else if( thing.item_cache.length < data.length ) {
                    var res = process_data(thing, data);
                    var output = '';
                    if( res.updated.length > 0 ) {
                        output += res.updated.length;
                        output += ' updated: ';
                        output += res.updated.join(', ');
                    }
                    if( res.added.length > 0 ) {
                        output += res.added.length;
                        output += ' added: ';
                        output += res.added.join(', ');
                    }
                    announce(thing, output);
                }
                else if(no_changes) {
                    announce(thing, 'No new items (' + data.length + ' items)');
                }
            }
            else {
                announce(thing, 'Malformed response');
            }
        });
    }

    var watchers = [];
    for(var i = 0; i < dbot.config.slugnotifier.watches.length; i++) {
        console.log(JSON.stringify(dbot.config.slugnotifier.watches[i]));
        var thing = dbot.config.slugnotifier.watches[i];
        console.log('Watching: ' + thing.endpoint);
        thing.item_cache = [];
        watchers.push(thing);
        var tcal = function() {
            checkItems(thing);
            dbot.timers.addOnceTimer(thing.refresh, tcal );
        }
        tcal();
    }

    var commands = {
        '~checknow': function(event) {
            checkItems(watchers[0], true);
        },
        '~forcenew': function(event) {
            for(var i = 0; i < watchers.length; i++) {
                watchers[i].item_cache.length = watchers[i].item_cache.length-1;
                console.log(watchers[i].item_cache.length);
            }
        }
    };

    return {
        'commands': commands
    };
};

exports.fetch = function(dbot) {
    return notifier(dbot);
};
