/**
 * @class RabbitRouteError
 * @extends Error
 * @param {Object} errorObject Object, that RabbitMq returns.
 * @return {RabbitRouteError}
 * @constructor
 */
function RabbitRouteError(errorObject){
  Error.call(this);
  this.name = "RabbitRouteError";

  this.message = errorObject['reply-text'];
  this.code = errorObject['reply-code'];
  this.exchange = errorObject['exchange'];
  this.routingKey = errorObject['routing-key'];

  Error.captureStackTrace(this, RabbitRouteError);

  return this;
}

require('util').inherits(RabbitRouteError, Error);

module.exports = RabbitRouteError;
