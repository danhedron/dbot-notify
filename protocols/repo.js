exports.are_equal = function(a, b) {
	return a.Name === b.Name;
}
exports.is_update = function(db, data) {
	return false;
}
exports.parse = function(body, callback) {
	var dom = jsdom.jsdom(body, null, null);
	var hrefs = dom.querySelectorAll('a[href$=deb]');
	var items = [];
	for(var i = 0; i < hrefs.length; i++) {
		items.push( { exports.Name = hrefs[i].getAttribute('href') } );
	}
	callback(items);
}
exports.printable = function(data) {
	return data.Name;
}
