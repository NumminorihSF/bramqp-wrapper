"use strict";

var DEFAULT_CAPACITY = 100; //65535;
var DEFAULT_CLOSE_BY_END = false;
var DEFAULT_CLOSE_TIMEOUT = 30*1000;

var EE = require('events').EventEmitter;

/**
 * @class ChannelPool
 * @param {BRAMQPClient} client Client object that returns from bramqp#openAMQPCommunication() method.
 * @param {Channel.Class} ChannelConstructor
 * @param {Number} cap Capacity of opened channels.
 * @param {Boolean} closeByEnd If true - channel will be closed after end of task. Else - will be closed by timeout.
 * @param {Number} timeout Timeout to close channels in ms.
 * @return {ChannelPool}
 * @constructor
 */
function ChannelPool(client, ChannelConstructor, cap, closeByEnd, timeout){
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

/**
 * Open channel, by its id. Set it busy. Mark channel as busy.
 * @method
 * @param {Number} id
 * @param {Function} callback 1st argument is error object. 2nd is channel object.
 *    3rd is done callback (you should spawn it to free channel).
 */
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
      chan.on('error', this.emit.bind(this, 'error'));
      this.setBusy(chan.$getId());
      return callback(null, chan, () => {
        this.setFree(id);
      });
    });
  }
};

/**
 * @method
 * Open some channel (try to get some closed id). Mark channel as busy.
 * @param {Function} callback 1st argument is error object. 2nd is channel object.
 *    3rd is done callback (you should spawn it to free channel).
 * @return {*}
 */
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

/**
 * @method
 * Get free channel. If no free chanel - try open new. Mark channel as busy.
 * @param {Function} callback 1st argument is error object. 2nd is channel object.
 *    3rd is done callback (you should spawn it to free channel).
 * @return {*}
 */
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

/**
 * @method
 * Mark channel as busy.
 * @param {Number} channelId
 */
ChannelPool.prototype.setBusy = function(channelId){
  clearTimeout(this.channelsTimeouts[channelId]);
  this.freeChannels.delete(channelId);
  this.busyChannels.add(channelId);
};

/**
 * @method
 * Mark channel as free.
 * @param {Number} channelId
 */
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

/**
 * @method
 * Return capacity of channel pool.
 * @return {Number}
 */
ChannelPool.prototype.getCapacity = function(){
  return this.capacity;
};


module.exports = ChannelPool;
