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

  this.announce = function(dbot)
  {
    if(announce_queue.added.length > 0) {
      dbot.say(Server, Channel, "Added: " + announce_queue.added.join(', '));
      announce_queue.added.length = 0;
    }
    if(announce_queue.updated.length > 0) {
      dbot.say(Server, Channel, "Updated: " + announce_queue.updated.join(', '));
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

  this.remind = function(dbot)
  {
    if(remind_queue.length > 0) {
      dbot.say(Server, Channel, "Only " + this.time + " seconds left until: " + remind_queue.join(', '));
      remind_queue.length = 0;
    }
  }
}

function Feed(dbot, Name, Protocol, Endpoint, Interval, Options)
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
      this.announcements[a].announce(dbot);
    }
    for(var r = 0; r < this.reminders.length; ++r)
    {
      this.reminders[r].remind(dbot);
    }
  }
}

// Export
exports.Entry = Entry;
exports.Announcement = Announcement;
exports.Reminder = Reminder;
exports.Feed = Feed;
