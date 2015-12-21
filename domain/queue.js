'use strict';

var DEFAULT_TYPE = 'topic';
var DEFAULT_QUEUE_NAME = '';
var DEFAULT_PASSIVE = false;
var DEFAULT_DURABLE = false;
var DEFAULT_EXCLUSIVE = false;
var DEFAULT_NO_WAIT = false;
var DEFAULT_AUTO_DELETE = false;
var DEFAULT_ARGUMENTS = false;
var DEFAULT_IF_UNUSED = false;
var DEFAULT_IF_EMPTY = false;

var EE = require('events').EventEmitter;

/**
 * Work with queues.
 *
 * Queues store and forward messages.
 * Queues can be configured in the server or created at runtime.
 * Queues must be attached to at least one exchange in order to receive messages from publishers.
 * @param {BRAMQPClient} client Client object that returns from bramqp#openAMQPCommunication() method.
 * @param {Channel} channel Channel object (should be opened).
 * @return {Queue}
 * @extends EventEmitter
 * @constructor
 */
function Queue(client, channel){
  EE.call(this);
  this.client = client;
  this.channel = channel;
  this.id = channel.$getId();

  return this;
}

require('util').inherits(Queue, EE);

/**
 * Declare queue, create if needed.
 *
 * This method creates or checks a queue.
 * When creating a new queue the client can specify various properties that control the
 * durability of the queue and its contents, and the level of sharing for the queue.
 * * The server MUST create a default binding for a newly-declared queue to the default exchange,
 * which is an exchange of type 'direct' and use the queue name as the routing key.
 * * The server SHOULD support a minimum of 256 queues per virtual host and ideally,
 * impose no limit except as defined by available resources.
 * @param {String} queue The queue name MAY be empty, in which case the server MUST create
 *    a new queue with a unique generated name and return this to the client in the
 *    Declare-Ok method.
 *    * Queue names starting with "amq." are reserved for pre-declared and standardised queues.
 *    The client MAY declare a queue starting with "amq." if the passive option is set,
 *    or the queue already exists. Error code: access-refused
 *    * The queue name can be empty, or a sequence of these characters: letters, digits,
 *    hyphen, underscore, period, or colon. Error code: precondition-failed
 * @param {Object} [options]
 * @param {Boolean} [options.passive=false] If set, the server will reply with Declare-Ok
 *    if the queue already exists with the same name, and raise an error if not.
 *    The client can use this to check whether a queue exists without modifying the server state.
 *    When set, all other method fields except name and no-wait are ignored.
 *    A declare with both passive and no-wait has no effect.
 *    Arguments are compared for semantic equivalence.
 *    * The client MAY ask the server to assert that a queue exists without creating
 *    the queue if not. If the queue does not exist, the server treats this as a failure.
 *    Error code: not-found
 *    * If not set and the queue exists, the server MUST check that the existing queue
 *    has the same values for durable, exclusive, auto-delete, and arguments fields.
 *    The server MUST respond with Declare-Ok if the requested queue matches these fields,
 *    and MUST raise a channel exception if not.
 * @param {Boolean} [options.durable=false] If set when creating a new queue,
 *    the queue will be marked as durable.
 *    Durable queues remain active when a server restarts.
 *    Non-durable queues (transient queues) are purged if/when a server restarts.
 *    Note that durable queues do not necessarily hold persistent messages, although
 *    it does not make sense to send persistent messages to a transient queue.
 *    * The server MUST recreate the durable queue after a restart.
 *    * The server MUST support both durable and transient queues.
 * @param {Boolean} [options.exclusive=false] Exclusive queues may only be accessed by the
 *    current connection, and are deleted when that connection closes.
 *    Passive declaration of an exclusive queue by other connections are not allowed.
 *    * The server MUST support both exclusive (private) and non-exclusive (shared) queues.
 *    * The client MAY NOT attempt to use a queue that was declared as exclusive by
 *    another still-open connection. Error code: resource-locked
 * @param {Boolean} [options.autoDelete=false] If set, the queue is deleted when all consumers
 *    have finished using it. The last consumer can be cancelled either explicitly or
 *    because its channel is closed. If there was no consumer ever on the queue,
 *    it won't be deleted. Applications can explicitly delete auto-delete queues using
 *    the Delete method as normal.
 *    * The server MUST ignore the auto-delete field if the queue already exists.
 * @param {Boolean} [options.noWait=false] If set, the server will not respond to the method.
 *    The client should not wait for a reply method.
 *    If the server could not complete the method it will raise a channel or connection exception.
 * @param {Object} [options.arguments={}] A set of arguments for the declaration.
 *    The syntax and semantics of these arguments depends on the server implementation.
 * @param {Function} callback
 */
Queue.prototype.declare = function(queue, options, callback){
  options = options || {};
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err);};
  }

  var passive = 'passive' in options ? !!options.passive : DEFAULT_PASSIVE;
  var durable = 'durable' in options ? !!options.durable : DEFAULT_DURABLE;
  var exclusive = 'exclusive' in options ? !!options.exclusive : DEFAULT_EXCLUSIVE;
  var autoDelete = 'autoDelete' in options ? !!options.autoDelete : DEFAULT_AUTO_DELETE;
  var noWait = 'noWait' in options ? !!options.noWait : DEFAULT_NO_WAIT;
  var table = 'arguments' in options ? options['arguments'] : DEFAULT_ARGUMENTS;

  this.client.queue.declare(this.id, queue, passive, durable, exclusive, autoDelete, noWait, table, (err) => {
    if (err) return callback(err);
    this._wrap('declare', callback);
  });
};

/**
 * Bind queue to an exchange.
 *
 * This method binds a queue to an exchange.
 * Until a queue is bound it will not receive any messages.
 * In a classic messaging model, store-and-forward queues are bound to a direct exchange
 * and subscription queues are bound to a topic exchange.
 * * A server MUST allow ignore duplicate bindings - that is, two or more bind methods for
 * a specific queue, with identical arguments - without treating these as an error.
 * * A server MUST not deliver the same message more than once to a queue, even
 * if the queue has multiple bindings that match the message.
 * * The server MUST allow a durable queue to bind to a transient exchange.
 * * Bindings of durable queues to durable exchanges are automatically durable and the
 * server MUST restore such bindings after a server restart.
 * * The server SHOULD support at least 4 bindings per queue, and ideally,
 * impose no limit except as defined by available resources.
 * @param {String} queue Specifies the name of the queue to bind.
 *    * The client MUST either specify a queue name or have previously declared a queue
 *    on the same channel Error code: not-found
 *    * The client MUST NOT attempt to bind a queue that does not exist. Error code: not-found
 * @param {String} exchange Name of the exchange to bind to.
 *    * A client MUST NOT be allowed to bind a queue to a non-existent exchange.
 *    Error code: not-found
 *    * The server MUST accept a blank exchange name to mean the default exchange.
 * @param {String} routingKey Specifies the routing key for the binding.
 *    The routing key is used for routing messages depending on the exchange configuration.
 *    Not all exchanges use a routing key - refer to the specific exchange documentation.
 *    If the queue name is empty, the server uses the last queue declared on the channel.
 *    If the routing key is also empty, the server uses this queue name for the routing key
 *    as well. If the queue name is provided but the routing key is empty, the server does the
 *    binding with that empty routing key. The meaning of empty routing keys depends on the
 *    exchange implementation.
 *    * If a message queue binds to a direct exchange using routing key K and a publisher s
 *    ends the exchange a message with routing key R, then the message MUST be passed to
 *    the message queue if K = R.
 * @param {Object} [options]
 * @param {Boolean} [options.noWait=false] If set, the server will not respond to the method.
 *    The client should not wait for a reply method.
 *    If the server could not complete the method it will raise a channel or connection exception.
 * @param {Object} [options.arguments={}] A set of arguments for the declaration.
 *    The syntax and semantics of these arguments depends on the server implementation.
 * @param {Function} callback
 */
Queue.prototype.bind = function(queue, exchange, routingKey, options, callback){
  options = options || {};
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err);};
  }

  var noWait = 'noWait' in options ? !!options.noWait : DEFAULT_NO_WAIT;
  var table = 'arguments' in options ? options['arguments'] : DEFAULT_ARGUMENTS;

  this.client.queue.bind(this.id, queue, exchange, routingKey, noWait, table, (err) => {
    if (err) return callback(err);
    this._wrap('bind', callback);
  });
};

/**
 * Unbind a queue from an exchange.
 *
 * This method unbinds a queue from an exchange.
 * If a unbind fails, the server MUST raise a connection exception.
 * @param {String} queue Specifies the name of the queue to unbind.
 *    * The client MUST either specify a queue name or have previously declared a
 *    queue on the same channel Error code: not-found
 *    * The client MUST NOT attempt to unbind a queue that does not exist. Error code: not-found
 * @param {String} exchange The name of the exchange to unbind from.
 *    * The client MUST NOT attempt to unbind a queue from an exchange that does not exist.
 *    Error code: not-found
 *    * The server MUST accept a blank exchange name to mean the default exchange.
 * @param {String} routingKey Specifies the routing key of the binding to unbind.
 * @param {Object} [options]
 * @param {Object} [options.arguments={}] A set of arguments for the declaration.
 *    The syntax and semantics of these arguments depends on the server implementation.
 * @param {Function} callback
 */
Queue.prototype.unbind = function(queue, exchange, routingKey, options, callback){
  options = options || {};
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err);};
  }

  var noWait = 'noWait' in options ? !!options.noWait : DEFAULT_NO_WAIT;
  var table = 'arguments' in options ? options['arguments'] : DEFAULT_ARGUMENTS;

  this.client.queue.unbind(this.id, queue, exchange, routingKey, noWait, table, (err) => {
    if (err) return callback(err);
    this._wrap('unbind', callback);
  });
};

/**
 * Purge a queue.
 * This method removes all messages from a queue which are not awaiting acknowledgment.
 * * The server MUST NOT purge messages that have already been sent to a client but
 * not yet acknowledged.
 * * The server MAY implement a purge queue or log that allows system administrators
 * to recover accidentally-purged messages.
 * The server SHOULD NOT keep purged messages in the same storage spaces as the
 * live messages since the volumes of purged messages may get very large.
 * @param {String} queue Specifies the name of the queue to purge.
 *    * The client MUST either specify a queue name or have previously declared a queue
 *    on the same channel Error code: not-found
 *    * The client MUST NOT attempt to purge a queue that does not exist. Error code: not-found
 * @param {Object} [options]
 * @param {Boolean} [options.noWait=false] If set, the server will not respond to the method.
 *    The client should not wait for a reply method.
 * @param {Function} callback
 */
Queue.prototype.purge = function(queue, options, callback){
  options = options || {};
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err);};
  }

  var noWait = typeof options === 'boolean' ? options : 'noWait' in options ? !!options.noWait : DEFAULT_NO_WAIT;

  this.client.queue.bind(this.id, queue, noWait, (err) => {
    if (err) return callback(err);
    this._wrap('purge', callback);
  });
};

/**
 * Delete a queue.
 *
 * This method deletes a queue.
 * When a queue is deleted any pending messages are sent to a dead-letter queue if this
 * is defined in the server configuration, and all consumers on the queue are cancelled.
 * * The server SHOULD use a dead-letter queue to hold messages that were pending on a
 * deleted queue, and MAY provide facilities for a system administrator to move these messages
 * back to an active queue.
 * @param {String} queue Specifies the name of the queue to delete.
 *    * The client MUST either specify a queue name or have previously declared a queue
 *    on the same channel Error code: not-found
 *    * The client MUST NOT attempt to delete a queue that does not exist.
 *    Error code: not-found
 * @param {Object} [options]
 * @param {Boolean} [options.ifUnused=false] If set, the server will only delete the queue if it has no consumers.
 *    If the queue has consumers the server does does not delete it but raises a channel
 *    exception instead.
 *    * The server MUST NOT delete a queue that has consumers on it,
 *    if the if-unused field is true. Error code: precondition-failed
 * @param {Boolean} [options.ifEmpty=false] If set, the server will only delete the queue if it has no messages.
 *    * The server MUST NOT delete a queue that has messages on it,
 *    if the if-empty field is true. Error code: precondition-failed
 * @param {Boolean} [options.noWait=false] If set, the server will not respond to the method.
 *    The client should not wait for a reply method.
 * @param {Function} callback
 */
Queue.prototype['delete'] = function(queue, options, callback){
  options = options || {};
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err);};
  }

  var ifUnused = 'ifUnused' in options ? !!options.ifUnused : DEFAULT_IF_UNUSED;
  var ifEmpty = 'ifEmpty' in options ? !!options.ifEmpty : DEFAULT_IF_EMPTY;
  var noWait = 'noWait' in options ? !!options.noWait : DEFAULT_NO_WAIT;

  this.client.queue.delete(this.id, queue, ifUnused, ifEmpty, noWait, (err) => {
    if (err) return callback(err);
    this._wrap('delete', callback);
  });
};


Queue.prototype._wrap = function(doing, callback){
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

Queue.prototype._getEventString = function(doing){
  return this.id + ':queue.'+doing+'-ok';
};


module.exports = Queue;