'use strict';

var DEFAULT_TYPE = 'topic';
var DEFAULT_EXCHANGE_NAME = '';
var DEFAULT_PASSIVE = false;
var DEFAULT_DURABLE = false;
var DEFAULT_INTERNAL = false;
var DEFAULT_NO_WAIT = false;
var DEFAULT_AUTO_DELETE = false;
var DEFAULT_ARGUMENTS = false;
var DEFAULT_IF_UNUSED = false;

var EE = require('events').EventEmitter;

/**
 * Work with exchanges.
 *
 * Exchanges match and distribute messages across queues.
 * Exchanges can be configured in the server or declared at runtime.
 * @extends EventEmitter
 * @param {BRAMQPClient} client Client object that returns from bramqp#openAMQPCommunication() method.
 * @param {Channel} channel Channel object (should be opened).
 * @return {Exchange}
 * @constructor
 */
function Exchange(client, channel){
  EE.call(this);
  this.client = client;
  this.channel = channel;
  this.id = channel.$getId();

  return this;
}

require('util').inherits(Exchange, EE);

/**
 * Verify exchange exists, create if needed.
 *
 * This method creates an exchange if it does not already exist,
 * and if the exchange exists, verifies that it is of the correct and expected class.
 * * The server SHOULD support a minimum of 16 exchanges per virtual host and ideally,
 * impose no limit except as defined by available resources.
 * @param {String} exchange The exchange name is a client-selected string that identifies the
 *    exchange for publish methods.
 *    * Exchange names starting with "amq." are reserved for pre-declared and standardised
 *    exchanges. The client MAY declare an exchange starting with "amq." if the passive option
 *    is set, or the exchange already exists. Error code: access-refused
 *    * The exchange name consists of a non-empty sequence of these characters:
 *    letters, digits, hyphen, underscore, period, or colon. Error code: precondition-failed
 * @param {String} [type='topic'] Each exchange belongs to one of a set of exchange types
 *    implemented by the server. The exchange types define the functionality of the
 *    exchange - i.e. how messages are routed through it. It is not valid or meaningful
 *    to attempt to change the type of an existing exchange.
 *    * Exchanges cannot be redeclared with different types.
 *    The client MUST not attempt to redeclare an existing exchange with a
 *    different type than used in the original Exchange.Declare method.
 *    Error code: not-allowed
 *    * The client MUST NOT attempt to declare an exchange with a type that
 *    the server does not support. Error code: command-invalid
 * @param {Object} [options]
 * @param {Boolean} [options.passive=false] If set, the server will reply with Declare-Ok
 *    if the exchange already exists with the same name, and raise an error if not.
 *    The client can use this to check whether an exchange exists without modifying the
 *    server state. When set, all other method fields except name and no-wait are ignored.
 *    A declare with both passive and no-wait has no effect.
 *    Arguments are compared for semantic equivalence.
 *    * If set, and the exchange does not already exist, the server MUST raise a
 *    channel exception with reply code 404 (not found).
 *    * If not set and the exchange exists, the server MUST check that the existing
 *    exchange has the same values for type, durable, and arguments fields.
 *    The server MUST respond with Declare-Ok if the requested exchange matches these fields,
 *    and MUST raise a channel exception if not.
 * @param {Boolean} [options.durable=false] If set when creating a new exchange,
 *    the exchange will be marked as durable.
 *    Durable exchanges remain active when a server restarts.
 *    Non-durable exchanges (transient exchanges) are purged if/when a server restarts.
 *    * The server MUST support both durable and transient exchanges.
 * @param {Boolean} [options.autoDelete=false] If set, the exchange is deleted when all queues
 *    have finished using it.
 *    * The server SHOULD allow for a reasonable delay between the point when
 *    it determines that an exchange is not being used (or no longer used),
 *    and the point when it deletes the exchange.
 *    At the least it must allow a client to create an exchange and then bind a queue to it,
 *    with a small but non-zero delay between these two actions.
 *    * The server MUST ignore the auto-delete field if the exchange already exists.
 * @param {Boolean} [options.internal=false] If set, the exchange may not be used directly
 *    by publishers, but only when bound to other exchanges.
 *    Internal exchanges are used to construct wiring that is not visible to applications.
 * @param {Boolean} [options.noWait=false] If set, the server will not respond to the method.
 *    The client should not wait for a reply method.
 *    If the server could not complete the method it will raise a channel or connection exception.
 * @param {Object} [options.arguments={}] A set of arguments for the declaration.
 *    The syntax and semantics of these arguments depends on the server implementation.
 * @param {Function} callback
 * @method declare
 */
Exchange.prototype.declare = function(exchange, type, options, callback){
  options = options || {};
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err);};
  }

  if (typeof type === 'object'){
    options = type;
    type = '';
  }
  else if (typeof type === 'function'){
    type = '';
  }

  type = type || DEFAULT_TYPE;

  var passive = 'passive' in options ? !!options.passive : DEFAULT_PASSIVE;
  var durable = 'durable' in options ? !!options.durable : DEFAULT_DURABLE;
  var autoDelete = 'autoDelete' in options ? !!options.autoDelete : DEFAULT_AUTO_DELETE;
  var internal = 'internal' in options ? !!options.internal : DEFAULT_INTERNAL;
  var noWait = 'noWait' in options ? !!options.noWait : DEFAULT_NO_WAIT;
  var table = 'arguments' in options ? options['arguments'] : DEFAULT_ARGUMENTS;

  this.client.exchange.declare(this.id, exchange, type, passive, durable, autoDelete, internal, noWait, table, (err) => {
    if (err) return callback(err);
    this._wrap('declare', callback);
  });
};

/**
 * Delete an exchange.
 *
 * This method deletes an exchange.
 * When an exchange is deleted all queue bindings on the exchange are cancelled.
 * @param {String} exchange The exchange name is a client-selected string that
 *    identifies the exchange for publish methods.
 *    * The client MUST NOT attempt to delete an exchange that does not exist.
 *    Error code: not-found
 * @param {Object} [options]
 * @param {Boolean} [options.ifUnused=false] If set, the server will only delete the exchange if it
 *    has no queue bindings. If the exchange has queue bindings the server does not
 *    delete it but raises a channel exception instead.
 *    * The server MUST NOT delete an exchange that has bindings on it,
 *    if the if-unused field is true. Error code: precondition-failed
 * @param {Boolean} [options.noWait=false] If set, the server will not respond to the method.
 *    The client should not wait for a reply method.
 *    If the server could not complete the method it will raise a channel or connection exception.
 * @param {Function} callback
 * @method delete
 */
Exchange.prototype['delete'] = function(exchange, options, callback){
  options = options || {};
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err);};
  }

  var ifUnused = 'ifUnused' in options ? !!options.ifUnused : DEFAULT_IF_UNUSED;
  var noWait = 'noWait' in options ? !!options.noWait : DEFAULT_NO_WAIT;

  this.client.exchange.delete(this.id, exchange, ifUnused, noWait, (err) => {
    if (err) return callback(err);
    this._wrap('delete', callback);
  });
};

/**
 * Bind exchange to an exchange.
 *
 * This method binds an exchange to an exchange.
 * * A server MUST allow and ignore duplicate bindings - that is, two or more bind
 * methods for a specific exchanges, with identical arguments - without treating these
 * as an error.
 * * A server MUST allow cycles of exchange bindings to be created including allowing
 * an exchange to be bound to itself.
 * * A server MUST not deliver the same message more than once to a destination exchange,
 * even if the topology of exchanges and bindings results in multiple (even infinite)
 * routes to that exchange.
 * @param {String} destination Specifies the name of the destination exchange to bind.
 *    * A client MUST NOT be allowed to bind a non-existent destination exchange.
 *    Error code: not-found
 *    * The server MUST accept a blank exchange name to mean the default exchange.
 * @param {String} source Specifies the name of the source exchange to bind.
 *    * A client MUST NOT be allowed to bind a non-existent source exchange.
 *    Error code: not-found
 *    * The server MUST accept a blank exchange name to mean the default exchange.
 * @param {String} routingKey Specifies the routing key for the binding.
 *    The routing key is used for routing messages depending on the exchange configuration.
 *    Not all exchanges use a routing key - refer to the specific exchange documentation.
 * @param {Object} [options]
 * @param {Boolean} [options.noWait=false] If set, the server will not respond to the method.
 *    The client should not wait for a reply method.
 *    If the server could not complete the method it will raise a channel or connection exception.
 * @param {Object} [options.arguments={}] A set of arguments for the declaration.
 *    The syntax and semantics of these arguments depends on the server implementation.
 * @param {Function} callback
 * @method bind
 */
Exchange.prototype.bind = function(destination, source, routingKey, options, callback){
  options = options || {};
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err);};
  }

  var noWait = 'noWait' in options ? !!options.noWait : DEFAULT_NO_WAIT;
  var table = 'arguments' in options ? options['arguments'] : DEFAULT_ARGUMENTS;

  this.client.exchange.bind(this.id, destination, source, routingKey, noWait, table, (err) => {
    if (err) return callback(err);
    this._wrap('bind', callback);
  });
};

/**
 * Unbind an exchange from an exchange.
 *
 * This method unbinds an exchange from an exchange.
 * If a unbind fails, the server MUST raise a connection exception.
 * @param {String} destination Specifies the name of the destination exchange to unbind.
 *    * The client MUST NOT attempt to unbind an exchange that does not exist from an exchange.
 *    Error code: not-found
 *    * The server MUST accept a blank exchange name to mean the default exchange.
 * @param {String} source Specifies the name of the source exchange to unbind.
 *    * The client MUST NOT attempt to unbind an exchange from an exchange that does not exist.
 *    Error code: not-found
 *    * The server MUST accept a blank exchange name to mean the default exchange.
 * @param {String} routingKey Specifies the routing key of the binding to unbind.
 * @param {Object} [options]
 * @param {Boolean} [options.noWait=false] If set, the server will not respond to the method.
 *    The client should not wait for a reply method.
 *    If the server could not complete the method it will raise a channel or connection exception.
 * @param {Object} [options.arguments={}] A set of arguments for the declaration.
 *    The syntax and semantics of these arguments depends on the server implementation.
 * @param {Function} callback
 * @method unbind
 */
Exchange.prototype.unbind = function(destination, source, routingKey, options, callback){
  options = options || {};
  callback = arguments[arguments.length-1];
  if (!(typeof callback === 'function')){
    callback = (err) => {if (err) this.emit('error', err);};
  }

  var noWait = 'noWait' in options ? !!options.noWait : DEFAULT_NO_WAIT;
  var table = 'arguments' in options ? options['arguments'] : DEFAULT_ARGUMENTS;

  this.client.exchange.unbind(this.id, destination, source, routingKey, noWait, table, (err) => {
    if (err) return callback(err);
    this._wrap('unbind', callback);
  });
};

Exchange.prototype._wrap = function(doing, callback){
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

Exchange.prototype._getEventString = function(doing){
  return this.id + ':exchange.'+doing+'-ok';
};


module.exports = Exchange;