'use strict';

var EE = require('events').EventEmitter;

function TX(client, channel){
  EE.call(this);
  this.client = client;
  this.channel = channel;
  this.id = channel.$getId();

  return this;
}

require('util').inherits(TX, EE);

TX.prototype.select = function(callback){
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err);};
  }

  this.client.tx.select(this.id, (err) => {
    if (err) return callback(err);
    this._wrap('select', callback);
  });
};

TX.prototype.commit = function(callback){
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err);};
  }

  this.client.tx.commit(this.id, (err) => {
    if (err) return callback(err);
    this._wrap('commit', callback);
  });
};

TX.prototype.rollback = function(callback){
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err);};
  }

  this.client.tx.rollback(this.id, (err) => {
    if (err) return callback(err);
    this._wrap('rollback', callback);
  });
};

TX.prototype._wrap = function(doing, callback){
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

TX.prototype._getEventString = function(doing){
  return this.id + ':tx.'+doing+'-ok';
};


module.exports = TX;