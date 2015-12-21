'use strict';

var EE = require('events').EventEmitter;

/**
 * Work with transactions.
 *
 * The Tx class allows publish and ack operations to be batched into atomic units of work.
 * The intention is that all publish and ack requests issued within a transaction will
 * complete successfully or none of them will.
 * Servers SHOULD implement atomic transactions at least where all publish or ack requests
 * affect a single queue. Transactions that cover multiple queues may be non-atomic,
 * given that queues can be created and destroyed asynchronously, and such events do not
 * form part of any transaction. Further, the behaviour of transactions with respect to the
 * immediate and mandatory flags on Basic.Publish methods is not defined.
 * @extends EventEmitter
 * @param {BRAMQPClient} client Client object that returns from bramqp#openAMQPCommunication() method.
 * @param {Channel} channel Channel object (should be opened).
 * @return {TX}
 * @constructor
 * @class Tx
 */
function TX(client, channel){
  EE.call(this);
  this.client = client;
  this.channel = channel;
  this.id = channel.$getId();

  return this;
}

require('util').inherits(TX, EE);

/**
 * Select standard transaction mode.
 * This method sets the channel to use standard transactions.
 * The client must use this method at least once on a channel before using the Commit or
 * Rollback methods.
 * @param {Function} callback
 * @method select
 */
TX.prototype.select = function(callback){
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err);};
  }

  this.client.tx.select(this.id, (err) => {
    if (err) return callback(err);
    this._wrap('select', callback);
  });
};

/**
 * Commit the current transaction.
 *
 * This method commits all message publications and acknowledgments performed in the current
 * transaction. A new transaction starts immediately after a commit.
 * * The client MUST NOT use the Commit method on non-transacted channels.
 * Error code: precondition-failed
 * @param {Function} callback
 * @method commit
 */
TX.prototype.commit = function(callback){
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err);};
  }

  this.client.tx.commit(this.id, (err) => {
    if (err) return callback(err);
    this._wrap('commit', callback);
  });
};

/**
 * Abandon the current transaction.
 *
 * This method abandons all message publications and acknowledgments performed
 * in the current transaction. A new transaction starts immediately after a rollback.
 * Note that unacked messages will not be automatically redelivered by rollback;
 * if that is required an explicit recover call should be issued.
 * * The client MUST NOT use the Rollback method on non-transacted channels.
 * Error code: precondition-failed
 * @param callback
 * @method rollback
 */
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