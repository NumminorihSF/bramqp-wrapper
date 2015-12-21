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

function Client(config){
  config = config || {};
  this.host = config.host || DEFAULT_HOST;
  this.port = config.port || DEFAULT_PORT;

  this.user = config.user || DEFAULT_USER;
  this.password = config.password || DEFAULT_PASSWORD;

  this.vhost = config.vhost || DEFAULT_VHOST;

  this.protocolVersion = config.protocolVersion || DEFAULT_PROTOCOL_VERSION;

  this.should_work = false;
  this.connected = false;

  this.socket = null;

  this.client = null;

  this.taskPool = new TaskPool();

  this.reconnectTimeout = null;

  return this;
}


require('util').inherits(Client, EE);


Client.prototype.connect = function(callback){
  this.socket = net.connect({
    host:       this.host,
    port:       this.port
  });

  this.socket.once('error', () => {this.taskPool.errorHandle()});

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

        handle.on('error', this.taskPool.errorHandle);

        this.socket.once('close', handle.removeListener.bind(handle, 'error', this.taskPool.errorHandle));

        this.interval = setInterval(() => {handle.heartbeat((err) => {});}, 1000);

        handle.on('heartbeat', ()=>{
          this.taskPool.resume();
        });

        this.client = handle;

        this.taskPool.setWrapper(new Wrapper(handle));
        this.taskPool.setChannelPool(new ChannelPool(handle, ChannelConstructor));
        callback();
      });
    });
  });
};

Client.prototype.disconnect = function(cb){
  cb = cb || (() => {});
  clearInterval(this.interval);
  clearTimeout(this.reconnectTimeout);
  this.should_work = false;
  if (!this.connected) return cb();
  if (this.taskPool.isEmpty()){
    return this.client.closeAMQPCommunication(()=>{
      this.client = null;
      this.socket.close(() => {
        this.connected = false;
        cb();
      });
    });
  }
  this.taskPool.once('empty', ()=>{
    this.client.closeAMQPCommunication(()=>{
      this.client = null;
      this.socket.close(() => {
        this.connected = false;
        cb();
      });
    });
  });
};

Client.prototype._reconnect = function(){
  if (this.socket) this.socket.end();
  if (!this.should_work) return;
  this.reconnectTimeout = setTimeout(()=>{
    this.connect();
  }, DEFAULT_RECONNECT_TIMEOUT);
};

Client.prototype.getChannel = function(callback){
  if (this.should_work) return this.taskPool.getChannel(callback);
  if (this.connected) return callback(new Error('Client is in process of disconnect.'));
  return callback(new Error('Client is disconnected.'));
};


module.exports = Client;