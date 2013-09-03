var icalendar = require('icalendar'),
    request = require('request');

exports.poll = function(endpoint, options, Entry, callback)
{
  request.get({'url': endpoint, 'headers': options.headers },
              function(error, response, body) {
                if(! error) {
                  var ical = icalendar.parse_calendar(body);
                  var events = ical.events();
                  var entries = [];
                  for(var e = 0; e < events.length; ++e) {
                    entries.push(
                      new Entry(
                        events[e].properties.SUMMARY[0].value,
                        //events[e].properties.UID[0].value, // Hack due to how steamlug ical is gen.
                        events[e].properties.SUMMARY[0].value,
                        events[e].properties.DTSTART[0].value.getTime()/1000
                        )
                      );
                  }
                  callback(false, entries);
                }
                else {
                  callback(error);
                }
              });
}
