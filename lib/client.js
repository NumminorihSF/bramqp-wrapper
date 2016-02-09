'use strict';

var DEFAULT_HOST = '127.0.0.1';
var DEFAULT_PORT = 5672;
var DEFAULT_USER = 'guest';
var DEFAULT_PASSWORD = 'guest';
var DEFAULT_RECONNECT_TIMEOUT = 5*1000;
var DEFAULT_PROTOCOL_VERSION = 'rabbitmq/full/amqp0-9-1.stripped.extended';
var DEFAULT_VHOST = '/';

var bramqp = require('bramqp');
var net = require('net');

var Wrapper = require('./wrapper');
var TaskPool = require('./task_pool');
var ChannelPool = require('./channel_pool');
var ChannelConstructor = require('../domain/channel');


var EE = require('events').EventEmitter;

/**
 * @class Client
 * @param {Object} config
 * @param {String} [config.host='127.0.0.1']
 * @param {Number} [config.port=5672]
 * @param {String} [config.user='guest']
 * @param {String} [config.password='guest']
 * @param {String} [config.protocolVersion='rabbitmq/full/amqp0-9-1.stripped.extended']
 * @param {String} [config.vhost='/']
 * @param {Number} [config.channelPoolCapacity=0]
 * @param {Number} [config.taskPoolCapacity=0]
 * @return {Client}
 * @constructor
 */
function Client(config){
  config = config || {};
  this.host = config.host || DEFAULT_HOST;
  this.port = config.port || DEFAULT_PORT;

  this.user = config.user || DEFAULT_USER;
  this.password = config.password || DEFAULT_PASSWORD;

  this.vhost = config.vhost || DEFAULT_VHOST;

  this.protocolVersion = config.protocolVersion || DEFAULT_PROTOCOL_VERSION;

  this.channelPoolCapacity = config.channelPoolCapacity || 0;
  this.taskPoolCapacity = config.taskPoolCapacity || 0;

  this.should_work = false;
  this.connected = false;

  this.socket = null;

  this.client = null;

  this.taskPool = new TaskPool(this.taskPoolCapacity);

  this.reconnectTimeout = null;

  return this;
}


require('util').inherits(Client, EE);

/**
 * @method connect
 * Connect to amqp server.
 * @param {Function} callback
 */
Client.prototype.connect = function(callback){
  this.socket = net.connect({
    host:       this.host,
    port:       this.port
  });

  this.socket.once('error', () => {this.taskPool.errorHandle()});

  this.socket.once('close', () => {
    this.emit('disconnect');
    this.taskPool.errorHandle();
  });

  this.interval = null;

  var sended = false;

  var authErrorWaiter = (err) => {
    sended = true;
    if (err) {
      if (err.code === 'ECONNRESET') return callback(new Error('Invalid credentials.'));
      return callback(err);
    }
  };

  this.socket.once('close', this._reconnect.bind(this));

  this.socket.once('close', clearTimeout.bind(this, this.timeout));

  this.socket.once('close', () => {
    this.connected = false;
  });

  bramqp.initialize(this.socket, this.protocolVersion, (error, handle) => {
    if (error) return callback(error);

    this.socket.once('error', authErrorWaiter);

    handle.openAMQPCommunication(this.user, this.password, true, this.vhost || '/', (error) => {
      if (error) return callback(error);
      if (sended) return;

      this.socket.removeListener('error', authErrorWaiter);
      (new ChannelConstructor(handle, 1)).close((err) => {
        if (err) return callback(error);

        this.should_work = true;
        this.connected = true;

        this.socket.on('error', () => {
          this.taskPool.errorHandle();
        });

        var handleError = (e) => {
          this.emit('error', e);
        };

        handle.on('error', handleError);
        handle.on('connection.blocked', () => {
          this.emit('amqp-blocked');
          this.taskPool.resume();
        });
        handle.on('connection.unblocked', () => {
          this.emit('amqp-unblocked');
          this.taskPool.errorHandle();
        });
        this.emit('connect');

        this.socket.once('close', () => {
          handle.removeListener('error', handleError);
        });

        this.interval = setInterval(() => {handle.heartbeat(() => {});}, 1000);

        handle.on('heartbeat', ()=>{
          this.taskPool.resume();
        });

        this.client = handle;

        var chanPool = new ChannelPool(handle, ChannelConstructor, this.channelPoolCapacity);

        chanPool.on('error', this.emit.bind(this, 'error'));

        this.taskPool.setWrapper(new Wrapper(handle));
        this.taskPool.setChannelPool(chanPool);
        callback();
      });
    });
  });
};

/**
 * @method disconnect
 * Wait of end of all tasks. After - disconnect.
 * @param {Function} cb
 */
Client.prototype.disconnect = function(cb){
  cb = cb || (() => {});
  clearInterval(this.interval);
  clearTimeout(this.reconnectTimeout);
  this.should_work = false;
  if (!this.connected) return cb();
  if (this.taskPool.isEmpty()){
    return this.client.closeAMQPCommunication(()=>{
      this.client = null;
      this.socket.end(() => {
        this.connected = false;
        cb();
      });
    });
  }
  this.taskPool.once('empty', ()=>{
    this.client.closeAMQPCommunication(()=>{
      this.client = null;
      this.socket.end(() => {
        this.connected = false;
        cb();
      });
    });
  });
};

/**
 * @method _reconnect
 * @private
 */
Client.prototype._reconnect = function(){
  if (this.socket) this.socket.end();
  if (!this.should_work) return;
  this.reconnectTimeout = setTimeout(()=>{
    this.connect();
  }, DEFAULT_RECONNECT_TIMEOUT);
};

/**
 * @method getChannel
 * Gets channel from pool. If no channels, will wait until some chan free.
 * @param {Function} callback 1st arguments is error. 2nd argument is object like
 *    `{basic:.., channel:.., confirm:.., exchange:.., queue:.., queue:.., tx:..}`
 *    all methods provided an api of amqp protocol.
 *    3rd argument is done callback to make channel free.
 */
Client.prototype.getChannel = function(callback){
  if (this.should_work) return this.taskPool.getChannel(callback);
  if (this.connected) return callback(new Error('Client is in process of disconnect.'));
  return callback(new Error('Client is disconnected.'));
};

/**
 * Get channel form channel pool. Mark channel busy, but dos not increment counter of tasks in work.
 * @method getChannelDirect
 * @param {Function} callback
 */
Client.prototype.getChannelDirect = function(callback){
  return this.taskPool.getChannelDirect(callback);
};


module.exports = Client;