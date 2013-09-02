var fs = require('fs'),
    icalendar = require('icalendar');

exports.poll = function(endpoint, options, Entry, callback)
{
  // Pretend we send a HTTP request.
  fs.readFile('./test.ics', 'utf-8', function(error, file) {
    if(! error) {
      var ical = icalendar.parse_calendar(file);
      var events = ical.events();
      var entries = [];
      for(var e = 0; e < events.length; ++e) {
        entries.push(
          new Entry(
            events[e].properties.UID[0].value,
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
