var _ = require('underscore')._,
    notify_core = require('./notify_core'),
    Entry = notify_core.Entry, Feed = notify_core.Feed,
    Announcement = notify_core.Announcement,
    Reminder = notify_core.Reminder;

var notifier = function(dbot) {
  var feeds = [];
  dbot.config.modules.notify.feeds.forEach(function(feed) {
    var f = new Feed(
      dbot,
      feed.name,
      feed.protocol,
      feed.endpoint,
      feed.interval*1000,
      feed.options
      );

    if(feed.announcements) {
      feed.announcements.forEach(function(announce) {
        var a = new Announcement(
          announce.channel,
          announce.server,
          announce.events,
          announce.strings
          );
        f.announcements.push(a);
      });
    }

    if(feed.reminders) {
      feed.reminders.forEach(function(remind) {
        var r = new Reminder(
          remind.channel,
          remind.server,
          remind.time
          );
        f.reminders.push(r);
      });
    }

    feeds.push(f);

    dbot.api.timers.addTimer(f.interval, function() {
      console.log("Polling " + f.name + " [ " + f.endpoint + " ]");
      f.poll(false);
    });
  });

  var commands = {
    '~checkfeeds': function(event) {
      for(var i = 0; i < feeds.length; i++) {
        feeds[i].poll(true);
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
