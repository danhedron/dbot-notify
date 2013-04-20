var parse = require('libxml-to-js');

exports.are_equal = function(a, b) {
	return a.guid == b.guid;
};

exports.is_update = function(old, newer) {
	return old.pubDate != newer.pubDate;
};

exports.parse = function(body, callback) {
	parse(body,'/rss/channel/item',function(err, result){
		result.forEach(function(e){
			e.guid = e.guid['#'];
			e.pubDate = e.pubDate['#'];
			e.link = e.link['#'];
			if(e.link.indexOf('#') != -1) {
				e.link = e.link.substr(0, e.link.indexOf('#'));
			}
		});
		callback(result);
	});
}

exports.printable = function(data) {
	return data.title + ' [\x0f'+data.link+']';
}
