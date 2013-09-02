var fs = require('fs'),
    icalendar = require('icalendar');
function TEST(dbot)
{
  function Entry(ID, Title, Timestamp)
  {
    this.ID = ID;
    this.Title = Title;
    this.Timestamp = Timestamp;

    this.isUpdate = function(other)
    {
      return (other.ID == this.ID) && (this.Timestamp != other.Timestamp);
    }
  }

  function Announcement(Channel, Server, Events)
  {
    this.channel = Channel;
    this.server = Server;
    this.events = Events;

    this.announce_updated = (this.events.indexOf("updated") != -1);
    this.announce_added = (this.events.indexOf("added") != -1);

    var announce_queue = {"added":[], "updated":[]};

    this.handleUpdate = function(entry)
    {
      if(this.announce_updated)
      {
        announce_queue.updated.push(entry.Title);
      }
    }

    this.handleNew = function(entry)
    {
      if(this.announce_added)
      {
        announce_queue.added.push(entry.Title);
      }
    }

    this.announce = function()
    {
      if(announce_queue.added.length > 0) {
        dbot.send(Server, Channel, "Added: " + announce_queue.added.join(', '));
        announce_queue.added.length = 0;
      }
      if(announce_queue.updated.length > 0) {
        dbot.send(Server, Channel, "Updated: " + announce_queue.updated.join(', '));
        announce_queue.updated.length = 0;
      }
    }
  }

  function Reminder(Channel, Server, Time)
  {
    this.channel = Channel;
    this.server = Server;
    this.time = Time;

    var remind_queue = [];

    this.handleRemind = function(now, entry)
    {
      if(now + this.time > entry.Timestamp)
      {
        remind_queue.push(entry.Title);
        return true;
      }
      return false;
    }

    this.remind = function()
    {
      if(remind_queue.length > 0) {
        dbot.send(Server, Channel, "Only " + this.time + " seconds left until: " + remind_queue.join(', '));
        remind_queue.length = 0;
      }
    }
  }

  function Feed(Name, Protocol, Endpoint, Interval, Options)
  {
    this.name = Name;
    this.protocol = Protocol;
    this.endpoint = Endpoint;
    this.interval = Interval;
    this.options = Options;

    // Load the protocol backend
    var backend = require('./protocols/'+this.protocol);

    this.poll = function(manual)
    {
      backend.poll(this.endpoint, this.options, Entry,
                   function(error, entries) {
                     if(! error) {
                       this.processEntries(entries);
                     }
                     else {
                       console.log("[Notify] Protocol Error:", error);
                       if(manual) {
                         // TODO: announce failure.
                       }
                     }
                   }.bind(this));
    }

    /**
     * Annoucements attached to this feed
     */
    this.announcements = [];

    /**
     * Reminders
     */
    this.reminders = [];

    /**
     * Cache of previous entries, indexed by Entry's ID
     */
    var entry_cache = {};

    /**
     * Cache of last reminder times.
     */
    var latest_reminders = {};

    this.now = function()
    {
      return (new Date()).getTime()/1000;
    }

    var newEntry = (function(entry)
                    {
                      entry_cache[entry.ID] = entry;
                      latest_reminders[entry.ID] = 0;
                      for(var a = 0; a < this.announcements.length; ++a) {
                        this.announcements[a].handleNew(entry);
                      }
                    }).bind(this);

    var updateEntry = (function(entry)
                       {
                         for(var a = 0; a < this.announcements.length; ++a) {
                           this.announcements[a].handleUpdate(entry, entry_cache[entry.ID]);
                         }
                         entry_cache[entry.ID] = entry;
                       }).bind(this);

    this.processEntries = function(entries)
    {
      for(var e = 0; e < entries.length; ++e)
      {
        console.log("Processing", entries[e].ID);
        var entry = entries[e];
        if(entry_cache[entry.ID])
        {
          if(entry_cache[entry.ID].isUpdate(entry))
          {
            updateEntry(entry);
          }
        }
        else
        {
          newEntry(entry);
        }

        // Fire off reminders
        for(var r = 0; r < this.reminders.length; ++r)
        {
          if(latest_reminders[entry.ID] < entry.Timestamp - this.reminders[r].time)
          {
            if(this.reminders[r].handleRemind(this.now(), entry))
            {
              latest_reminders[entry.ID] = this.now();
            }
          }
        }
      }

      // Flush announcements.
      for(var a = 0; a < this.announcements.length; ++a) {
        this.announcements[a].announce();
      }
      for(var r = 0; r < this.reminders.length; ++r)
      {
        this.reminders[r].remind();
      }
    }
  }

  var feeds = [
    new Feed('OAOSIDL Events', 'ical', 'googe', 120)
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

  var steamlug = new Feed('SteamLUG', 'ical', 'googe', 120);
  steamlug.reminders.push(new Reminder('#steamlug', 'freenode', 60*60*24*7));
  steamlug.poll(false);

  //var stlg = new Feed('SteamLUG Announcments', 'rss', '');
}

TEST({
  "send": function(server, channel, message) {
    console.log(server, channel, message);
  }
});
