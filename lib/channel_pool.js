"use strict";

var DEFAULT_CAPACITY = 100; //65535;
var DEFAULT_CLOSE_BY_END = false;
var DEFAULT_CLOSE_TIMEOUT = 30*1000;

var EE = require('events').EventEmitter;

function ChannelPool(client, ChannelConstructor, cap, timeout, closeByEnd){
  EE.call(this);

  this.capacity = cap || DEFAULT_CAPACITY;
  this.timeout = timeout || DEFAULT_CLOSE_TIMEOUT;
  this.closeByEnd = typeof closeByEnd !== 'undefined' ? !!closeByEnd : DEFAULT_CLOSE_BY_END;

  this.lastChanId = 1;
  this.busyChannels = new Set();
  this.freeChannels = new Set();
  this.channelConstructor = ChannelConstructor;
  this.client = client;

  this.channelsMap = new Map();

  this.channelsTimeouts = {};

  return this;
}

require('util').inherits(ChannelPool, EE);

ChannelPool.prototype.openChannelById = function(id, callback){
  if (this.busyChannels.has(id)){
    return callback(new Error('Channel is busy.'));
  }
  else {
    this.setBusy(id);
    let chan = new this.channelConstructor(this.client, id);
    chan.once('close', () => {
      this.channelsMap.delete(id);
      this.busyChannels.delete(id);
      this.freeChannels.delete(id);
      delete this.channelsTimeouts[id];
    });
    this.channelsMap.set(id, chan);
    return chan.open((err) => {
      if (err) return callback(err);
      this.setBusy(chan.$getId());
      return callback(null, chan, () => {
        this.setFree(id);
      });
    });
  }
};

ChannelPool.prototype.openChannel = function(callback){
  if (typeof callback !== 'function'){
    return this.openChannelById(callback, arguments[1]);
  }
  for(let nextId = this.lastChanId; nextId <= this.capacity; nextId++){
    if (this.busyChannels.has(nextId)) continue;
    if (this.freeChannels.has(nextId)) continue;
    this.lastChanId = nextId;
    return this.openChannelById(nextId, callback);
  }
  {
    for(let nextId = 1; nextId <= this.lastChanId; nextId++){
      if (this.busyChannels.has(nextId)) continue;
      if (this.freeChannels.has(nextId)) continue;
      this.lastChanId = nextId;
      return this.openChannelById(nextId, callback);
    }
  }

  this.lastChanId = 1;
  return callback(new Error('All channels are opened.'));
};

ChannelPool.prototype.getChannel = function(callback){
  var iter = this.freeChannels.entries();
  var next = iter.next();
  if (next.value){
    let id = next.value[0];
    this.setBusy(id);
    return callback(null, this.channelsMap.get(id), () => {
      this.setFree(id);
    });
  }
  return this.openChannel((err, chan, done) => {
    if (err) return callback(new Error('All channels busy.'));
    return callback(null, chan, done);
  });
};

ChannelPool.prototype.setBusy = function(channelId){
  clearTimeout(this.channelsTimeouts[channelId]);
  this.freeChannels.delete(channelId);
  this.busyChannels.add(channelId);
};

ChannelPool.prototype.setFree = function(channelId){
  if (!this.channelsMap.has(channelId)) return;
  this.freeChannels.add(channelId);
  this.busyChannels.delete(channelId);
  if (this.closeByEnd){
    this.channelsMap.get(channelId).close((err) => {
      if (err) console.error(err);
    });
  }
  else {
    let timeout = this.timeout || DEFAULT_CLOSE_TIMEOUT;
    this.channelsTimeouts[channelId] = setTimeout(() => {
      if (this.channelsMap.has(channelId)) this.channelsMap.get(channelId).close((err) => {
        if (err) console.error(err);
      });
    }, timeout);
  }
  this.emit('freeChannel', this.busyChannels.size);
};

ChannelPool.prototype.getCapacity = function(){
  return this.capacity;
};


module.exports = ChannelPool;
