'use strict';

var DEFAULT_TYPE = 'topic';
var DEFAULT_QUEUE_NAME = '';
var DEFAULT_PASSIVE = false;
var DEFAULT_DURABLE = false;
var DEFAULT_EXCLUSIVE = false;
var DEFAULT_NO_WAIT = false;
var DEFAULT_AUTO_DELETE = false;
var DEFAULT_ARGUMENTS = false;
var DEFAULT_IF_UNUSED = false;
var DEFAULT_IF_EMPTY = false;

var EE = require('events').EventEmitter;

function Queue(client, channel){
  EE.call(this);
  this.client = client;
  this.channel = channel;
  this.id = channel.$getId();

  return this;
}

require('util').inherits(Queue, EE);

Queue.prototype.declare = function(queue, options, callback){
  options = options || {};
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err);};
  }

  var passive = 'passive' in options ? !!options.passive : DEFAULT_PASSIVE;
  var durable = 'durable' in options ? !!options.durable : DEFAULT_DURABLE;
  var exclusive = 'exclusive' in options ? !!options.exclusive : DEFAULT_EXCLUSIVE;
  var autoDelete = 'autoDelete' in options ? !!options.autoDelete : DEFAULT_AUTO_DELETE;
  var noWait = 'noWait' in options ? !!options.noWait : DEFAULT_NO_WAIT;
  var table = 'arguments' in options ? options['arguments'] : DEFAULT_ARGUMENTS;

  this.client.queue.declare(this.id, queue, passive, durable, exclusive, autoDelete, noWait, table, (err) => {
    if (err) return callback(err);
    this._wrap('declare', callback);
  });
};

Queue.prototype.bind = function(queue, exchange, routingKey, options, callback){
  options = options || {};
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err);};
  }

  var noWait = 'noWait' in options ? !!options.noWait : DEFAULT_NO_WAIT;
  var table = 'arguments' in options ? options['arguments'] : DEFAULT_ARGUMENTS;

  this.client.queue.bind(this.id, queue, exchange, routingKey, noWait, table, (err) => {
    if (err) return callback(err);
    this._wrap('bind', callback);
  });
};

Queue.prototype.unbind = function(queue, exchange, routingKey, options, callback){
  options = options || {};
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err);};
  }

  var noWait = 'noWait' in options ? !!options.noWait : DEFAULT_NO_WAIT;
  var table = 'arguments' in options ? options['arguments'] : DEFAULT_ARGUMENTS;

  this.client.queue.unbind(this.id, queue, exchange, routingKey, noWait, table, (err) => {
    if (err) return callback(err);
    this._wrap('unbind', callback);
  });
};

Queue.prototype.purge = function(queue, options, callback){
  options = options || {};
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err);};
  }

  var noWait = typeof options === 'boolean' ? options : 'noWait' in options ? !!options.noWait : DEFAULT_NO_WAIT;

  this.client.queue.bind(this.id, queue, noWait, (err) => {
    if (err) return callback(err);
    this._wrap('purge', callback);
  });
};

Queue.prototype['delete'] = function(queue, options, callback){
  options = options || {};
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err);};
  }

  var ifUnused = 'ifUnused' in options ? !!options.ifUnused : DEFAULT_IF_UNUSED;
  var ifEmpty = 'ifEmpty' in options ? !!options.ifEmpty : DEFAULT_IF_EMPTY;
  var noWait = 'noWait' in options ? !!options.noWait : DEFAULT_NO_WAIT;

  this.client.queue.delete(this.id, queue, ifUnused, ifEmpty, noWait, (err) => {
    if (err) return callback(err);
    this._wrap('delete', callback);
  });
};


Queue.prototype._wrap = function(doing, callback){
  var error = function (err){
    this.removeListener(this._getEventString(doing), success);
    return callback(err);
  }.bind(this);
  var success = function (a,b,c) {
    this.removeListener('close', error);
    return callback(null,a,b,c);
  }.bind(this);
  this.client.once(this._getEventString(doing), success);
  this.channel.once('close', error);
};

Queue.prototype._getEventString = function(doing){
  return this.id + ':queue.'+doing+'-ok';
};


module.exports = Queue;