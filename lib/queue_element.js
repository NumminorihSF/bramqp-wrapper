'use strict';

/**
 * Queue (not amqp) element class.
 * @class QueueElement
 * @alias  QueueElement
 * @alternateClassName QueueElement
 * @param {Function} value
 * @return {Queue}
 * @constructor
 */
function QueueElement (value){
  this.value = value;
  this.next = null;
}

/**
 * @method getValue
 * Returns value
 * @return {Function}
 */
QueueElement.prototype.getValue = function(){
  return this.value;
};

/**
 * @method setNext
 * Sets next element.
 * @param {QueueElement} queueElement
 * @return {QueueElement}
 */
QueueElement.prototype.setNext = function(queueElement){
  this.next = queueElement;
  return this;
};

/**
 * @method getNext
 * Get next element or null if has not next.
 * @return {null|QueueElement}
 */
QueueElement.prototype.getNext = function(){
  return this.next;
};

/**
 * @method setGetNext
 * Set next element and return it.
 * @param {QueueElement} queueElement
 * @return {QueueElement}
 */
QueueElement.prototype.setGetNext = function(queueElement){
  this.next = queueElement;
  return this.next;
};

/**
 * @method isLast
 * Check if no next is.
 * @return {Boolean}
 */
QueueElement.prototype.isLast = function(){
  return this.next === null;
};

/**
 * @method getInstance
 * @static
 * Create instance.
 * @param {Function} value
 * @return {QueueElement}
 */
QueueElement.getInstance = function(value){
  return new QueueElement(value);
};

module.exports = QueueElement;