var request = require('request'),
    _ = require('underscore')._;

var notifier = function(dbot) {
	var protocols = {
		available: ['cdr', 'repo'],
		loaded: {}
	};

	function loadProtocol(name) {
		if(!(_.contains(_.keys(protocols.loaded), name))) {
			console.log('Loading protocol: ' + name);
			var r = require('./protocols/'+name+'.js');
			if(_.isObject(r)) {
				protocols.loaded[name] = r;
				return true;
			}
		}
		return false;
	}

	function getProtocol(name) {
		if(!_.contains(_.keys(protocols.loaded),name)) {
			if(!loadProtocol(name)) {
				return false;
			}
		}
		return protocols.loaded[name];
	}
	
    var announce = function(watcher, msg) {
        var servers = watcher.servers;
        console.log('Announcing: ' + msg);
        for(var s in servers) {
            if(servers.hasOwnProperty(s)) {
                for(var c = 0; c < servers[s].length; c++) {
                    dbot.say(s, servers[s][c], msg);
                }
            }
        }
    };

    function process_data(watcher, data) {
        var updated = [],
            added = [],
            removed = [],
            handler = getProtocol(watcher.protocol),
            found = false,
            x = 0, y = 0;

        // Process the new data-set to see if there's anywatcher new.
        for(x = 0; x < data.length; x++) {
            found = false;
            for(y = 0; y < watcher.item_cache.length; y++) {
                if(handler.are_equal(watcher.item_cache[y], data[x])) {
                    found = true;
                    if(handler.is_update(watcher.item_cache[y], data[x])) {
                        updated.push(handler.printable(data[x]));
                        watcher.item_cache[y] = data[x];
                    }
                }
            }

            if(found === false) {
                added.push(handler.printable(data[x]));
                watcher.item_cache.push(data[x]);
            }
        }

        x = watcher.item_cache.length;

        while(x--) {
            found = false;
            for(y = 0; y < data.length; y++) {
                if(handler.are_equal(data[y], watcher.item_cache[x])) {
                    found = true;
                }
            }

            if(found === false) {
                removed.push(handler.printable(watcher.item_cache[x]));
                watcher.item_cache.splice(x, 1);
            }
        }
        return { 'updated': updated, 'added': added, 'removed': removed };
    }

	function process(watcher, no_changes, data) {
		if(Array.isArray(data)) {
			watcher.malformed_response = false;

			if( watcher.item_cache.length === 0 ) {
				announce(watcher, 'Built initial cache with ' + data.length + ' items');
				process_data(watcher, data);
			}  
			else {
				var res = process_data(watcher, data);
				var units = 0;
				if( watcher.announce_updated && res.updated.length > 0 ) {
					announce(watcher, watcher.updated_str + ' ('+res.updated.length+'): ' 
							+ res.updated.join(', ') );
					units++;
				}
				if( watcher.announce_added && res.added.length > 0 ) {
					announce(watcher, watcher.added_str + ' ('+res.added.length+'): ' 
							+ res.added.join(', ') );
					units++;
				}
				if( watcher.announce_removed && res.removed.length > 0 ) {
					announce(watcher, watcher.removed_str + ' ('+res.removed.length+'): ' 
							+ res.removed.join(', ') );
					units++;
				}
				if(units === 0 && no_changes) {
					announce(watcher, 'No changes (' + data.length + ' items)');
				}
			}
		}
		else if( watcher.malformed_response === false ) {
			watcher.malformed_response = true;

			announce(watcher, 'Malformed response - ' + watcher.endpoint);
		}
	}

	function poll(watcher, no_changes) {
		var endpoint = watcher.endpoint;
		var handler = getProtocol(watcher.protocol);
		var ua = dbot.config.name + ' BOT notify module';
		request.get({ 'url': endpoint, 'headers': _.defaults(watcher.headers, { 'User-Agent': ua }) },
				function(error, response, body) {
					handler.parse(body, function(data) {
						process(watcher, no_changes, data);
					});
				});
	}

	var watchers = [];
	dbot.config.notify.watches.forEach(function(watch) {
		watchers.push(watch);
		watch.item_cache = [];
		watch.malformed_response = false;
		watch = _.defaults(watch, { 
			'headers': [],
			  'refresh': 60000,
			  'announce_added': true,
			  'announce_updated': true,
			  'announce_removed': true,
			  'added_str': 'New',
			  'updated_str': 'Updated',
			  'removed_str': 'Removed'
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

	commands['~forcenew'].access = 'admin';

	return {
		'commands': commands
	};
};

exports.fetch = function(dbot) {
	return notifier(dbot);
};
