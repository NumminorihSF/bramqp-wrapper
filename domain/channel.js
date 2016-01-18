var EE = require('events').EventEmitter;
var RabbitClientError = require('./rabbit_client_error');
var RabbitRouteError = require('./rabbit_route_error');

/**
 * Work with channels.
 *
 * The channel class provides methods for a client to establish a channel to a server
 * and for both peers to operate the channel thereafter.
 *
 * @class Channel
 * @extends EventEmitter
 * @param {BRAMQPClient} client Client object that returns from bramqp#openAMQPCommunication() method.
 * @param {Number} id Channel id.
 * @return {Channel}
 * @constructor
 */
function Channel(client, id){
  EE.call(this);
  this.client = client;
  this.id = id;
  this.opened = false;
  this.confirmMode = false;
  this.client.once(this.id+':channel.close', (id, method, err) => {
    this.opened = false;
    var error = new RabbitClientError(err);
    this.emit('close', error, this.id);
    if (error) {
      this.emit('error', error);
      this.client.channel['close-ok'](this.id, (err) => {
        if (err) this.emit('error', err);
      });
    }
  });
  this.client.on(this.id+':basic.return', (id, method, err) => {
    var error = new RabbitRouteError(err);
    this.emit('return', error, this.id);
    if (error) {
      this.emit('error', error);
    }
  });
}

require('util').inherits(Channel, EE);

/**
 * Open a channel for use.
 *
 * This method opens a channel to the server.
 * * The client MUST NOT use this method on an already-opened channel. Error code: channel-error
 * @param {Function} callback on callback - 1st argument is error.
 * @method open
 */
Channel.prototype.open = function(callback){
  this.confirmMode = false;
  this.client.channel.open(this.id, (err) => {
    if (err) return callback(err);
    this._wrap('open', (err) => {
      if (err) return callback(err);
      this.opened = true;
      callback(err);
    });
  });
};

/**
 * Request a channel close.
 *
 * This method indicates that the sender wants to close the channel.
 * This may be due to internal conditions (e.g. a forced shut-down) or due to an
 * error handling a specific method, i.e. an exception.
 * When a close is due to an exception, the sender provides the class and method
 * id of the method which caused the exception.
 *
 * * After sending this method, any received methods except Close and Close-OK MUST
 * be discarded. The response to receiving a Close after sending Close must be to send Close-Ok.
 * @param {Function} callback on callback - 1st argument is error.
 * @method close
 */
Channel.prototype.close = function(callback){
  this.client.channel.close(this.id, (err) => {
    if (err) return callback(err);
    this._wrap('close', (err) => {
      this.emit('close', null, this.id);
      this.opened = false;
      callback(err);
    });
  });
};

/**
 * Enable/disable flow from peer.
 *
 * This method asks the peer to pause or restart the flow of content data sent by a consumer.
 * This is a simple flow-control mechanism that a peer can use to avoid overflowing its
 * queues or otherwise finding itself receiving more messages than it can process.
 * Note that this method is not intended for window control.
 * It does not affect contents returned by Basic.Get-Ok methods.
 *
 * * When a new channel is opened, it is active (flow is active).
 * Some applications assume that channels are inactive until started.
 * To emulate this behaviour a client MAY open the channel, then pause it.
 *
 *
 * * When sending content frames, a peer SHOULD monitor the channel for incoming methods a
 * nd respond to a Channel.Flow as rapidly as possible.
 *
 * * A peer MAY use the Channel.Flow method to throttle incoming content data for
 * internal reasons, for example, when exchanging data over a slower connection.
 *
 * * The peer that requests a Channel.Flow method MAY disconnect and/or ban a peer
 * that does not respect the request. This is to prevent badly-behaved clients from
 * overwhelming a server.
 * @param {Boolean} active If `true`, the peer starts sending content frames. If `false`, the peer stops sending content frames.
 * @param {Function} callback on callback - 1st argument is error. 2ns argument is: `true` means the peer will
 * start sending or continue to send content frames; `false` means it will not.
 * @method flow
 */
Channel.prototype.flow = function(active, callback){
  this.client.channel.flow(this.id, active, (err) => {
    if (err) return callback(err);
    this.client.once();
    this._wrap('flow', callback);
  });
};

/**
 * Return is of channel.
 * @return {Number}
 * @method $getId
 */
Channel.prototype.$getId = function(){
  return this.id;
};

/**
 * Return `true` if channel is closed.
 * @return {Boolean}
 * @method $isClosed
 */
Channel.prototype.$isClosed = function(){
  return !this.opened;
};

/**
 * Return `true` if channel is opened.
 * @return {Boolean}
 * @method $isOpened
 */
Channel.prototype.isOpened = function(){
  return this.opened;
};

/**
 * Set confirm mode to arg.
 * @param {Boolean} c `true` if now is im confirm mode.
 * @method $setConfirmMode
 */
Channel.prototype.$setConfirmMode = function(c){
  this.confirmMode = c;
};

/**
 * Check, if channel is in configm mode.
 * @return {Boolean}
 * $isConfirmMode
 */
Channel.prototype.$isConfirmMode = function(){
  return this.confirmMode;
};

Channel.prototype._wrap = function(doing, callback){
  var error = function (err){
    this.client.removeListener(this._getEventString(doing), success);
    return callback(err);
  }.bind(this);
  var success = function () {
    this.removeListener('close', error);
    return callback();
  }.bind(this);
  this.client.once(this._getEventString(doing), success);
  this.once('close', error);
};

Channel.prototype._getEventString = function(doing){
  return this.id + ':channel.'+doing+'-ok';
};

module.exports = Channel;