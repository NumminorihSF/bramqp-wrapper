'use strict';
var QueueElement = require('./queue_element');
/**
 * Task queue.
 *
 * @private
 * @class TaskQueue
 * @return {TaskQueue}
 * @constructor
 */
function TaskQueue(capacity){
  this.head = null;
  this.tail = null;
  this.length = 0;
  this.capacity = capacity || 1000;
  return this;
}

TaskQueue.prototype.returnToQueue = function(task){
  var elem = QueueElement.getInstance(task);
  if (this.head === null){
    this.head = elem;
    this.tail = elem;
  }
  else {
    this.head = elem.setNext(this.head);
  }
  this.length += 1;
  return this;
};

/**
 * Add task to queue.
 * @param {Function} task
 * @return {TaskQueue}
 * @method add
 */
TaskQueue.prototype.add = function(task){
  var elem = QueueElement.getInstance(task);
  if (this.head === null){
    this.head = elem;
    this.tail = elem;
  }
  else {
    this.tail = this.tail.setGetNext(elem);
  }
  this.length += 1;
  return this;
};

/**
 * Get element on head. Does not delete.
 * @return {Function}
 * @method get
 */
TaskQueue.prototype.get = function(){
  return this.head.getValue();
};

/**
 * Remove head of queue.
 * @return {TaskQueue}
 * @method done
 */
TaskQueue.prototype.done = function(){
  this.length -= 1;
  if (this.head.isLast()){
    this.head = null;
    this.tail = null;
  }
  else {
    this.head = this.head.getNext();
  }
  return this;
};

/**
 * Clear queue.
 * @return {TaskQueue}
 * @method clear
 */
TaskQueue.prototype.clear = function(){
  this.length = 0;
  this.head = null;
  this.tail = null;
  return this;
};

/**
 * Check if queue is empty
 * @return {Boolean}
 * @method isEmpty
 */
TaskQueue.prototype.isEmpty = function(){
  return this.length === 0;
};


/**
 * Return queue instance.
 * @static
 * @return {TaskQueue}
 * @method getInstance
 */
TaskQueue.getInstance = function(capacity){
  return new TaskQueue(capacity);
};

module.exports = TaskQueue;