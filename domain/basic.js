'use strict';
var DEFAULT_PREFETCH_SIZE = 0;
var DEFAULT_PREFETCH_COUNT = 10;

var DEFAULT_NO_LOCAL = false;
var DEFAULT_NO_WAIT = false;
var DEFAULT_NO_ACK = false;
var DEFAULT_EXCLUSIVE = false;
var DEFAULT_MANDATORY = false;
var DEFAULT_IMMEDIATE = false;
var DEFAULT_REQUEUE = false;
var DEFAULT_MULTIPLE = false;

var DEFAULT_WAIT_ACK = false;

var DEFAULT_PUBLISH_ANSWER_WAIT_MECHANISM = 'just_callback';
var DEFAULT_WAIT_TIMEOUT = 100;

var EE = require('events').EventEmitter;

function Basic(client, channel, done){
  EE.call(this);
  this.client = client;
  this.channel = channel;
  this.id = channel.$getId();
  this.publishCallbackMethod = DEFAULT_PUBLISH_ANSWER_WAIT_MECHANISM;
  this.timeout = DEFAULT_WAIT_TIMEOUT;
  this.lastConfirmSendId = 1;
  this.lastMessageId = 1;

  this.done = done;

  this.lastError = null;

  return this;
}

require('util').inherits(Basic, EE);

Basic.prototype.qos = function(options, callback){
  options = options || {};
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    throw new Error('Last argument should be a callback function.');
  }
  var prefetchSize = Number(options.prefetchSize) || DEFAULT_PREFETCH_SIZE;
  var prefetchCount = Number(options.prefetchCount) || DEFAULT_PREFETCH_COUNT;
  var global = !!options.global || false;
  this.client.basic.qos(this.id, prefetchSize, prefetchCount, global, (err) => {
    if (err) return callback(err);
    this._wrap('qos', callback);
  });
};

Basic.prototype.consume = function(queueName, options, subscriber, callback){
  options = options || {};
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err)};
  }
  subscriber = arguments[arguments.length-2];
  if (!(typeof subscriber === 'function')){
    throw new Error('Pre-last argument should be a callback function.');
  }

  var consumerTag = 'consumerTag' in options ? options.consumerTag : null;
  var noLocal = 'noLocal' in options ? !!options.noLocal : DEFAULT_NO_LOCAL;
  var noAck = 'noAck' in options ? !!options.noAck : DEFAULT_NO_ACK;
  var exclusive = 'exclusive' in options ? !!options.exclusive : DEFAULT_EXCLUSIVE;
  var noWait = 'noWait' in options ? !!options.noWait : DEFAULT_NO_WAIT;
  var args = 'arguments' in options ? (
    typeof options['arguments'] === 'object' ? options['arguments'] : {}
  ) : {};

  this.client.basic.consume(this.id, queueName, consumerTag, noLocal, noAck, exclusive, noWait, args, (err) => {
    if (err) return callback(err);
    this._wrap('consume', (err, consumerTag) => {
      if (err) return callback(err);
      callback(err, consumerTag);
      var onMessage = function(_channel, _method, properties){
        this.client.once('content', (_channel, className, options, content) => {
          var headers = options.headers || {};
          delete options.headers;
          return subscriber(content, headers, options, properties);
        });
      }.bind(this);
      this.client.on(this.id + ':basic.deliver', onMessage);

      this.channel.once('close', (err) => {
        this.client.removeListener(this.id + ':basic.deliver', onMessage);
        if (err) return this.emit('close', err);
      });
    });

  });
};

Basic.prototype.cancel = function(consumerTag, options, callback){
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err)};
  }

  if (typeof consumerTag !== 'string'){
    return callback(new Error('1st argument should be a string (consumer-tag).'));
  }

  var noWait = 'noWait' in options ? !!options.noWait : DEFAULT_NO_WAIT;

  this.client.basic.cancel(this.id, consumerTag, noWait, (err) => {
    if (err) return callback(err);
    this._wrap('cancel', callback);
  });
};

Basic.prototype.publish = function(exchange, routingKey, body, options, headers, callback){
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err)};
  }

  if (this.channel.$isClosed()) {
    return callback(new Error('Channel is closed. Can not send anything to it.'));
  }

  options = options || {};

  var h;
  if (typeof headers !== 'object') h = {};
  else h = headers || {};

  Object.keys(h).forEach((key) => {
    h[key] = this._getHeaderValue(h[key]);
  });

  exchange = exchange || '';
  routingKey = routingKey || '';
  var mandatory = 'mandatory' in options ? !!options.mandatory : DEFAULT_MANDATORY;
  var immediate = 'immediate' in options ? !!options.immediate : DEFAULT_IMMEDIATE;
  var cbMech = 'callbackMechanism' in options ? options.callbackMechanism : DEFAULT_PUBLISH_ANSWER_WAIT_MECHANISM;

  var cb = this._getPublishCallback(cbMech)((err) => {
    if (err) return callback(err);
    return callback();
  });

  this.client.basic.publish(this.id, exchange, routingKey, mandatory, immediate, (err) => {
    if (err) return callback(err);
    var realHeaders = this._getRealHeaders(options, h);
    this.client.content(this.id, 'basic', realHeaders, body, (err) => {
      if (err) return callback(err);
      cb();
    });
  });

};

Basic.prototype['return'] = function(replyCode, replyText, exchange, routingKey, callback){
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err)};
  }

  exchange = exchange || '';
  routingKey = routingKey || '';

  this.client.basic.return(this.id, replyCode, replyText, exchange, routingKey, callback);
};

Basic.prototype.get = function(queue, options, callback){
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    throw new Error('Last argument should be a callback function.');
  }
  queue = queue || '';
  options = options || {};

  var noAck = 'noAck' in options ? !!options.noAck : DEFAULT_NO_ACK;

  this.client.basic.get(this.id, queue, noAck, (err) => {
    if (err) return callback(err);
    var error = function (err){
      this.removeListener(this.id + ':basic.get-ok', successMessage);
      this.removeListener(this.id + ':basic.get-empty', successEmpty);
      return callback(err);
    }.bind(this);

    var successEmpty = function(){
      this.removeListener(this.id + ':basic.get-ok', successMessage);
      this.channel.removeListener('close', error);
      return callback(null, null);
    }.bind(this);

    var successMessage = function (a, b, properties) {
      this.removeListener(this.id + ':basic.get-empty', successEmpty);
      this.client.once('content', (a, b, options, content) => {
        this.channel.removeListener('close', error);
        var headers = options.headers || {};
        delete options.headers;
        return callback(null, content, headers, options, properties);
      });
    }.bind(this);
    this.client.once(this.id + ':basic.get-empty', successEmpty);
    this.client.once(this.id + ':basic.get-ok', successMessage);
    this.channel.once('close', error);
  });
};

Basic.prototype.ack = function(deliveryTag, options, callback){
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err)};
  }

  var multiple = typeof options === 'boolean' ? options : 'multiple' in options ? !!options.multiple : DEFAULT_MULTIPLE;

  var cb = this._getPCb();

  this.client.ack(this.id, deliveryTag, multiple, cb(callback));
};

Basic.prototype.reject = function(deliveryTag, options, callback){
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err)};
  }

  var requeue = typeof options === 'boolean' ? options : 'requeue' in options ? !!options.requeue : DEFAULT_REQUEUE;

  var cb = this._getPCb();

  this.client.reject(this.id, deliveryTag, requeue, cb(callback));
};

Basic.prototype.recoverAsync = function(options, callback){
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err)};
  }

  var requeue = typeof options === 'boolean' ? options : 'requeue' in options ? !!options.requeue : DEFAULT_REQUEUE;

  this.client['recover-async'](this.id, requeue, (err) => {
    if (err){
      return callback(err);
    }
    this._wrap('recover-async', callback);
  });
};

Basic.prototype.recover = function(options, callback){
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err)};
  }

  var requeue = typeof options === 'boolean' ? options : 'requeue' in options ? !!options.requeue : DEFAULT_REQUEUE;

  this.client.recover(this.id, requeue, (err) => {
    if (err){
      return callback(err);
    }
    this._wrap('recover-async', callback);
  });
};

Basic.prototype.nack = function(deliveryTag, options, callback){
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err)};
  }

  var multiple =  typeof options === 'boolean' ? options : 'multiple' in options ? !!options.multiple : DEFAULT_MULTIPLE;
  var requeue = typeof arguments[2] === 'boolean' ? arguments[3] : 'requeue' in options ? !!options.requeue : DEFAULT_REQUEUE;

  var cb = this._getPCb();

  this.client.nack(deliveryTag, multiple, requeue, cb(callback));
};



Basic.prototype.$setPublishCallback = function(string){
  this.publishCallbackMethod = string.toLowerCase();
};

Basic.prototype.$setTimeout = function(t){
  this.timeout = Number(t) || DEFAULT_WAIT_TIMEOUT;
};



Basic.prototype._getHeaderValue = function(value){
  var type = typeof value;
  if (type === 'boolean') return {type: 'Boolean', data: value};
  if (type === 'number') {
    if (isNaN(value)) return {};
    if (Math.floor(value) === value) return {type: 'Signed 64-bit', data:value};
    return {type: '64-bit float', data: value};
  }
  if (type === 'string') return {type: 'Long string', data: value};
  if (type === 'function') {
    let tmp = value();
    return this._getHeaderValue(typeof tmp, tmp);
  }
  if (type === 'undefined') return {};
  if (type === 'object') {
    if (value instanceof Array){
      return {type: 'Array', data: value};
    }
    if (value instanceof Date){
      return {type: 'Timestamp', data: value};
    }
    return {type: 'Nested table', data: value};
  }

};

Basic.prototype._getRealHeaders = function(options, headers){
  var res = {};

  if (Object.keys(headers).length > 0) res.headers = headers;

  if ('replyTo' in options) res['reply-to'] = options.replyTo;
  if ('appId' in options) res['app-id'] = options.appId;
  if ('userId' in options) res['user-id'] = options.userId;
  if ('timestamp' in options) res['timestamp'] = options.timestamp;
  if ('expiration' in options) res['expiration'] = options.expiration;
  if ('messageId' in options) res['message-id'] = options.messageId;
  if ('correlationId' in options) res['correlation-id'] = options.correlationId;
  if ('type' in options) res['type'] = options.type;
  if ('contentType' in options) res['content-type'] = options.contentType;
  if ('contentEncoding' in options) res['content-encoding'] = options.contentEncoding;

  var id = this.lastMessageId++;
  res['message-id'] = res['message-id'] || '_'+id;
  return res;
};

Basic.prototype._getPCb = Basic.prototype._getPublishCallback = function(string){
  return this['__'+(string || this.publishCallbackMethod)].bind(this);
};

Basic.prototype._wrap = function(doing, callback){
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

Basic.prototype._getEventString = function(doing){
  return this.id + ':basic.'+doing+'-ok';
};



Basic.prototype.__just_callback = function(callback){
  var wasError = false;
  var onError = (err) => {
    wasError = true;
    return callback(err);
  };
  this.channel.once('close', onError);
  return (err) => {
    this.channel.removeListener('close', onError);
    if (!wasError) {
      return callback(err);
    }
  };
};

Basic.prototype.__wait_heartbeat = function(callback){
  var spawned = false;
  var onError = (err) => {
    spawned = true;
    return callback(err);
  };
  this.channel.once('close', onError);

  return (err) => {
    if (err) {
      this.channel.removeListener('close', onError);
      return callback(err);
    }

    this.client.once('heartbeat', () => {
      if (spawned) return;
      this.channel.removeListener('close', onError);
      return callback();
    });
  };
};

Basic.prototype.__wait_ack = function(callback){
  var spawned = false;

  var mesId = this.lastConfirmSendId++;
  var onAck = (chan, basic, data) => {
    if (data['delivery-tag'] === mesId) {
      let error = this.lastError;
      this.lastError = null;
      this.client.removeListener(this.id + ':basic.ack', onAck);
      this.channel.removeListener('close', onError);
      return callback(error);
    }
  };

  var onError = (err) => {
    spawned = true;
    this.client.removeListener(this.id + ':basic.ack', onAck);
    this.channel.removeListener('close', onError);
    return callback(err);
  };

  this.channel.once('close', onError);
  this.channel.once('return', onError);

  return (err) => {
    if (err) {
      this.channel.removeListener('close', onError);
      this.channel.removeListener('return', onError);
      return callback(err);
    }
    this.client.on(this.id + ':basic.ack', onAck);
  };
};

Basic.prototype.__wait_ack_but_make_chan_free = function(callback){
  var spawned = false;

  var mesId = this.lastConfirmSendId++;
  var onAck = (chan, basic, data) => {
    if (data['delivery-tag'] === mesId) {
      this.client.removeListener(this.id + ':basic.ack', onAck);
      this.channel.removeListener('close', onError);
      this.channel.removeListener('return', onError);
      return callback();
    }
  };

  var onError = (err) => {
    spawned = true;
    this.client.removeListener(this.id + ':basic.ack', onAck);
    this.channel.removeListener('close', onError);
    this.channel.removeListener('return', onError);
    return callback(err);
  };
  this.channel.once('close', onError);
  this.channel.once('return', onError);

  return (err) => {
    if (err) {
      this.channel.removeListener('close', onError);
      this.channel.removeListener('return', onError);
      return callback(err);
    }
    this.client.on(this.id + ':basic.ack', onAck);
  };
};

Basic.prototype.__wait_timeout = function(callback){
  var wasError = false;
  var onError = (err) => {
    wasError = true;
    return callback(err);
  };
  this.channel.once('close', onError);

  return (err) => {
    if (err) {
      this.channel.removeListener('close', onError);
      return callback(err);
    }
    setTimeout(() => {
        if (!wasError) {
          this.channel.removeListener('close', onError);
          return callback();
        }
    }, this.timeout);
  };

};

Basic.prototype.__wait_heartbeat_or_timeout = function(callback){
  var spawned = false;
  var onError = (err) => {
    spawned = true;
    return callback(err);
  };
  this.channel.once('close', onError);

  return (err) => {
    if (err) {
      this.channel.removeListener('close', onError);
      return callback(err);
    }
    if (spawned) return;
    var nextImmediate;
    var waiter = () => {
      nextImmediate = setImmediate(() => {
        if (spawned) return;
        spawned = true;
        clearTimeout(timer);
        this.channel.removeListener('close', onError);
        return callback();
      });
    };
    var timer = setTimeout(() => {
      if (spawned) return;
      spawned = true;
      this.channel.removeListener('close', onError);
      this.client.removeListener('heartbeat', waiter);
      clearImmediate(nextImmediate);
      return callback();
    }, this.timeout);

    nextImmediate = setImmediate(() => {
      if (spawned) return;
      this.client.heartbeat((err) => {
        if (err) {
          this.channel.removeListener('close', onError);
          spawned = true;
          return callback(err);
        }
        nextImmediate = setImmediate(() => {
          if (spawned) return;
          this.client.once('heartbeat', waiter);
        });
      });
    });
  };
};



module.exports = Basic;