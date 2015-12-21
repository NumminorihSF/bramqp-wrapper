bramqp-wrapper
===========================

Wrapper of bramqp lib to make easy access to amqp protocol.

Install with:

    npm install bramqp-wrapper

Dependencies:

    bramqp
 

# Usage

Simple example:

```js

    var a = new (require('bramqp-wrapper'))({
        host: '127.0.0.1',
        port: 5672,
        vhost: '/',
        user: 'guest',
        password: 'guest',
        protocolVersion: 'rabbitmq/full/amqp0-9-1.stripped.extended',
        channelPoolCapacity: 100,
        taskPoolCapacity: 100
      });
    
      a.connect(function (err) {
        console.log('connected', err);
    
        var body = (function(size){
          var res = '';
          var s = 'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890';
          while (res.length < size){
            res += s[Math.floor(Math.random()*s.length)];
          }
          return res;
        })(1024);
        var start = new Date();
        var endCount = 100000;
          for (let i = endCount-1; i > -1; i--) {
            (function (i) {
              a.getChannel(function (err, b, done) {
                  b.basic.publish('', 'queue', body, {}, {}, () => {
                    done();
                    if (i === 0) {
                      let time = new Date() - start;
                      console.log('End in', time, 'ms.');
                      console.log(endCount*1000/time, 'rps.');
                      setTimeout(a.disconnect.bind(a, function(){
                        console.log('disconnected');
                      }), 100);
                    }
                  });
              });
            })(i);
          }
      });
        
```

In this example you will try to add 100k messages and you will use only 100 channels wor it.

## Client
**Kind**: lib class  

* [Client](#Client)
    * [new Client(config)](#new_Client_new)
    * [.connect(callback)](#Client+connect)
    * [.disconnect(cb)](#Client+disconnect)
    * [.getChannel(callback)](#Client+getChannel) ⇒ <code>\*</code>

<a name="new_Client_new"></a>
### new Client(config)

| Param | Type | Default |
| --- | --- | --- |
| config | <code>Object</code> |  | 
| [config.host] | <code>String</code> | <code>&#x27;127.0.0.1&#x27;</code> | 
| [config.port] | <code>Number</code> | <code>5672</code> | 
| [config.user] | <code>String</code> | <code>&#x27;guest&#x27;</code> | 
| [config.password] | <code>String</code> | <code>&#x27;guest&#x27;</code> | 
| [config.protocolVersion] | <code>String</code> | <code>&#x27;rabbitmq/full/amqp0-9-1.stripped.extended&#x27;</code> | 
| [config.vhost] | <code>String</code> | <code>&#x27;/&#x27;</code> | 

<a name="Client+connect"></a>
### client.connect(callback)
Connect to amqp server.

**Kind**: instance method of <code>[Client](#Client)</code>  

| Param | Type |
| --- | --- |
| callback | <code>function</code> | 

<a name="Client+disconnect"></a>
### client.disconnect(cb)
Wait of end of all tasks. After - disconnect.

**Kind**: instance method of <code>[Client](#Client)</code>  

| Param | Type |
| --- | --- |
| cb | <code>function</code> | 

<a name="Client+getChannel"></a>
### client.getChannel(callback) ⇒ <code>\*</code>
Gets channel from pool. If no channels, will wait until some chan free.

**Kind**: instance method of <code>[Client](#Client)</code>  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | 1st arguments is error. 2nd argument is object like    `{basic:.., channel:.., confirm:.., exchange:.., queue:.., queue:.., tx:..}`    all methods provided an api of amqp protocol.    3rd argument is done callback to make channel free. |



## Classes

<dl>
<dt><a href="#Basic">Basic</a> ⇐ <code>EventEmitter</code></dt>
<dd><p>Basic</p>
</dd>
<dt><a href="#Channel">Channel</a> ⇐ <code>EventEmitter</code></dt>
<dd><p>Channel</p>
</dd>
<dt><a href="#Confirm">Confirm</a></dt>
<dd></dd>
<dt><a href="#Exchange">Exchange</a></dt>
<dd></dd>
<dt><a href="#Queue">Queue</a></dt>
<dd></dd>
<dt><a href="#RabbitClientError">RabbitClientError</a> ⇐ <code>EventEmitter</code></dt>
<dd></dd>
<dt><a href="#RabbitRouteError">RabbitRouteError</a> ⇐ <code>EventEmitter</code></dt>
<dd></dd>
<dt><a href="#TX">TX</a></dt>
<dd></dd>
</dl>

<a name="Basic"></a>
## Basic ⇐ <code>EventEmitter</code>
Basic

**Kind**: global class  
**Extends:** <code>EventEmitter</code>  

* [Basic](#Basic) ⇐ <code>EventEmitter</code>
    * [new Basic(client, channel, done)](#new_Basic_new)
    * [.qos([options], callback)](#Basic+qos)
    * [.consume(queueName, [options], subscriber, callback)](#Basic+consume)
    * [.cancel(consumerTag, [options], callback)](#Basic+cancel) ⇒ <code>\*</code>
    * [.publish(exchange, routingKey, body, [options], [headers], [callback])](#Basic+publish) ⇒ <code>\*</code>
    * [.return(replyCode, replyText, exchange, routingKey, callback)](#Basic+return)
    * [.get(queue, [options], callback)](#Basic+get)
    * [.ack(deliveryTag, [options], callback)](#Basic+ack)
    * [.reject(deliveryTag, [options], callback)](#Basic+reject)
    * [.recoverAsync([options], callback)](#Basic+recoverAsync)
    * [.recover([options], callback)](#Basic+recover)
    * [.nack(deliveryTag, [options], callback)](#Basic+nack)

<a name="new_Basic_new"></a>
### new Basic(client, channel, done)
Work with basic content.

The Basic class provides methods that support an industry-standard messaging model. Work with channels.


| Param | Type | Description |
| --- | --- | --- |
| client | <code>BRAMQPClient</code> | Client object that returns from bramqp#openAMQPCommunication() method. |
| channel | <code>[Channel](#Channel)</code> | Channel object (should be opened). |
| done | <code>function</code> |  |

<a name="Basic+qos"></a>
### basic.qos([options], callback)
Specify quality of service.

This method requests a specific quality of service.
The QoS can be specified for the current channel or for all channels on the connection. T
he particular properties and semantics of a qos method always depend on the content
class semantics. Though the qos method could in principle apply to both peers,
it is currently meaningful only for the server.

**Kind**: instance method of <code>[Basic](#Basic)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [options] | <code>Object</code> |  |  |
| [options.prefetchSize] | <code>Number</code> | <code>0</code> | The client can request that messages be sent    in advance so that when the client finishes processing a message,    the following message is already held locally,    rather than needing to be sent down the channel.    Prefetching gives a performance improvement.    This field specifies the prefetch window size in octets.    The server will send a message in advance if it is equal to or smaller in size    than the available prefetch size (and also falls into other prefetch limits).    May be set to zero, meaning "no specific limit",    although other prefetch limits may still apply.    The prefetch-size is ignored if the no-ack option is set. |
| [options.prefetchCount] | <code>Number</code> | <code>10</code> | Specifies a prefetch window in terms of whole messages.    This field may be used in combination with the prefetch-size field;    a message will only be sent in advance if both prefetch windows    (and those at the channel and connection level) allow it.    The prefetch-count is ignored if the no-ack option is set. |
| [options.global] | <code>Boolean</code> | <code>false</code> | RabbitMQ has reinterpreted this field.    The original specification said: "By default the QoS settings apply to the current    channel only. If this field is set, they are applied to the entire connection."    Instead, RabbitMQ takes global=false to mean that the QoS settings should apply    per-consumer (for new consumers on the channel; existing ones being unaffected)    and global=true to mean that the QoS settings should apply per-channel. |
| callback | <code>function</code> |  |  |

<a name="Basic+consume"></a>
### basic.consume(queueName, [options], subscriber, callback)
Start a queue consumer.

This method asks the server to start a "consumer", which is a transient request for
messages from a specific queue. Consumers last as long as the channel they were declared on,
or until the client cancels them.

**Kind**: instance method of <code>[Basic](#Basic)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| queueName | <code>String</code> |  | Specifies the name of the queue to consume from. |
| [options] | <code>Object</code> |  |  |
| [options.consumerTag] | <code>String</code> &#124; <code>null</code> | <code></code> | Specifies the identifier for the consumer.    The consumer tag is local to a channel, so two clients can use the same consumer tags.    If this field is empty the server will generate a unique tag.    The client MUST NOT specify a tag that refers to an existing consumer.    Error code: not-allowed    The consumer tag is valid only within the channel from which the consumer was created.    I.e. a client MUST NOT create a consumer in one channel and then use it in another.    Error code: not-allowed |
| [options.noLocal] | <code>Boolean</code> | <code>false</code> | If the no-local field is set the server will not    send messages to the connection that published them. |
| [options.noAck] | <code>Boolean</code> | <code>false</code> | If this field is set the server does not expect    acknowledgements for messages. That is, when a message is delivered to the client    the server assumes the delivery will succeed and immediately dequeues it.    This functionality may increase performance but at the cost of reliability.    Messages can get lost if a client dies before they are delivered to the application. |
| [options.exclusive] | <code>Boolean</code> | <code>false</code> | Request exclusive consumer access,    meaning only this consumer can access the queue.    * The client MAY NOT gain exclusive access to a queue that already has active consumers.    Error code: access-refused |
| [options.noWait] | <code>Boolean</code> | <code>false</code> | If set, the server will not respond to the method.    The client should not wait for a reply method.    If the server could not complete the method it will raise a channel or    connection exception. |
| [options.arguments] | <code>Object</code> | <code>{}</code> | A set of arguments for the consume.    The syntax and semantics of these arguments depends on the server implementation. |
| subscriber | <code>function</code> |  | All messages will put to this function. 1st argument is content of message.    2nd arg is headers of messages.    3rd arg is arguments of message.    4th arg is options of message. |
| callback | <code>function</code> |  | This function will be spawned after subscribe to queue. 1st arg is error if is.    2nd - consumerTag. |

<a name="Basic+cancel"></a>
### basic.cancel(consumerTag, [options], callback) ⇒ <code>\*</code>
End a queue consumer.

This method cancels a consumer. This does not affect already delivered messages,
but it does mean the server will not send any more messages for that consumer.
The client may receive an arbitrary number of messages in between sending the cancel
method and receiving the cancel-ok reply.
It may also be sent from the server to the client in the event of the consumer
being unexpectedly cancelled (i.e. cancelled for any reason other than the server
receiving the corresponding basic.cancel from the client).
This allows clients to be notified of the loss of consumers due to events such as
queue deletion. Note that as it is not a MUST for clients to accept this method from
the server, it is advisable for the broker to be able to identify those clients that
are capable of accepting the method, through some means of capability negotiation.

* If the queue does not exist the server MUST ignore the cancel method,
so long as the consumer tag is valid for that channel.

**Kind**: instance method of <code>[Basic](#Basic)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| consumerTag | <code>String</code> |  | Identifier for the consumer, valid within the current channel. |
| [options] | <code>Object</code> |  |  |
| [options.noWait] | <code>Boolean</code> | <code>false</code> | If set, the server will not respond to the method.    The client should not wait for a reply method.    If the server could not complete the method it will raise a channel or    connection exception. |
| callback | <code>function</code> |  |  |

<a name="Basic+publish"></a>
### basic.publish(exchange, routingKey, body, [options], [headers], [callback]) ⇒ <code>\*</code>
Publish a message.

This method publishes a message to a specific exchange.
The message will be routed to queues as defined by the exchange configuration and
distributed to any active consumers when the transaction, if any, is committed.

**Kind**: instance method of <code>[Basic](#Basic)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| exchange | <code>String</code> | <code>&#x27;&#x27;</code> | Specifies the name of the exchange to publish to.    The exchange name can be empty, meaning the default exchange.    If the exchange name is specified, and that exchange does not exist,    the server will raise a channel exception.    * The client MUST NOT attempt to publish a content to an exchange that does not exist.    Error code: not-found.    * The server MUST accept a blank exchange name to mean the default exchange.    * If the exchange was declared as an internal exchange, the server MUST raise a    channel exception with a reply code 403 (access refused).    * The exchange MAY refuse basic content in which case it MUST raise a    channel exception with reply code 540 (not implemented). |
| routingKey | <code>String</code> | <code>&#x27;&#x27;</code> | Specifies the routing key for the message.    The routing key is used for routing messages depending on the exchange configuration. |
| body | <code>String</code> |  |  |
| [options] | <code>Object</code> |  |  |
| [options.mandatory] | <code>Boolean</code> | <code>false</code> | This flag tells the server how to react if the    message cannot be routed to a queue.    If this flag is set, the server will return an unroutable message with a Return method.    If this flag is zero, the server silently drops the message. |
| [options.immediate] | <code>Boolean</code> | <code>false</code> | This flag tells the server how to react if    the message cannot be routed to a queue consumer immediately.    If this flag is set, the server will return an undeliverable message with a Return method.    If this flag is zero, the server will queue the message, but with no guarantee that it    will ever be consumed. |
| [options.callbackMechanism] | <code>String</code> | <code>&#x27;just_callback&#x27;</code> | Specify callback mechanism for publishing message. |
| [options.replyTo] | <code>String</code> |  | Address to reply to. |
| [options.appId] | <code>String</code> |  | Creating application id. |
| [options.userId] | <code>String</code> |  | Creating user id. |
| [options.timestamp] | <code>Date</code> |  | Message timestamp. |
| [options.expiration] | <code>String</code> |  | Message expiration specification. |
| [options.messageId] | <code>String</code> |  | Application message identifier.    By default sets to incremental counter with `_`prefix. |
| [options.correlationId] | <code>String</code> |  | Application correlation identifier. |
| [options.type] | <code>String</code> |  | Message type name. |
| [options.contentType] | <code>String</code> |  | MIME content type. |
| [options.contentEncoding] | <code>String</code> |  | MIME content encoding. |
| [headers] | <code>Object</code> |  | User headers to message. |
| [callback] | <code>function</code> |  |  |

<a name="Basic+return"></a>
### basic.return(replyCode, replyText, exchange, routingKey, callback)
Return a failed message.

This method returns an undeliverable message that was published with the "immediate"
flag set, or an unroutable message published with the "mandatory" flag set.
The reply code and text provide information about the reason that the message
was undeliverable.

**Kind**: instance method of <code>[Basic](#Basic)</code>  

| Param | Type | Description |
| --- | --- | --- |
| replyCode | <code>Number</code> | The reply code. The AMQ reply codes are defined as constants at http://www.rabbitmq.com/amqp-0-9-1-reference.html#constants. |
| replyText | <code>String</code> | The localised reply text. This text can be logged as an aid to resolving issues. |
| exchange | <code>String</code> | Specifies the name of the exchange that the message was originally published to.    May be empty, meaning the default exchange. |
| routingKey | <code>String</code> | Specifies the routing key name specified when the message was published. |
| callback | <code>function</code> |  |

<a name="Basic+get"></a>
### basic.get(queue, [options], callback)
Direct access to a queue.

This method provides a direct access to the messages in a queue using a synchronous
dialogue that is designed for specific types of application where synchronous
functionality is more important than performance.

**Kind**: instance method of <code>[Basic](#Basic)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| queue | <code>String</code> |  | Specifies the name of the queue to get a message from. |
| [options] | <code>Object</code> |  |  |
| [options.noAck] | <code>Boolean</code> | <code>false</code> | If this field is set the server does not expect    acknowledgements for messages. That is, when a message is delivered to the client    the server assumes the delivery will succeed and immediately dequeues it.    This functionality may increase performance but at the cost of reliability.    Messages can get lost if a client dies before they are delivered to the application. |
| callback | <code>function</code> |  | 1st parameter is error. 2ns - is body of message. Is null - queue is empty.    3rd arg is headers of messages.    4th arg is arguments of message.    5th arg is options of message. |

<a name="Basic+ack"></a>
### basic.ack(deliveryTag, [options], callback)
Acknowledge one or more messages.

When sent by the client, this method acknowledges one or more messages delivered
via the Deliver or Get-Ok methods.
When sent by server, this method acknowledges one or more messages published with the
Publish method on a channel in confirm mode.
The acknowledgement can be for a single message or a set of messages up to and
including a specific message.

**Kind**: instance method of <code>[Basic](#Basic)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| deliveryTag | <code>Number</code> |  | The server-assigned and channel-specific delivery tag.    * You can found it on properties of consumed message.    * The delivery tag is valid only within the channel from which the message was received.    I.e. a client MUST NOT receive a message on one channel and then acknowledge it on another.    * The server MUST NOT use a zero value for delivery tags.    Zero is reserved for client use, meaning "all messages so far received". |
| [options] | <code>Object</code> |  |  |
| [options.multiple] | <code>Boolean</code> | <code>false</code> | If set to 1, the delivery tag is treated as    "up to and including", so that multiple messages can be acknowledged with a single method.    If set to zero, the delivery tag refers to a single message.    If the multiple field is 1, and the delivery tag is zero,    this indicates acknowledgement of all outstanding messages.    * A message MUST not be acknowledged more than once.    The receiving peer MUST validate that a non-zero delivery-tag refers    to a delivered message, and raise a channel exception if this is not the case.    On a transacted channel, this check MUST be done immediately and not delayed until    a Tx.Commit. Error code: precondition-failed |
| callback | <code>function</code> |  |  |

<a name="Basic+reject"></a>
### basic.reject(deliveryTag, [options], callback)
Reject an incoming message.

This method allows a client to reject a message.
It can be used to interrupt and cancel large incoming messages,
or return untreatable messages to their original queue.
* The server SHOULD be capable of accepting and process the Reject method
while sending message content with a Deliver or Get-Ok method.
I.e. the server should read and process incoming methods while sending output frames.
To cancel a partially-send content, the server sends a content body frame of size 1
(i.e. with no data except the frame-end octet).
* The server SHOULD interpret this method as meaning that the client is unable
to process the message at this time.
* The client MUST NOT use this method as a means of selecting messages to process.

**Kind**: instance method of <code>[Basic](#Basic)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| deliveryTag | <code>Number</code> |  | The server-assigned and channel-specific delivery tag.    * You can found it on properties of consumed message.    * The delivery tag is valid only within the channel from which the message was received.    I.e. a client MUST NOT receive a message on one channel and then acknowledge it on another.    * The server MUST NOT use a zero value for delivery tags.    Zero is reserved for client use, meaning "all messages so far received". |
| [options] | <code>Object</code> |  |  |
| [options.requeue] | <code>Boolean</code> | <code>false</code> | If requeue is true, the server will attempt to requeue the message.    If requeue is false or the requeue attempt fails the messages are discarded or dead-lettered.    * The server MUST NOT deliver the message to the same client within the context of    the current channel. The recommended strategy is to attempt to deliver the message    to an alternative consumer, and if that is not possible,    to move the message to a dead-letter queue.    The server MAY use more sophisticated tracking to hold the message on    the queue and redeliver it to the same client at a later stage. |
| callback | <code>function</code> |  |  |

<a name="Basic+recoverAsync"></a>
### basic.recoverAsync([options], callback)
Redeliver unacknowledged messages.

This method asks the server to redeliver all unacknowledged messages on a specified channel.
Zero or more messages may be redelivered.
This method is deprecated in favour of the synchronous Recover/Recover-Ok.
* The server MUST set the redelivered flag on all messages that are resent.

**Kind**: instance method of <code>[Basic](#Basic)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [options] | <code>Object</code> |  |  |
| [options.requeue] | <code>Object</code> | <code>false</code> | If this field is zero,    the message will be redelivered to the original recipient.    If this bit is 1, the server will attempt to requeue the message,    potentially then delivering it to an alternative subscriber. |
| callback | <code>function</code> |  |  |

<a name="Basic+recover"></a>
### basic.recover([options], callback)
Redeliver unacknowledged messages.

This method asks the server to redeliver all unacknowledged messages on a specified channel.
Zero or more messages may be redelivered. This method replaces the asynchronous Recover.
* The server MUST set the redelivered flag on all messages that are resent.

**Kind**: instance method of <code>[Basic](#Basic)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [options] | <code>Object</code> |  |  |
| [options.requeue] | <code>Object</code> | <code>false</code> | If this field is zero,    the message will be redelivered to the original recipient.    If this bit is 1, the server will attempt to requeue the message,    potentially then delivering it to an alternative subscriber. |
| callback | <code>function</code> |  |  |

<a name="Basic+nack"></a>
### basic.nack(deliveryTag, [options], callback)
Reject one or more incoming messages.

This method allows a client to reject one or more incoming messages.
It can be used to interrupt and cancel large incoming messages,
or return untreatable messages to their original queue.
This method is also used by the server to inform publishers on channels in
confirm mode of unhandled messages. If a publisher receives this method,
it probably needs to republish the offending messages.
* The server SHOULD be capable of accepting and processing the Nack method while
sending message content with a Deliver or Get-Ok method.
I.e. the server should read and process incoming methods while sending output frames.
To cancel a partially-send content, the server sends a content body frame of size 1
(i.e. with no data except the frame-end octet).
* The server SHOULD interpret this method as meaning that the client is unable
to process the message at this time.
* The client MUST NOT use this method as a means of selecting messages to process.
* A client publishing messages to a channel in confirm mode SHOULD be capable of accepting
and somehow handling the Nack method.

**Kind**: instance method of <code>[Basic](#Basic)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| deliveryTag | <code>Number</code> |  | The server-assigned and channel-specific delivery tag.    * You can found it on properties of consumed message.    * The delivery tag is valid only within the channel from which the message was received.    I.e. a client MUST NOT receive a message on one channel and then acknowledge it on another.    * The server MUST NOT use a zero value for delivery tags.    Zero is reserved for client use, meaning "all messages so far received". |
| [options] | <code>Object</code> |  |  |
| [options.multiple] | <code>Boolean</code> | <code>false</code> | If set to 1, the delivery tag is treated as    "up to and including", so that multiple messages can be rejected with a single method.    If set to zero, the delivery tag refers to a single message.    If the multiple field is 1, and the delivery tag is zero, this indicates rejection    of all outstanding messages.    * A message MUST not be rejected more than once.    The receiving peer MUST validate that a non-zero delivery-tag refers to an unacknowledged,    delivered message, and raise a channel exception if this is not the case.    Error code: precondition-failed |
| [options.requeue] | <code>Boolean</code> | <code>false</code> | If requeue is true, the server will attempt to    requeue the message. If requeue is false or the requeue attempt fails the    messages are discarded or dead-lettered.    Clients receiving the Nack methods should ignore this flag.    * The server MUST NOT deliver the message to the same client within the context    of the current channel. The recommended strategy is to attempt to deliver    the message to an alternative consumer, and if that is not possible,    to move the message to a dead-letter queue.    The server MAY use more sophisticated tracking to hold the message on the    queue and redeliver it to the same client at a later stage. |
| callback | <code>function</code> |  |  |

<a name="Channel"></a>
## Channel ⇐ <code>EventEmitter</code>
Channel

**Kind**: global class  
**Extends:** <code>EventEmitter</code>  

* [Channel](#Channel) ⇐ <code>EventEmitter</code>
    * [new Channel(client, id)](#new_Channel_new)
    * [.open(callback)](#Channel+open)
    * [.close(callback)](#Channel+close)
    * [.flow(active, callback)](#Channel+flow)
    * [.$getId()](#Channel+$getId) ⇒ <code>Number</code>
    * [.$isClosed()](#Channel+$isClosed) ⇒ <code>boolean</code>
    * [.isOpened()](#Channel+isOpened) ⇒ <code>boolean</code>
    * [.$setConfirmMode(c)](#Channel+$setConfirmMode)
    * [.$isConfirmMode()](#Channel+$isConfirmMode) ⇒ <code>Boolean</code>

<a name="new_Channel_new"></a>
### new Channel(client, id)
Work with channels.

The channel class provides methods for a client to establish a channel to a server
and for both peers to operate the channel thereafter.


| Param | Type | Description |
| --- | --- | --- |
| client | <code>BRAMQPClient</code> | Client object that returns from bramqp#openAMQPCommunication() method. |
| id | <code>Number</code> | Channel id. |

<a name="Channel+open"></a>
### channel.open(callback)
Open a channel for use.

This method opens a channel to the server.
* The client MUST NOT use this method on an already-opened channel. Error code: channel-error

**Kind**: instance method of <code>[Channel](#Channel)</code>  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | on callback - 1st argument is error. |

<a name="Channel+close"></a>
### channel.close(callback)
Request a channel close.

This method indicates that the sender wants to close the channel.
This may be due to internal conditions (e.g. a forced shut-down) or due to an
error handling a specific method, i.e. an exception.
When a close is due to an exception, the sender provides the class and method
id of the method which caused the exception.

* After sending this method, any received methods except Close and Close-OK MUST
be discarded. The response to receiving a Close after sending Close must be to send Close-Ok.

**Kind**: instance method of <code>[Channel](#Channel)</code>  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | on callback - 1st argument is error. |

<a name="Channel+flow"></a>
### channel.flow(active, callback)
Enable/disable flow from peer.

This method asks the peer to pause or restart the flow of content data sent by a consumer.
This is a simple flow-control mechanism that a peer can use to avoid overflowing its
queues or otherwise finding itself receiving more messages than it can process.
Note that this method is not intended for window control.
It does not affect contents returned by Basic.Get-Ok methods.

* When a new channel is opened, it is active (flow is active).
Some applications assume that channels are inactive until started.
To emulate this behaviour a client MAY open the channel, then pause it.


* When sending content frames, a peer SHOULD monitor the channel for incoming methods a
nd respond to a Channel.Flow as rapidly as possible.

* A peer MAY use the Channel.Flow method to throttle incoming content data for
internal reasons, for example, when exchanging data over a slower connection.

* The peer that requests a Channel.Flow method MAY disconnect and/or ban a peer
that does not respect the request. This is to prevent badly-behaved clients from
overwhelming a server.

**Kind**: instance method of <code>[Channel](#Channel)</code>  

| Param | Type | Description |
| --- | --- | --- |
| active | <code>Boolean</code> | If `true`, the peer starts sending content frames. If `false`, the peer stops sending content frames. |
| callback | <code>function</code> | on callback - 1st argument is error. 2ns argument is: `true` means the peer will start sending or continue to send content frames; `false` means it will not. |

<a name="Channel+$getId"></a>
### channel.$getId() ⇒ <code>Number</code>
Return is of channel.

**Kind**: instance method of <code>[Channel](#Channel)</code>  
<a name="Channel+$isClosed"></a>
### channel.$isClosed() ⇒ <code>boolean</code>
Return `true` if channel is closed.

**Kind**: instance method of <code>[Channel](#Channel)</code>  
<a name="Channel+isOpened"></a>
### channel.isOpened() ⇒ <code>boolean</code>
Return `true` if channel is opened.

**Kind**: instance method of <code>[Channel](#Channel)</code>  
<a name="Channel+$setConfirmMode"></a>
### channel.$setConfirmMode(c)
Set confirm mode to arg.

**Kind**: instance method of <code>[Channel](#Channel)</code>  

| Param | Type | Description |
| --- | --- | --- |
| c | <code>Boolean</code> | `true` if now is im confirm mode. |

<a name="Channel+$isConfirmMode"></a>
### channel.$isConfirmMode() ⇒ <code>Boolean</code>
Check, if channel is in configm mode.

**Kind**: instance method of <code>[Channel](#Channel)</code>  
<a name="Confirm"></a>
## Confirm
**Kind**: global class  

* [Confirm](#Confirm)
    * [new Confirm(client, channel)](#new_Confirm_new)
    * [.select([options], callback)](#Confirm+select)

<a name="new_Confirm_new"></a>
### new Confirm(client, channel)
Work with confirms.

The Confirm class allows publishers to put the channel in confirm mode and susequently
be notified when messages have been handled by the broker.
The intention is that all messages published on a channel in confirm mode will be
acknowledged at some point. By acknowledging a message the broker assumes responsibility
for it and indicates that it has done something it deems reasonable with it.
Unroutable mandatory or immediate messages are acknowledged right after the
Basic.Return method. Messages are acknowledged when all queues to which the message has
been routed have either delivered the message and received an acknowledgement (if required),
or enqueued the message (and persisted it if required).
Published messages are assigned ascending sequence numbers,
starting at 1 with the first Confirm.Select method.
The server confirms messages by sending Basic.Ack methods referring to these sequence numbers.


| Param | Type | Description |
| --- | --- | --- |
| client | <code>BRAMQPClient</code> | Client object that returns from bramqp#openAMQPCommunication() method. |
| channel | <code>[Channel](#Channel)</code> | Channel object (should be opened). |

<a name="Confirm+select"></a>
### confirm.select([options], callback)
This method sets the channel to use publisher acknowledgements.
The client can only use this method on a non-transactional channel.

**Kind**: instance method of <code>[Confirm](#Confirm)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [options] | <code>Object</code> |  |  |
| [options.noWait] | <code>Boolean</code> | <code>false</code> | If set, the server will not respond to the method.    The client should not wait for a reply method.    If the server could not complete the method it will raise a channel or connection exception. |
| callback | <code>function</code> |  |  |

<a name="Exchange"></a>
## Exchange
**Kind**: global class  

* [Exchange](#Exchange)
    * [new Exchange(client, channel)](#new_Exchange_new)
    * [.declare(exchange, [type], [options], callback)](#Exchange+declare)
    * [.delete(exchange, [options], callback)](#Exchange+delete)
    * [.bind(destination, source, routingKey, [options], callback)](#Exchange+bind)
    * [.unbind(destination, source, routingKey, [options], callback)](#Exchange+unbind)

<a name="new_Exchange_new"></a>
### new Exchange(client, channel)
Work with exchanges.

Exchanges match and distribute messages across queues.
Exchanges can be configured in the server or declared at runtime.


| Param | Type | Description |
| --- | --- | --- |
| client | <code>BRAMQPClient</code> | Client object that returns from bramqp#openAMQPCommunication() method. |
| channel | <code>[Channel](#Channel)</code> | Channel object (should be opened). |

<a name="Exchange+declare"></a>
### exchange.declare(exchange, [type], [options], callback)
Verify exchange exists, create if needed.

This method creates an exchange if it does not already exist,
and if the exchange exists, verifies that it is of the correct and expected class.
* The server SHOULD support a minimum of 16 exchanges per virtual host and ideally,
impose no limit except as defined by available resources.

**Kind**: instance method of <code>[Exchange](#Exchange)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| exchange | <code>String</code> |  | The exchange name is a client-selected string that identifies the    exchange for publish methods.    * Exchange names starting with "amq." are reserved for pre-declared and standardised    exchanges. The client MAY declare an exchange starting with "amq." if the passive option    is set, or the exchange already exists. Error code: access-refused    * The exchange name consists of a non-empty sequence of these characters:    letters, digits, hyphen, underscore, period, or colon. Error code: precondition-failed |
| [type] | <code>String</code> | <code>&#x27;topic&#x27;</code> | Each exchange belongs to one of a set of exchange types    implemented by the server. The exchange types define the functionality of the    exchange - i.e. how messages are routed through it. It is not valid or meaningful    to attempt to change the type of an existing exchange.    * Exchanges cannot be redeclared with different types.    The client MUST not attempt to redeclare an existing exchange with a    different type than used in the original Exchange.Declare method.    Error code: not-allowed    * The client MUST NOT attempt to declare an exchange with a type that    the server does not support. Error code: command-invalid |
| [options] | <code>Object</code> |  |  |
| [options.passive] | <code>Boolean</code> | <code>false</code> | If set, the server will reply with Declare-Ok    if the exchange already exists with the same name, and raise an error if not.    The client can use this to check whether an exchange exists without modifying the    server state. When set, all other method fields except name and no-wait are ignored.    A declare with both passive and no-wait has no effect.    Arguments are compared for semantic equivalence.    * If set, and the exchange does not already exist, the server MUST raise a    channel exception with reply code 404 (not found).    * If not set and the exchange exists, the server MUST check that the existing    exchange has the same values for type, durable, and arguments fields.    The server MUST respond with Declare-Ok if the requested exchange matches these fields,    and MUST raise a channel exception if not. |
| [options.durable] | <code>Boolean</code> | <code>false</code> | If set when creating a new exchange,    the exchange will be marked as durable.    Durable exchanges remain active when a server restarts.    Non-durable exchanges (transient exchanges) are purged if/when a server restarts.    * The server MUST support both durable and transient exchanges. |
| [options.autoDelete] | <code>Boolean</code> | <code>false</code> | If set, the exchange is deleted when all queues    have finished using it.    * The server SHOULD allow for a reasonable delay between the point when    it determines that an exchange is not being used (or no longer used),    and the point when it deletes the exchange.    At the least it must allow a client to create an exchange and then bind a queue to it,    with a small but non-zero delay between these two actions.    * The server MUST ignore the auto-delete field if the exchange already exists. |
| [options.internal] | <code>Boolean</code> | <code>false</code> | If set, the exchange may not be used directly    by publishers, but only when bound to other exchanges.    Internal exchanges are used to construct wiring that is not visible to applications. |
| [options.noWait] | <code>Boolean</code> | <code>false</code> | If set, the server will not respond to the method.    The client should not wait for a reply method.    If the server could not complete the method it will raise a channel or connection exception. |
| [options.arguments] | <code>Object</code> | <code>{}</code> | A set of arguments for the declaration.    The syntax and semantics of these arguments depends on the server implementation. |
| callback | <code>function</code> |  |  |

<a name="Exchange+delete"></a>
### exchange.delete(exchange, [options], callback)
Delete an exchange.

This method deletes an exchange.
When an exchange is deleted all queue bindings on the exchange are cancelled.

**Kind**: instance method of <code>[Exchange](#Exchange)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| exchange | <code>String</code> |  | The exchange name is a client-selected string that    identifies the exchange for publish methods.    * The client MUST NOT attempt to delete an exchange that does not exist.    Error code: not-found |
| [options] | <code>Object</code> |  |  |
| [options.ifUnused] | <code>Boolean</code> | <code>false</code> | If set, the server will only delete the exchange if it    has no queue bindings. If the exchange has queue bindings the server does not    delete it but raises a channel exception instead.    * The server MUST NOT delete an exchange that has bindings on it,    if the if-unused field is true. Error code: precondition-failed |
| [options.noWait] | <code>Boolean</code> | <code>false</code> | If set, the server will not respond to the method.    The client should not wait for a reply method.    If the server could not complete the method it will raise a channel or connection exception. |
| callback | <code>function</code> |  |  |

<a name="Exchange+bind"></a>
### exchange.bind(destination, source, routingKey, [options], callback)
Bind exchange to an exchange.

This method binds an exchange to an exchange.
* A server MUST allow and ignore duplicate bindings - that is, two or more bind
methods for a specific exchanges, with identical arguments - without treating these
as an error.
* A server MUST allow cycles of exchange bindings to be created including allowing
an exchange to be bound to itself.
* A server MUST not deliver the same message more than once to a destination exchange,
even if the topology of exchanges and bindings results in multiple (even infinite)
routes to that exchange.

**Kind**: instance method of <code>[Exchange](#Exchange)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| destination | <code>String</code> |  | Specifies the name of the destination exchange to bind.    * A client MUST NOT be allowed to bind a non-existent destination exchange.    Error code: not-found    * The server MUST accept a blank exchange name to mean the default exchange. |
| source | <code>String</code> |  | Specifies the name of the source exchange to bind.    * A client MUST NOT be allowed to bind a non-existent source exchange.    Error code: not-found    * The server MUST accept a blank exchange name to mean the default exchange. |
| routingKey | <code>String</code> |  | Specifies the routing key for the binding.    The routing key is used for routing messages depending on the exchange configuration.    Not all exchanges use a routing key - refer to the specific exchange documentation. |
| [options] | <code>Object</code> |  |  |
| [options.noWait] | <code>Boolean</code> | <code>false</code> | If set, the server will not respond to the method.    The client should not wait for a reply method.    If the server could not complete the method it will raise a channel or connection exception. |
| [options.arguments] | <code>Object</code> | <code>{}</code> | A set of arguments for the declaration.    The syntax and semantics of these arguments depends on the server implementation. |
| callback | <code>function</code> |  |  |

<a name="Exchange+unbind"></a>
### exchange.unbind(destination, source, routingKey, [options], callback)
Unbind an exchange from an exchange.

This method unbinds an exchange from an exchange.
If a unbind fails, the server MUST raise a connection exception.

**Kind**: instance method of <code>[Exchange](#Exchange)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| destination | <code>String</code> |  | Specifies the name of the destination exchange to unbind.    * The client MUST NOT attempt to unbind an exchange that does not exist from an exchange.    Error code: not-found    * The server MUST accept a blank exchange name to mean the default exchange. |
| source | <code>String</code> |  | Specifies the name of the source exchange to unbind.    * The client MUST NOT attempt to unbind an exchange from an exchange that does not exist.    Error code: not-found    * The server MUST accept a blank exchange name to mean the default exchange. |
| routingKey | <code>String</code> |  | Specifies the routing key of the binding to unbind. |
| [options] | <code>Object</code> |  |  |
| [options.noWait] | <code>Boolean</code> | <code>false</code> | If set, the server will not respond to the method.    The client should not wait for a reply method.    If the server could not complete the method it will raise a channel or connection exception. |
| [options.arguments] | <code>Object</code> | <code>{}</code> | A set of arguments for the declaration.    The syntax and semantics of these arguments depends on the server implementation. |
| callback | <code>function</code> |  |  |

<a name="Queue"></a>
## Queue
**Kind**: global class  

* [Queue](#Queue)
    * [new Queue(client, channel)](#new_Queue_new)
    * [.declare(queue, [options], callback)](#Queue+declare)
    * [.bind(queue, exchange, routingKey, [options], callback)](#Queue+bind)
    * [.unbind(queue, exchange, routingKey, [options], callback)](#Queue+unbind)
    * [.purge(queue, [options], callback)](#Queue+purge)
    * [.delete(queue, [options], callback)](#Queue+delete)

<a name="new_Queue_new"></a>
### new Queue(client, channel)
Work with queues.

Queues store and forward messages.
Queues can be configured in the server or created at runtime.
Queues must be attached to at least one exchange in order to receive messages from publishers.


| Param | Type | Description |
| --- | --- | --- |
| client | <code>BRAMQPClient</code> | Client object that returns from bramqp#openAMQPCommunication() method. |
| channel | <code>[Channel](#Channel)</code> | Channel object (should be opened). |

<a name="Queue+declare"></a>
### queue.declare(queue, [options], callback)
Declare queue, create if needed.

This method creates or checks a queue.
When creating a new queue the client can specify various properties that control the
durability of the queue and its contents, and the level of sharing for the queue.
* The server MUST create a default binding for a newly-declared queue to the default exchange,
which is an exchange of type 'direct' and use the queue name as the routing key.
* The server SHOULD support a minimum of 256 queues per virtual host and ideally,
impose no limit except as defined by available resources.

**Kind**: instance method of <code>[Queue](#Queue)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| queue | <code>String</code> |  | The queue name MAY be empty, in which case the server MUST create    a new queue with a unique generated name and return this to the client in the    Declare-Ok method.    * Queue names starting with "amq." are reserved for pre-declared and standardised queues.    The client MAY declare a queue starting with "amq." if the passive option is set,    or the queue already exists. Error code: access-refused    * The queue name can be empty, or a sequence of these characters: letters, digits,    hyphen, underscore, period, or colon. Error code: precondition-failed |
| [options] | <code>Object</code> |  |  |
| [options.passive] | <code>Boolean</code> | <code>false</code> | If set, the server will reply with Declare-Ok    if the queue already exists with the same name, and raise an error if not.    The client can use this to check whether a queue exists without modifying the server state.    When set, all other method fields except name and no-wait are ignored.    A declare with both passive and no-wait has no effect.    Arguments are compared for semantic equivalence.    * The client MAY ask the server to assert that a queue exists without creating    the queue if not. If the queue does not exist, the server treats this as a failure.    Error code: not-found    * If not set and the queue exists, the server MUST check that the existing queue    has the same values for durable, exclusive, auto-delete, and arguments fields.    The server MUST respond with Declare-Ok if the requested queue matches these fields,    and MUST raise a channel exception if not. |
| [options.durable] | <code>Boolean</code> | <code>false</code> | If set when creating a new queue,    the queue will be marked as durable.    Durable queues remain active when a server restarts.    Non-durable queues (transient queues) are purged if/when a server restarts.    Note that durable queues do not necessarily hold persistent messages, although    it does not make sense to send persistent messages to a transient queue.    * The server MUST recreate the durable queue after a restart.    * The server MUST support both durable and transient queues. |
| [options.exclusive] | <code>Boolean</code> | <code>false</code> | Exclusive queues may only be accessed by the    current connection, and are deleted when that connection closes.    Passive declaration of an exclusive queue by other connections are not allowed.    * The server MUST support both exclusive (private) and non-exclusive (shared) queues.    * The client MAY NOT attempt to use a queue that was declared as exclusive by    another still-open connection. Error code: resource-locked |
| [options.autoDelete] | <code>Boolean</code> | <code>false</code> | If set, the queue is deleted when all consumers    have finished using it. The last consumer can be cancelled either explicitly or    because its channel is closed. If there was no consumer ever on the queue,    it won't be deleted. Applications can explicitly delete auto-delete queues using    the Delete method as normal.    * The server MUST ignore the auto-delete field if the queue already exists. |
| [options.noWait] | <code>Boolean</code> | <code>false</code> | If set, the server will not respond to the method.    The client should not wait for a reply method.    If the server could not complete the method it will raise a channel or connection exception. |
| [options.arguments] | <code>Object</code> | <code>{}</code> | A set of arguments for the declaration.    The syntax and semantics of these arguments depends on the server implementation. |
| callback | <code>function</code> |  |  |

<a name="Queue+bind"></a>
### queue.bind(queue, exchange, routingKey, [options], callback)
Bind queue to an exchange.

This method binds a queue to an exchange.
Until a queue is bound it will not receive any messages.
In a classic messaging model, store-and-forward queues are bound to a direct exchange
and subscription queues are bound to a topic exchange.
* A server MUST allow ignore duplicate bindings - that is, two or more bind methods for
a specific queue, with identical arguments - without treating these as an error.
* A server MUST not deliver the same message more than once to a queue, even
if the queue has multiple bindings that match the message.
* The server MUST allow a durable queue to bind to a transient exchange.
* Bindings of durable queues to durable exchanges are automatically durable and the
server MUST restore such bindings after a server restart.
* The server SHOULD support at least 4 bindings per queue, and ideally,
impose no limit except as defined by available resources.

**Kind**: instance method of <code>[Queue](#Queue)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| queue | <code>String</code> |  | Specifies the name of the queue to bind.    * The client MUST either specify a queue name or have previously declared a queue    on the same channel Error code: not-found    * The client MUST NOT attempt to bind a queue that does not exist. Error code: not-found |
| exchange | <code>String</code> |  | Name of the exchange to bind to.    * A client MUST NOT be allowed to bind a queue to a non-existent exchange.    Error code: not-found    * The server MUST accept a blank exchange name to mean the default exchange. |
| routingKey | <code>String</code> |  | Specifies the routing key for the binding.    The routing key is used for routing messages depending on the exchange configuration.    Not all exchanges use a routing key - refer to the specific exchange documentation.    If the queue name is empty, the server uses the last queue declared on the channel.    If the routing key is also empty, the server uses this queue name for the routing key    as well. If the queue name is provided but the routing key is empty, the server does the    binding with that empty routing key. The meaning of empty routing keys depends on the    exchange implementation.    * If a message queue binds to a direct exchange using routing key K and a publisher s    ends the exchange a message with routing key R, then the message MUST be passed to    the message queue if K = R. |
| [options] | <code>Object</code> |  |  |
| [options.noWait] | <code>Boolean</code> | <code>false</code> | If set, the server will not respond to the method.    The client should not wait for a reply method.    If the server could not complete the method it will raise a channel or connection exception. |
| [options.arguments] | <code>Object</code> | <code>{}</code> | A set of arguments for the declaration.    The syntax and semantics of these arguments depends on the server implementation. |
| callback | <code>function</code> |  |  |

<a name="Queue+unbind"></a>
### queue.unbind(queue, exchange, routingKey, [options], callback)
Unbind a queue from an exchange.

This method unbinds a queue from an exchange.
If a unbind fails, the server MUST raise a connection exception.

**Kind**: instance method of <code>[Queue](#Queue)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| queue | <code>String</code> |  | Specifies the name of the queue to unbind.    * The client MUST either specify a queue name or have previously declared a    queue on the same channel Error code: not-found    * The client MUST NOT attempt to unbind a queue that does not exist. Error code: not-found |
| exchange | <code>String</code> |  | The name of the exchange to unbind from.    * The client MUST NOT attempt to unbind a queue from an exchange that does not exist.    Error code: not-found    * The server MUST accept a blank exchange name to mean the default exchange. |
| routingKey | <code>String</code> |  | Specifies the routing key of the binding to unbind. |
| [options] | <code>Object</code> |  |  |
| [options.arguments] | <code>Object</code> | <code>{}</code> | A set of arguments for the declaration.    The syntax and semantics of these arguments depends on the server implementation. |
| callback | <code>function</code> |  |  |

<a name="Queue+purge"></a>
### queue.purge(queue, [options], callback)
Purge a queue.
This method removes all messages from a queue which are not awaiting acknowledgment.
* The server MUST NOT purge messages that have already been sent to a client but
not yet acknowledged.
* The server MAY implement a purge queue or log that allows system administrators
to recover accidentally-purged messages.
The server SHOULD NOT keep purged messages in the same storage spaces as the
live messages since the volumes of purged messages may get very large.

**Kind**: instance method of <code>[Queue](#Queue)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| queue | <code>String</code> |  | Specifies the name of the queue to purge.    * The client MUST either specify a queue name or have previously declared a queue    on the same channel Error code: not-found    * The client MUST NOT attempt to purge a queue that does not exist. Error code: not-found |
| [options] | <code>Object</code> |  |  |
| [options.noWait] | <code>Boolean</code> | <code>false</code> | If set, the server will not respond to the method.    The client should not wait for a reply method. |
| callback | <code>function</code> |  |  |

<a name="Queue+delete"></a>
### queue.delete(queue, [options], callback)
Delete a queue.

This method deletes a queue.
When a queue is deleted any pending messages are sent to a dead-letter queue if this
is defined in the server configuration, and all consumers on the queue are cancelled.
* The server SHOULD use a dead-letter queue to hold messages that were pending on a
deleted queue, and MAY provide facilities for a system administrator to move these messages
back to an active queue.

**Kind**: instance method of <code>[Queue](#Queue)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| queue | <code>String</code> |  | Specifies the name of the queue to delete.    * The client MUST either specify a queue name or have previously declared a queue    on the same channel Error code: not-found    * The client MUST NOT attempt to delete a queue that does not exist.    Error code: not-found |
| [options] | <code>Object</code> |  |  |
| [options.ifUnused] | <code>Boolean</code> | <code>false</code> | If set, the server will only delete the queue if it has no consumers.    If the queue has consumers the server does does not delete it but raises a channel    exception instead.    * The server MUST NOT delete a queue that has consumers on it,    if the if-unused field is true. Error code: precondition-failed |
| [options.ifEmpty] | <code>Boolean</code> | <code>false</code> | If set, the server will only delete the queue if it has no messages.    * The server MUST NOT delete a queue that has messages on it,    if the if-empty field is true. Error code: precondition-failed |
| [options.noWait] | <code>Boolean</code> | <code>false</code> | If set, the server will not respond to the method.    The client should not wait for a reply method. |
| callback | <code>function</code> |  |  |

<a name="RabbitClientError"></a>
## RabbitClientError ⇐ <code>EventEmitter</code>
**Kind**: global class  
**Extends:** <code>EventEmitter</code>  
<a name="new_RabbitClientError_new"></a>
### new RabbitClientError(errorObject)

| Param | Type | Description |
| --- | --- | --- |
| errorObject | <code>Object</code> | Object, that RabbitMq returns. |

<a name="RabbitRouteError"></a>
## RabbitRouteError ⇐ <code>EventEmitter</code>
**Kind**: global class  
**Extends:** <code>EventEmitter</code>  
<a name="new_RabbitRouteError_new"></a>
### new RabbitRouteError(errorObject)

| Param | Type | Description |
| --- | --- | --- |
| errorObject | <code>Object</code> | Object, that RabbitMq returns. |

<a name="TX"></a>
## TX
**Kind**: global class  

* [TX](#TX)
    * [new TX(client, channel)](#new_TX_new)
    * [.select(callback)](#TX+select)
    * [.commit(callback)](#TX+commit)
    * [.rollback(callback)](#TX+rollback)

<a name="new_TX_new"></a>
### new TX(client, channel)
Work with transactions.

The Tx class allows publish and ack operations to be batched into atomic units of work.
The intention is that all publish and ack requests issued within a transaction will
complete successfully or none of them will.
Servers SHOULD implement atomic transactions at least where all publish or ack requests
affect a single queue. Transactions that cover multiple queues may be non-atomic,
given that queues can be created and destroyed asynchronously, and such events do not
form part of any transaction. Further, the behaviour of transactions with respect to the
immediate and mandatory flags on Basic.Publish methods is not defined.


| Param | Type | Description |
| --- | --- | --- |
| client | <code>BRAMQPClient</code> | Client object that returns from bramqp#openAMQPCommunication() method. |
| channel | <code>[Channel](#Channel)</code> | Channel object (should be opened). |

<a name="TX+select"></a>
### tX.select(callback)
Select standard transaction mode.
This method sets the channel to use standard transactions.
The client must use this method at least once on a channel before using the Commit or
Rollback methods.

**Kind**: instance method of <code>[TX](#TX)</code>  

| Param | Type |
| --- | --- |
| callback | <code>function</code> | 

<a name="TX+commit"></a>
### tX.commit(callback)
Commit the current transaction.

This method commits all message publications and acknowledgments performed in the current
transaction. A new transaction starts immediately after a commit.
* The client MUST NOT use the Commit method on non-transacted channels.
Error code: precondition-failed

**Kind**: instance method of <code>[TX](#TX)</code>  

| Param | Type |
| --- | --- |
| callback | <code>function</code> | 

<a name="TX+rollback"></a>
### tX.rollback(callback)
Abandon the current transaction.

This method abandons all message publications and acknowledgments performed
in the current transaction. A new transaction starts immediately after a rollback.
Note that unacked messages will not be automatically redelivered by rollback;
if that is required an explicit recover call should be issued.
* The client MUST NOT use the Rollback method on non-transacted channels.
Error code: precondition-failed

**Kind**: instance method of <code>[TX](#TX)</code>  

| Param |
| --- |
| callback | 









# LICENSE - "MIT License"

Copyright (c) 2015 Konstantine Petryaev

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
