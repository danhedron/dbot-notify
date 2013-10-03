var fs = require('fs'),
    icalendar = require('icalendar'),
    notify_core = require('./notify_core'),
    Entry = notify_core.Entry, Feed = notify_core.Feed,
    Announcement = notify_core.Announcement,
    Reminder = notify_core.Reminder;

function TEST(dbot)
{
  var feeds = [
    new Feed(dbot, 'OAOSIDL Events', 'ical', 'googe', 120)
    ];

  for(var f = 0; f < feeds.length; ++f) {
    feeds[f].announcements.push(new Announcement("#oaosil", "aberwiki", ["added", "updated"]));
    feeds[f].reminders.push(new Reminder("#oaosil", "aberwiki", 500));

    feeds[f].now = function() { return 0; }

    feeds[f].processEntries([
                            new Entry("ID-1", "PSA: Owls", 510),
                            new Entry("ID-2", "PSA: Not Owls", 512)
                            ]);
    feeds[f].processEntries([
                            new Entry("ID-1", "PSA: Owls", 514),
                            new Entry("ID-2", "PSA: Not Owls", 512)
                            ]);
    feeds[f].now = function() { return 13; }
    feeds[f].processEntries([
                            new Entry("ID-1", "PSA: Owls", 514),
                            new Entry("ID-2", "PSA: Not Owls", 512)
                            ]);
    feeds[f].now = function() { return 15; }
    feeds[f].processEntries([
                            new Entry("ID-1", "PSA: Owls", 514),
                            new Entry("ID-2", "PSA: Not Owls", 512)
                            ]);
  }

  var steamlug = new Feed(dbot, 'SteamLUG', 'ical', 'googe', 120);
  steamlug.reminders.push(new Reminder('#steamlug', 'freenode', 60*60*24*7));
  steamlug.poll(false);

  //var stlg = new Feed('SteamLUG Announcments', 'rss', '');
}

TEST({
  "say": function(server, channel, message) {
    console.log(server, channel, message);
  }
});
