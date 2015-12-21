'use strict';

/**
 * Queue (not amqp) element class.
 * @class scheduler.QueueElement
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
 * Returns value
 * @return {Function}
 */
QueueElement.prototype.getValue = function(){
  return this.value;
};

/**
 * Sets next element.
 * @param {QueueElement} queueElement
 * @return {QueueElement}
 */
QueueElement.prototype.setNext = function(queueElement){
  this.next = queueElement;
  return this;
};

/**
 * Get next element or null if has not next.
 * @return {null|QueueElement}
 */
QueueElement.prototype.getNext = function(){
  return this.next;
};

/**
 * Set next element and return it.
 * @param {QueueElement} queueElement
 * @return {QueueElement}
 */
QueueElement.prototype.setGetNext = function(queueElement){
  this.next = queueElement;
  return this.next;
};

/**
 * Check if no next is.
 * @return {Boolean}
 */
QueueElement.prototype.isLast = function(){
  return this.next === null;
};

/**
 * Create instance.
 * @param {*} value
 * @return {QueueElement}
 */
QueueElement.getInstance = function(value){
  return new QueueElement(value);
};

module.exports = QueueElement;