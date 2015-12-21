'use strict';

var DEFAULT_TYPE = 'topic';
var DEFAULT_EXCHANGE_NAME = '';
var DEFAULT_PASSIVE = false;
var DEFAULT_DURABLE = false;
var DEFAULT_INTERNAL = false;
var DEFAULT_NO_WAIT = false;
var DEFAULT_AUTO_DELETE = false;
var DEFAULT_ARGUMENTS = false;
var DEFAULT_IF_UNUSED = false;

var EE = require('events').EventEmitter;

function Exchange(client, channel){
  EE.call(this);
  this.client = client;
  this.channel = channel;
  this.id = channel.$getId();

  return this;
}

require('util').inherits(Exchange, EE);

Exchange.prototype.declare = function(exchange, type, options, callback){
  options = options || {};
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err);};
  }

  if (typeof type === 'object'){
    options = type;
    type = '';
  }
  else if (typeof type === 'function'){
    type = '';
  }

  type = type || DEFAULT_TYPE;

  var passive = 'passive' in options ? !!options.passive : DEFAULT_PASSIVE;
  var durable = 'durable' in options ? !!options.durable : DEFAULT_DURABLE;
  var autoDelete = 'autoDelete' in options ? !!options.autoDelete : DEFAULT_AUTO_DELETE;
  var internal = 'internal' in options ? !!options.internal : DEFAULT_INTERNAL;
  var noWait = 'noWait' in options ? !!options.noWait : DEFAULT_NO_WAIT;
  var table = 'arguments' in options ? options['arguments'] : DEFAULT_ARGUMENTS;

  this.client.exchange.declare(this.id, exchange, type, passive, durable, autoDelete, internal, noWait, table, (err) => {
    if (err) return callback(err);
    this._wrap('declare', callback);
  });
};

Exchange.prototype['delete'] = function(exchange, options, callback){
  options = options || {};
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err);};
  }

  var ifUnused = 'ifUnused' in options ? !!options.ifUnused : DEFAULT_IF_UNUSED;
  var noWait = 'noWait' in options ? !!options.noWait : DEFAULT_NO_WAIT;

  this.client.exchange.delete(this.id, exchange, ifUnused, noWait, (err) => {
    if (err) return callback(err);
    this._wrap('delete', callback);
  });
};

Exchange.prototype.bind = function(destination, source, routingKey, options, callback){
  options = options || {};
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err);};
  }

  var noWait = 'noWait' in options ? !!options.noWait : DEFAULT_NO_WAIT;
  var table = 'arguments' in options ? options['arguments'] : DEFAULT_ARGUMENTS;

  this.client.exchange.bind(this.id, destination, source, routingKey, noWait, table, (err) => {
    if (err) return callback(err);
    this._wrap('bind', callback);
  });
};

Exchange.prototype.unbind = function(destination, source, routingKey, options, callback){
  options = options || {};
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err);};
  }

  var noWait = 'noWait' in options ? !!options.noWait : DEFAULT_NO_WAIT;
  var table = 'arguments' in options ? options['arguments'] : DEFAULT_ARGUMENTS;

  this.client.exchange.unbind(this.id, destination, source, routingKey, noWait, table, (err) => {
    if (err) return callback(err);
    this._wrap('unbind', callback);
  });
};


Exchange.prototype._wrap = function(doing, callback){
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

Exchange.prototype._getEventString = function(doing){
  return this.id + ':exchange.'+doing+'-ok';
};


module.exports = Exchange;