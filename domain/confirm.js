'use strict';

var DEFAULT_NO_WAIT = false;

var EE = require('events').EventEmitter;

function Confirm(client, channel){
  EE.call(this);
  this.client = client;
  this.channel = channel;
  this.id = channel.$getId();

  return this;
}

require('util').inherits(Confirm, EE);

Confirm.prototype.select = function(options, callback){
  options = options || {};
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    throw new Error('Last argument should be a callback function.');
  }
  var noWait = typeof options === 'boolean' ? options : 'noWait' in options ? !!options.noWait : DEFAULT_NO_WAIT;

  this.client.confirm.select(this.id, noWait, (err) => {
    if (err) return callback(err);
    this._wrap('select', (err) => {
      if (err) return callback(err);
      this.channel.$setConfirmMode(true);
      return callback(err);
    });
  });
};


Confirm.prototype._wrap = function(doing, callback){
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

Confirm.prototype._getEventString = function(doing){
  return this.id + ':confirm.'+doing+'-ok';
};


module.exports = Confirm;