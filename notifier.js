var request = require('request'),
    jsdom = require('jsdom'),
    _ = require('underscore')._;

var notifier = function(dbot) {
    // Declare Protocols here.
    var protocols = {
        'cdr': {
            'are_equal': function(a, b) {
                return a.AppID == b.AppID;
            },
            'is_update': function(db, data) {
                if( db.AppID != data.AppID ) { // danharibo pls
                    return false;
                }
                
                if( ( db.LastUpdated < data.LastUpdated )
            //	||  ( !db.PriceDiscount && data.PriceDiscount ) // these
            //	||  ( db.PriceDiscount && !data.PriceDiscount ) // two shouldn't be required, but will see
                ||  ( db.PriceDiscount != data.PriceDiscount )
                ) {
                    return true;
                }
                
                return false;
            },
            'parse': function(body) {
                try {
                    return JSON.parse(body).data;
                } catch(e) {
                    return undefined;
                }
            },
            'printable': function(data, thing) {
                return data.Name + ' [ http://steamdb.info/app/' + data.AppID + '/#section_history ' + data.AppType + ' ' + ( data.PriceDiscount ? ( ' -' + data.PriceDiscount + '% ' ) : '' ) + ']'; 
            }
        },
        'repo': {
            'are_equal': function(a, b) {
                return a.Name == b.Name;
            },
            'is_update': function(db, data) {
            },
            'parse': function(body) {
                var dom = jsdom.jsdom(body, null, null);
                var hrefs = dom.querySelectorAll('a[href$=deb]');
                var items = [];
                for(var i = 0; i < hrefs.length; i++) {
                    items.push( { 'Name': hrefs[i].getAttribute('href') } );
                }
                return items;
            },
            'printable': function(data) {
                return data.Name;
            }
        }
    }

    var announce = function(thing, msg) {
        var servers = thing.servers;
        console.log('Announcing: ' + msg);
        for(var s in servers) {
            if(servers.hasOwnProperty(s)) {
                for(var c = 0; c < servers[s].length; c++) {
                    dbot.say(s, servers[s][c], msg);
                }
            }
        }
    }

    function process_data(thing, data) {
        var updated = []; var added = []; var removed = [];
        var handler = protocols[thing.type];

        // Process the new data-set to see if there's anything new.
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

        for(var x = 0; x < thing.item_cache.length; x++) {
            var found = false;
            for(var y = 0; y < data.length; y++) {
                if(handler.are_equal(data[y], thing.item_cache[x])) {
                    found = true;
                }
            }

            if(found === false) {
                removed.push(handler.printable(thing.item_cache[x]));
                thing.item_cache.splice(x, 1);
            }
        }
        return { 'updated': updated, 'added': added, 'removed': removed };
    }

    function poll(thing, no_changes) {
        var endpoint = thing.endpoint;
        var handler = protocols[thing.type];
        var ua = dbot.config.name + ' BOT notify module';
        request.get({ 'url': endpoint, 'headers': _.defaults(thing.headers, { 'User-Agent': ua }) },
        function(error, response, body) {
            var data = handler.parse(body);
            if(Array.isArray(data)) {
                if( thing.item_cache.length == 0 ) {
                    announce(thing, 'Built initial cache with ' + data.length + ' items');
                    process_data(thing, data);
                }  
                else {
                    var res = process_data(thing, data);
                    var units = 0;
                    if( res.updated.length > 0 ) {
                        announce(thing, res.updated.length + ' updated: ' 
                                  + res.updated.join(', ') );
                        units++;
                    }
                    if( res.added.length > 0 ) {
                        announce(thing, res.added.length + ' added: ' 
                                  + res.added.join(', ') );
                        units++;
                    }
                    if( res.removed.length > 0 ) {
                        announce(thing, res.removed.length + ' removed: ' 
                                  + res.removed.join(', ') );
                        units++;
                    }
                    if(units == 0 && no_changes) {
                        announce(thing, 'No new items (' + data.length + ' items)');
                    }
                }
            }
            else {
                announce(thing, 'Malformed response (from ' + thing.endpoint + ')');
            }
        });
    }

    var watchers = [];
    dbot.config.notifier.watches.forEach(function(watch) {
        watchers.push(watch);
        watch.item_cache = [];
        watch = _.defaults(watch, { 
            'headers': [],
            'refresh': 60000  
        });
        dbot.api.timers.addTimer(watch.refresh, function() {
            poll(watch);
        });
    });

    var commands = {
        '~checknow': function(event) {
            for(var i = 0; i < watchers.length; i++) {
                poll(watchers[i], true);
            }
        },
        '~forcenew': function(event) {
            for(var i = 0; i < watchers.length; i++) {
                if(watchers[i].item_cache.length > 0) {
                    watchers[i].item_cache.length = watchers[i].item_cache.length-1;
                }
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
