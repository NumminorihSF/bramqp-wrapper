/**
 *
 * @param {Object} errorObject Object, that RabbitMq returns.
 * @return {RabbitClientError}
 * @constructor
 */
function RabbitClientError(errorObject){
  Error.call(this);
  this.name = "RabbitClientError";

  this.message = errorObject['reply-text'];
  this.code = errorObject['reply-code'];
  this.classId = errorObject['class-id'];
  this.methodId = errorObject['method-id'];

  Error.captureStackTrace(this, RabbitClientError);

  return this;
}

require('util').inherits(RabbitClientError, Error);

module.exports = RabbitClientError;
