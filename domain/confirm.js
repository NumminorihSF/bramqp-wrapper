'use strict';

var DEFAULT_NO_WAIT = false;

var EE = require('events').EventEmitter;

/**
 * Work with confirms.
 *
 * The Confirm class allows publishers to put the channel in confirm mode and susequently
 * be notified when messages have been handled by the broker.
 * The intention is that all messages published on a channel in confirm mode will be
 * acknowledged at some point. By acknowledging a message the broker assumes responsibility
 * for it and indicates that it has done something it deems reasonable with it.
 * Unroutable mandatory or immediate messages are acknowledged right after the
 * Basic.Return method. Messages are acknowledged when all queues to which the message has
 * been routed have either delivered the message and received an acknowledgement (if required),
 * or enqueued the message (and persisted it if required).
 * Published messages are assigned ascending sequence numbers,
 * starting at 1 with the first Confirm.Select method.
 * The server confirms messages by sending Basic.Ack methods referring to these sequence numbers.
 * @param {BRAMQPClient} client Client object that returns from bramqp#openAMQPCommunication() method.
 * @param {Channel} channel Channel object (should be opened).
 * @return {Confirm}
 * @constructor
 */
function Confirm(client, channel){
  EE.call(this);
  this.client = client;
  this.channel = channel;
  this.id = channel.$getId();

  return this;
}

require('util').inherits(Confirm, EE);

/**
 * This method sets the channel to use publisher acknowledgements.
 * The client can only use this method on a non-transactional channel.
 * @param {Object} [options]
 * @param {Boolean} [options.noWait=false] If set, the server will not respond to the method.
 *    The client should not wait for a reply method.
 *    If the server could not complete the method it will raise a channel or connection exception.
 * @param {Function} callback
 * @method select
 */
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
    this.client.removeListener(this._getEventString(doing), success);
    return callback(err);
  }.bind(this);
  var success = function (a,b,c) {
    this.channel.removeListener('close', error);
    return callback(null,a,b,c);
  }.bind(this);
  this.client.once(this._getEventString(doing), success);
  this.channel.once('close', error);
};

Confirm.prototype._getEventString = function(doing){
  return this.id + ':confirm.'+doing+'-ok';
};


module.exports = Confirm;