'use strict';

/**
 * Класс элемента очереди.
 * @class scheduler.QueueElement
 * @alias  QueueElement
 * @alternateClassName QueueElement
 * @param {*} value Значение элемента
 * @return {Queue}
 * @constructor
 */
function QueueElement (value){
  this.value = value;
  this.next = null;
}

/**
 * Возвращает значение элемента.
 * @return {*}
 */
QueueElement.prototype.getValue = function(){
  return this.value;
};

/**
 * Устанавливает следующий элемент в очереди.
 * @param {QueueElement} queueElement
 * @return {QueueElement}
 */
QueueElement.prototype.setNext = function(queueElement){
  this.next = queueElement;
  return this;
};

/**
 * Возвращает следующий элемент или `null` если его нет.
 * @return {null|QueueElement}
 */
QueueElement.prototype.getNext = function(){
  return this.next;
};

/**
 * Устанавливает следующий элемент, возвращает его же.
 * @param {QueueElement} queueElement
 * @return {QueueElement}
 */
QueueElement.prototype.setGetNext = function(queueElement){
  this.next = queueElement;
  return this.next;
};

/**
 * Проверяет, последний ли элемент в очереди.
 * @return {Boolean}
 */
QueueElement.prototype.isLast = function(){
  return this.next === null;
};

/**
 * Возвращает новый инстанс `QueueElement`
 * @param {*} value
 * @return {QueueElement}
 */
QueueElement.getInstance = function(value){
  return new QueueElement(value);
};

module.exports = QueueElement;