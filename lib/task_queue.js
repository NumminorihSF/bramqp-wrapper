'use strict';
var QueueElement = require('./queue_element');
/**
 * Класс, реализующий очередь задач внутри ядра.
 *
 * @class scheduler.TaskQueue
 * @alias  TaskQueue
 * @alternateClassName TaskQueue
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
 * Добавление задачи в очередь. Страшно матерится, если она переполнена.
 * @param {*} task
 * @return {TaskQueue}
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
 * Возвращает следующее задание из очереди. НЕ УДАЛЯЕТ ЕГО.
 * @return {*}
 */
TaskQueue.prototype.get = function(){
  return this.head.getValue();
};

/**
 * Удаляет завершенное задание из очереди.
 * @return {TaskQueue}
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
 * Очищает очередь от всех заданий.
 * @return {TaskQueue}
 */
TaskQueue.prototype.clear = function(){
  this.length = 0;
  this.head = null;
  this.tail = null;
  return this;
};

/**
 * Проверка очереди на отстуствие задач.
 * @return {Boolean}
 */
TaskQueue.prototype.isEmpty = function(){
  return this.length === 0;
};


/**
 * Ругается в логгер, создает дамп задач из очереди.
 * @private
 */
TaskQueue.prototype._fullQueueAlarm = function(){
  console.error('TaskQueue is full! Queue dump goes after.');
};

/**
 * Возвращает инстанс класса
 * @static
 * @return {TaskQueue}
 */
TaskQueue.getInstance = function(capacity){
  return new TaskQueue(capacity);
};

module.exports = TaskQueue;