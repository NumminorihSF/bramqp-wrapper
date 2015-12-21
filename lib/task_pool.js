'use strict';

var EE = require('events').EventEmitter;
var Queue = require('./task_queue');

var DEFAULT_CAPACITY = 100;

/**
 *
 * @private
 * @param {Number} capacity How mach task can be run at the same time.
 * @param {ChannelPool} channelPool
 * @return {TaskPool}
 * @constructor
 */
function TaskPool(capacity, channelPool){
  EE.call(this);
  this.channelPool = channelPool;
  if (channelPool) {
    this.capacity = capacity < channelPool.getCapacity() ? capacity : channelPool.getCapacity();
  }
  else {
    this.capacity = capacity || 32364
  }

  this.paused = true;

  this.taskQueue = new Queue();

  this.redelivered = new Set();

  this.taskOnWork = new Set();

  this.taskOnWorkCount = 0;

  this.wrapper = null;

  this.on('newTask', this._onTask.bind(this));

  return this;
}

require('util').inherits(TaskPool, EE);

/**
 *
 * @param channelPool
 */
TaskPool.prototype.setChannelPool = function(channelPool){
  this.channelPool = channelPool;
  this.channelPool.on('freeChannel', (busyChannels) => {
    if (this.redelivered.size) return this.emit('newTask');
    if (!this.taskQueue.isEmpty()) return this.emit('newTask');
    if (busyChannels === 0) return this.emit('empty');
  });
  this.capacity = this.capacity < channelPool.getCapacity() ? this.capacity : channelPool.getCapacity();
  this.paused = false;
  if (this.redelivered.size || !this.taskQueue.isEmpty()) this.emit('newTask');
};

TaskPool.prototype.setWrapper = function(wrapper){
  this.wrapper = wrapper;
};

TaskPool.prototype.resume = function(){
  this.paused = false;
  this.emit('newTask');
};

TaskPool.prototype.isEmpty = function(){
  return this.taskOnWork.size === 0 && this.taskQueue.isEmpty() && this.redelivered.size === 0;
};

TaskPool.prototype.getChannelDirect = function(callback){
  return this.channelPool.getChannel(callback);
};

TaskPool.prototype.getChannel = function(callback){
  this.taskQueue.add(callback);
  this.emit('newTask');
};

TaskPool.prototype._onTask = function(){
  if (this.paused) return;
  if (this.taskOnWorkCount < this.capacity) {
    this.taskOnWorkCount += 1;
    let task;
    if (this.redelivered.size) {
      let iter = this.redelivered.entries();
      task = iter.next().value[0];
      this.redelivered.delete(task);
    }
    else if (!this.taskQueue.isEmpty()) {
      task = this.taskQueue.get();
      this.taskQueue.done();
    }
    else {
      (() => {this.taskOnWorkCount -= 1})();
      if (this.taskOnWork === 0) this.emit('empty');
      return;
    }
    this.channelPool.getChannel((err, chan, done) => {
      if (err) return (() => {
        this.taskOnWorkCount -= 1;
        this.redelivered.add(task);
      })();
      {
        this.taskOnWork.add(task);
        let client = this.wrapper.wrap(chan, done);
        task(null, client, (err, redeliver) => {
          this.taskOnWorkCount -= 1;
          this.taskOnWork.delete(task);
          if (err) {
            if (redeliver) {
              this.redelivered.add(task);
            }
          }
          client.done();
        });
      }
    });
  }
};

TaskPool.prototype.errorHandle = function(){
  this.paused = true;
};

module.exports = TaskPool;


