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

/**
 * Work with basic content.
 *
 * The Basic class provides methods that support an industry-standard messaging model. Work with channels.
 *
 * @class Basic
 * @extends EventEmitter
 * @param {BRAMQPClient} client Client object that returns from bramqp#openAMQPCommunication() method.
 * @param {Channel} channel Channel object (should be opened).
 * @param {Function} done
 * @return {Basic}
 * @constructor
 */
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

/**
 * Specify quality of service.
 *
 * This method requests a specific quality of service.
 * The QoS can be specified for the current channel or for all channels on the connection. T
 * he particular properties and semantics of a qos method always depend on the content
 * class semantics. Though the qos method could in principle apply to both peers,
 * it is currently meaningful only for the server.
 * @param {Object} [options]
 * @param {Number} [options.prefetchSize=0] The client can request that messages be sent
 *    in advance so that when the client finishes processing a message,
 *    the following message is already held locally,
 *    rather than needing to be sent down the channel.
 *    Prefetching gives a performance improvement.
 *    This field specifies the prefetch window size in octets.
 *    The server will send a message in advance if it is equal to or smaller in size
 *    than the available prefetch size (and also falls into other prefetch limits).
 *    May be set to zero, meaning "no specific limit",
 *    although other prefetch limits may still apply.
 *    The prefetch-size is ignored if the no-ack option is set.
 * @param {Number} [options.prefetchCount=10] Specifies a prefetch window in terms of whole messages.
 *    This field may be used in combination with the prefetch-size field;
 *    a message will only be sent in advance if both prefetch windows
 *    (and those at the channel and connection level) allow it.
 *    The prefetch-count is ignored if the no-ack option is set.
 * @param {Boolean} [options.global=false] RabbitMQ has reinterpreted this field.
 *    The original specification said: "By default the QoS settings apply to the current
 *    channel only. If this field is set, they are applied to the entire connection."
 *    Instead, RabbitMQ takes global=false to mean that the QoS settings should apply
 *    per-consumer (for new consumers on the channel; existing ones being unaffected)
 *    and global=true to mean that the QoS settings should apply per-channel.
 * @param {Function} callback
 * @method qos
 */
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

/**
 * Start a queue consumer.
 *
 * This method asks the server to start a "consumer", which is a transient request for
 * messages from a specific queue. Consumers last as long as the channel they were declared on,
 * or until the client cancels them.
 *
 * @param {String} queueName Specifies the name of the queue to consume from.
 * @param {Object} [options]
 * @param {String|null} [options.consumerTag=null] Specifies the identifier for the consumer.
 *    The consumer tag is local to a channel, so two clients can use the same consumer tags.
 *    If this field is empty the server will generate a unique tag.
 *    The client MUST NOT specify a tag that refers to an existing consumer.
 *    Error code: not-allowed
 *    The consumer tag is valid only within the channel from which the consumer was created.
 *    I.e. a client MUST NOT create a consumer in one channel and then use it in another.
 *    Error code: not-allowed
 * @param {Boolean} [options.noLocal=false] If the no-local field is set the server will not
 *    send messages to the connection that published them.
 * @param {Boolean} [options.noAck=false] If this field is set the server does not expect
 *    acknowledgements for messages. That is, when a message is delivered to the client
 *    the server assumes the delivery will succeed and immediately dequeues it.
 *    This functionality may increase performance but at the cost of reliability.
 *    Messages can get lost if a client dies before they are delivered to the application.
 * @param {Boolean} [options.exclusive=false] Request exclusive consumer access,
 *    meaning only this consumer can access the queue.
 *    * The client MAY NOT gain exclusive access to a queue that already has active consumers.
 *    Error code: access-refused
 * @param {Boolean} [options.noWait=false] If set, the server will not respond to the method.
 *    The client should not wait for a reply method.
 *    If the server could not complete the method it will raise a channel or
 *    connection exception.
 * @param {Object} [options.arguments={}] A set of arguments for the consume.
 *    The syntax and semantics of these arguments depends on the server implementation.
 * @param {Function} subscriber All messages will put to this function. 1st argument is content of message.
 *    2nd arg is headers of messages.
 *    3rd arg is options of message.
 *    4th arg is arguments of message.
 * @param {Function} callback This function will be spawned after subscribe to queue. 1st arg is error if is.
 *    2nd - consumerTag.
 * @method consume
 */
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
          return subscriber(content, headers, properties, options);
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

/**
 * End a queue consumer.
 *
 * This method cancels a consumer. This does not affect already delivered messages,
 * but it does mean the server will not send any more messages for that consumer.
 * The client may receive an arbitrary number of messages in between sending the cancel
 * method and receiving the cancel-ok reply.
 * It may also be sent from the server to the client in the event of the consumer
 * being unexpectedly cancelled (i.e. cancelled for any reason other than the server
 * receiving the corresponding basic.cancel from the client).
 * This allows clients to be notified of the loss of consumers due to events such as
 * queue deletion. Note that as it is not a MUST for clients to accept this method from
 * the server, it is advisable for the broker to be able to identify those clients that
 * are capable of accepting the method, through some means of capability negotiation.
 *
 * * If the queue does not exist the server MUST ignore the cancel method,
 * so long as the consumer tag is valid for that channel.
 * @param {String} consumerTag Identifier for the consumer, valid within the current channel.
 * @param {Object} [options]
 * @param {Boolean} [options.noWait=false] If set, the server will not respond to the method.
 *    The client should not wait for a reply method.
 *    If the server could not complete the method it will raise a channel or
 *    connection exception.
 * @param {Function} callback
 * @method cancel
 */
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

/**
 * Publish a message.
 *
 * This method publishes a message to a specific exchange.
 * The message will be routed to queues as defined by the exchange configuration and
 * distributed to any active consumers when the transaction, if any, is committed.
 *
 * @param {String} exchange=''  Specifies the name of the exchange to publish to.
 *    The exchange name can be empty, meaning the default exchange.
 *    If the exchange name is specified, and that exchange does not exist,
 *    the server will raise a channel exception.
 *    * The client MUST NOT attempt to publish a content to an exchange that does not exist.
 *    Error code: not-found.
 *    * The server MUST accept a blank exchange name to mean the default exchange.
 *    * If the exchange was declared as an internal exchange, the server MUST raise a
 *    channel exception with a reply code 403 (access refused).
 *    * The exchange MAY refuse basic content in which case it MUST raise a
 *    channel exception with reply code 540 (not implemented).
 * @param {String} routingKey='' Specifies the routing key for the message.
 *    The routing key is used for routing messages depending on the exchange configuration.
 * @param {String} body
 * @param {Object} [options]
 * @param {Boolean} [options.mandatory=false] This flag tells the server how to react if the
 *    message cannot be routed to a queue.
 *    If this flag is set, the server will return an unroutable message with a Return method.
 *    If this flag is zero, the server silently drops the message.
 * @param {Boolean} [options.immediate=false] This flag tells the server how to react if
 *    the message cannot be routed to a queue consumer immediately.
 *    If this flag is set, the server will return an undeliverable message with a Return method.
 *    If this flag is zero, the server will queue the message, but with no guarantee that it
 *    will ever be consumed.
 *
 * @param {String} [options.callbackMechanism='just_callback'] Specify callback mechanism for publishing message.
 * @param {String} [options.replyTo] Address to reply to.
 * @param {String} [options.appId] Creating application id.
 * @param {String} [options.userId] Creating user id.
 * @param {Date} [options.timestamp] Message timestamp.
 * @param {String} [options.expiration] Message expiration specification.
 * @param {String} [options.messageId] Application message identifier.
 *    By default sets to incremental counter with `_`prefix.
 * @param {String} [options.correlationId] Application correlation identifier.
 * @param {String} [options.type] Message type name.
 * @param {String} [options.contentType] MIME content type.
 * @param {String} [options.contentEncoding] MIME content encoding.
 * @param {Object} [headers] User headers to message.
 * @param {Function} [callback]
 * @method publish
 */
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

  var realHeaders = this._getRealHeaders(options, h);

  this.client.basic.publish(this.id, exchange, routingKey, mandatory, immediate, realHeaders, body, (err) => {
    return cb(err);
  });
};

/**
 * Return a failed message.
 *
 * This method returns an undeliverable message that was published with the "immediate"
 * flag set, or an unroutable message published with the "mandatory" flag set.
 * The reply code and text provide information about the reason that the message
 * was undeliverable.
 * @param {Number} replyCode The reply code. The AMQ reply codes are defined as constants
 * at http://www.rabbitmq.com/amqp-0-9-1-reference.html#constants.
 * @param {String} replyText The localised reply text. This text can be logged as an aid to resolving issues.
 * @param {String} exchange Specifies the name of the exchange that the message was originally published to.
 *    May be empty, meaning the default exchange.
 * @param {String} routingKey Specifies the routing key name specified when the message was published.
 * @param {String} body Body of message, was returned.
 * @param {Function} callback
 * @method return
 */
Basic.prototype['return'] = function(replyCode, replyText, exchange, routingKey, body, callback){
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err)};
  }

  exchange = exchange || '';
  routingKey = routingKey || '';

  this.client.basic.return(this.id, replyCode, replyText, exchange, routingKey, (err)=>{
    if (err) {
      return callback(err);
    }
    this.client.content(this.id, 'basic', {}, body, (err) => {
        if (err) return callback(err);
        callback();
    });
  });

};

/**
 * Direct access to a queue.
 *
 * This method provides a direct access to the messages in a queue using a synchronous
 * dialogue that is designed for specific types of application where synchronous
 * functionality is more important than performance.
 * @param {String} queue Specifies the name of the queue to get a message from.
 * @param {Object} [options]
 * @param {Boolean} [options.noAck=false] If this field is set the server does not expect
 *    acknowledgements for messages. That is, when a message is delivered to the client
 *    the server assumes the delivery will succeed and immediately dequeues it.
 *    This functionality may increase performance but at the cost of reliability.
 *    Messages can get lost if a client dies before they are delivered to the application.
 * @param {Function} callback 1st parameter is error. 2ns - is body of message. Is null - queue is empty.
 *    3rd arg is headers of messages.
 *    4th arg is options of message.
 *    5th arg is arguments of message.
 * @method get
 */
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
        return callback(null, content, headers, properties, options);
      });
    }.bind(this);
    this.client.once(this.id + ':basic.get-empty', successEmpty);
    this.client.once(this.id + ':basic.get-ok', successMessage);
    this.channel.once('close', error);
  });
};

/**
 * Acknowledge one or more messages.
 *
 * When sent by the client, this method acknowledges one or more messages delivered
 * via the Deliver or Get-Ok methods.
 * When sent by server, this method acknowledges one or more messages published with the
 * Publish method on a channel in confirm mode.
 * The acknowledgement can be for a single message or a set of messages up to and
 * including a specific message.
 * @param {Number} deliveryTag The server-assigned and channel-specific delivery tag.
 *    * You can found it on properties of consumed message.
 *    * The delivery tag is valid only within the channel from which the message was received.
 *    I.e. a client MUST NOT receive a message on one channel and then acknowledge it on another.
 *    * The server MUST NOT use a zero value for delivery tags.
 *    Zero is reserved for client use, meaning "all messages so far received".
 * @param {Object} [options]
 * @param {Boolean} [options.multiple=false] If set to 1, the delivery tag is treated as
 *    "up to and including", so that multiple messages can be acknowledged with a single method.
 *    If set to zero, the delivery tag refers to a single message.
 *    If the multiple field is 1, and the delivery tag is zero,
 *    this indicates acknowledgement of all outstanding messages.
 *    * A message MUST not be acknowledged more than once.
 *    The receiving peer MUST validate that a non-zero delivery-tag refers
 *    to a delivered message, and raise a channel exception if this is not the case.
 *    On a transacted channel, this check MUST be done immediately and not delayed until
 *    a Tx.Commit. Error code: precondition-failed
 * @param {Function} callback
 * @method ack
 */
Basic.prototype.ack = function(deliveryTag, options, callback){
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err)};
  }

  var multiple = typeof options === 'boolean' ? options : 'multiple' in options ? !!options.multiple : DEFAULT_MULTIPLE;

  var cb = this._getPCb();

  this.client.basic.ack(this.id, deliveryTag, multiple, cb(callback));
};

/**
 * Reject an incoming message.
 *
 * This method allows a client to reject a message.
 * It can be used to interrupt and cancel large incoming messages,
 * or return untreatable messages to their original queue.
 * * The server SHOULD be capable of accepting and process the Reject method
 * while sending message content with a Deliver or Get-Ok method.
 * I.e. the server should read and process incoming methods while sending output frames.
 * To cancel a partially-send content, the server sends a content body frame of size 1
 * (i.e. with no data except the frame-end octet).
 * * The server SHOULD interpret this method as meaning that the client is unable
 * to process the message at this time.
 * * The client MUST NOT use this method as a means of selecting messages to process.
 * @param {Number} deliveryTag The server-assigned and channel-specific delivery tag.
 *    * You can found it on properties of consumed message.
 *    * The delivery tag is valid only within the channel from which the message was received.
 *    I.e. a client MUST NOT receive a message on one channel and then acknowledge it on another.
 *    * The server MUST NOT use a zero value for delivery tags.
 *    Zero is reserved for client use, meaning "all messages so far received".
 * @param {Object} [options]
 * @param {Boolean} [options.requeue=false] If requeue is true, the server will attempt to requeue the message.
 *    If requeue is false or the requeue attempt fails the messages are discarded or dead-lettered.
 *    * The server MUST NOT deliver the message to the same client within the context of
 *    the current channel. The recommended strategy is to attempt to deliver the message
 *    to an alternative consumer, and if that is not possible,
 *    to move the message to a dead-letter queue.
 *    The server MAY use more sophisticated tracking to hold the message on
 *    the queue and redeliver it to the same client at a later stage.
 * @param {Function} callback
 * @method reject
 */
Basic.prototype.reject = function(deliveryTag, options, callback){
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err)};
  }

  var requeue = typeof options === 'boolean' ? options : 'requeue' in options ? !!options.requeue : DEFAULT_REQUEUE;

  var cb = this._getPCb();

  this.client.basic.reject(this.id, deliveryTag, requeue, cb(callback));
};

/**
 * Redeliver unacknowledged messages.
 *
 * This method asks the server to redeliver all unacknowledged messages on a specified channel.
 * Zero or more messages may be redelivered.
 * This method is deprecated in favour of the synchronous Recover/Recover-Ok.
 * * The server MUST set the redelivered flag on all messages that are resent.
 * @param {Object} [options]
 * @param {Object} [options.requeue=false] If this field is zero,
 *    the message will be redelivered to the original recipient.
 *    If this bit is 1, the server will attempt to requeue the message,
 *    potentially then delivering it to an alternative subscriber.
 * @param {Function} callback
 * @method recoverAsync
 */
Basic.prototype.recoverAsync = function(options, callback){
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err)};
  }

  var requeue = typeof options === 'boolean' ? options : 'requeue' in options ? !!options.requeue : DEFAULT_REQUEUE;

  this.client.basic['recover-async'](this.id, requeue, (err) => {
    if (err){
      return callback(err);
    }
    this._wrap('recover-async', callback);
  });
};

/**
 * Redeliver unacknowledged messages.
 *
 * This method asks the server to redeliver all unacknowledged messages on a specified channel.
 * Zero or more messages may be redelivered. This method replaces the asynchronous Recover.
 * * The server MUST set the redelivered flag on all messages that are resent.
 * @param {Object} [options]
 * @param {Object} [options.requeue=false] If this field is zero,
 *    the message will be redelivered to the original recipient.
 *    If this bit is 1, the server will attempt to requeue the message,
 *    potentially then delivering it to an alternative subscriber.
 * @param {Function} callback
 * @method recover
 */
Basic.prototype.recover = function(options, callback){
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err)};
  }

  var requeue = typeof options === 'boolean' ? options : 'requeue' in options ? !!options.requeue : DEFAULT_REQUEUE;

  this.client.basic.recover(this.id, requeue, (err) => {
    if (err){
      return callback(err);
    }
    this._wrap('recover-async', callback);
  });
};

/**
 * Reject one or more incoming messages.
 *
 * This method allows a client to reject one or more incoming messages.
 * It can be used to interrupt and cancel large incoming messages,
 * or return untreatable messages to their original queue.
 * This method is also used by the server to inform publishers on channels in
 * confirm mode of unhandled messages. If a publisher receives this method,
 * it probably needs to republish the offending messages.
 * * The server SHOULD be capable of accepting and processing the Nack method while
 * sending message content with a Deliver or Get-Ok method.
 * I.e. the server should read and process incoming methods while sending output frames.
 * To cancel a partially-send content, the server sends a content body frame of size 1
 * (i.e. with no data except the frame-end octet).
 * * The server SHOULD interpret this method as meaning that the client is unable
 * to process the message at this time.
 * * The client MUST NOT use this method as a means of selecting messages to process.
 * * A client publishing messages to a channel in confirm mode SHOULD be capable of accepting
 * and somehow handling the Nack method.
 * @param {Number} deliveryTag The server-assigned and channel-specific delivery tag.
 *    * You can found it on properties of consumed message.
 *    * The delivery tag is valid only within the channel from which the message was received.
 *    I.e. a client MUST NOT receive a message on one channel and then acknowledge it on another.
 *    * The server MUST NOT use a zero value for delivery tags.
 *    Zero is reserved for client use, meaning "all messages so far received".
 * @param {Object} [options]
 * @param {Boolean} [options.multiple=false] If set to 1, the delivery tag is treated as
 *    "up to and including", so that multiple messages can be rejected with a single method.
 *    If set to zero, the delivery tag refers to a single message.
 *    If the multiple field is 1, and the delivery tag is zero, this indicates rejection
 *    of all outstanding messages.
 *    * A message MUST not be rejected more than once.
 *    The receiving peer MUST validate that a non-zero delivery-tag refers to an unacknowledged,
 *    delivered message, and raise a channel exception if this is not the case.
 *    Error code: precondition-failed
 * @param {Boolean} [options.requeue=false] If requeue is true, the server will attempt to
 *    requeue the message. If requeue is false or the requeue attempt fails the
 *    messages are discarded or dead-lettered.
 *    Clients receiving the Nack methods should ignore this flag.
 *    * The server MUST NOT deliver the message to the same client within the context
 *    of the current channel. The recommended strategy is to attempt to deliver
 *    the message to an alternative consumer, and if that is not possible,
 *    to move the message to a dead-letter queue.
 *    The server MAY use more sophisticated tracking to hold the message on the
 *    queue and redeliver it to the same client at a later stage.
 * @param {Function} callback
 * @method nack
 */
Basic.prototype.nack = function(deliveryTag, options, callback){
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err)};
  }

  var multiple =  typeof options === 'boolean' ? options : 'multiple' in options ? !!options.multiple : DEFAULT_MULTIPLE;
  var requeue = typeof arguments[2] === 'boolean' ? arguments[3] : 'requeue' in options ? !!options.requeue : DEFAULT_REQUEUE;

  var cb = this._getPCb();

  this.client.basic.nack(this.id, deliveryTag, multiple, requeue, cb(callback));
};

/**
 * @method setPublishCallback
 * @param {String} string
 */
Basic.prototype.$setPublishCallback = function(string){
  this.publishCallbackMethod = string.toLowerCase();
};

/**
 * @method $setTimeout
 * @param {Number} t
 */
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