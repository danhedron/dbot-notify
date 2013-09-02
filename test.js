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
    feeds[f].reminders.push(new Reminder("#oaosil", "aberwiki", 5));

    feeds[f].now = function() { return 0; }

    feeds[f].processEntries([
                            new Entry("ID-1", "PSA: Owls", 10),
                            new Entry("ID-2", "PSA: Not Owls", 12)
                            ]);
    feeds[f].processEntries([
                            new Entry("ID-1", "PSA: Owls", 14),
                            new Entry("ID-2", "PSA: Not Owls", 12)
                            ]);
    feeds[f].now = function() { return 8; }
    feeds[f].processEntries([
                            new Entry("ID-1", "PSA: Owls", 14),
                            new Entry("ID-2", "PSA: Not Owls", 12)
                            ]);
    feeds[f].now = function() { return 10; }
    feeds[f].processEntries([
                            new Entry("ID-1", "PSA: Owls", 14),
                            new Entry("ID-2", "PSA: Not Owls", 12)
                            ]);
  }

  var steamlug = new Feed(dbot, 'SteamLUG', 'ical', 'googe', 120);
  steamlug.reminders.push(new Reminder('#steamlug', 'freenode', 60*60*24*7));
  steamlug.poll(false);

  //var stlg = new Feed('SteamLUG Announcments', 'rss', '');
}

TEST({
  "send": function(server, channel, message) {
    console.log(server, channel, message);
  }
});
