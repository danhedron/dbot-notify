var parse = require('libxml-to-js'),
    request = require('request');

exports.poll = function(endpoint, options, Entry, callback)
{
  request.get({ 'url': endpoint, 'headers': options.headers) },
              function(error, response, body) {
                if(error) {
                  callback(error);
                  return;
                }
                parse(body,'/rss/channel/item',function(err, result){
                  var entries = [];
                  result.forEach(function(e) {
                    if(e.link.indexOf('#') != -1) {
                      e.link = e.link.substr(0, e.link.indexOf('#'));
                    }
                    entries.push(
                      new Entry(
                        e.guid['#'],
                        e.title + ' [\x0f'+data.link+'\x0f]',
                        (new Date(e.pubDate['#']).getTime()/1000)
                        ));
                  });
                  callback(false, entries);
                });
              });
}

