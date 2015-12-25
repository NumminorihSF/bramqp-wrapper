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
