##0.10.9

Now use babel to backward capability with old node.js versions.

##0.10.8

API change:

* Client#Basic#publish() now work on 1 event loop. So you can use 1 channel in `for(){}` loop. 
But it is not really recommended.
* Add Client events: connect, disconnect, amqp-full.

Fix:

* Fix client close error.
 

##0.10.4

Fig bug with double `channel.once` usage.

##0.10.3

Fix bug with spawning callbacks, then already was callbacked. 


##0.10.1

API change:

* `basic#return()` now need body of message. Without body server will raise exception.

Fix:

* `basic#return()` now has correct usage.

* Fix `basic#nack()` usage. 



##0.10.0
API change:

* In `basic#consume()` and `basic#get()` methods, options and arguments on 
function that works with message are swapped.


Fix:

* Fix `basic#ack()`, `basic#nack()`, `basic#recover()`, `basic#recoverAsync()` 
and `basic#reject()` methods.
