exports.are_equal = function(a, b) {
	return a.AppID === b.AppID;
};
exports.is_update = function(db, data) {
	return db.LastUpdated !== data.LastUpdated || db.PriceDiscount !== data.PriceDiscount;
};
exports.parse = function(body, callback) {
	try {
		callback(JSON.parse(body).data);
	} catch(e) {
	}
}
exports.printable = function(data) {
	return data.Name + ' [\x0fhttp://steamdb.info/app/' + data.AppID + '/#section_history ' + data.AppType + ( data.PriceDiscount ? ( ' -' + data.PriceDiscount + '%' ) : '' ) + ']'; 
};
