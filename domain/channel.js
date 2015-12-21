var EE = require('events').EventEmitter;
var RabbitClientError = require('./rabbit_client_error');
var RabbitRouteError = require('./rabbit_route_error');
//65535
/**
 *
 * @extends EventEmitter
 * @param {BRAMQPClient} client
 * @param {Number} id
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

Channel.prototype.flow = function(active, callback){
  this.client.channel.flow(this.id, active, (err) => {
    if (err) return callback(err);
    this.client.once();
    this._wrap('flow', callback);
  });
};

Channel.prototype.$getId = function(){
  return this.id;
};

Channel.prototype.$isClosed = function(){
  return !this.opened;
};

Channel.prototype.isOpened = function(){
  return this.opened;
};

Channel.prototype.$setConfirmMode = function(c){
  this.confirmMode = c;
};

Channel.prototype.$isConfirmMode = function(){
  return this.confirmMode;
};

Channel.prototype._wrap = function(doing, callback){
  var error = function (err){
    this.removeListener(this._getEventString(doing), success);
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