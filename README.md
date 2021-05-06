# AQ

**An Asynchronous Queue implementation for JS/TS (Deno)**

AQ is a lightweight asynchronous queue implementation with no dependencies. As of it's current state (v0.2) it may not be safe to use in production code. Also since the code uses modern ES2019 (ES10) features like [Private Class Fields](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_class_fields) and Async Iterators, make sure that you have the right environment. AQ is tested with Deno 1.92 and should also be OK with Node v12+, Chrome 74+, Edge 79+.

**Functionality**

- AQ is a FIFO queue structure which can take both asynchronous and synchronous items at the same time. The `enqueue`d items, regardless being sync or async are wrapped by a promise (outer promise). A resolution of the inner promise (`enqueue`d item) triggers the *previous* outer promise in the queue to be resolved. Since the previous inner promise is doing the same thing, this chained resolution mechanism forms the basis of an uninterrupted continuum. Such as when the queue becomes empty (all inner promises are depleted) there is still one outer promise yielded at the tip of the queue, waiting for a resolution or rejection. It will remain there, keeping the queue alive, until something new gets `enqueue`d and eventually fulfills unless the queue gets `.kill()`ed at the meantime.
- The item at the head of the queue gets automatically dequeued once it resolves or instantly if it's already in the resolved state. All other items in the queue must wait until they become the head regardless of their state (pending or resolved). So there is no  `dequeue` method in AQ at all.
- In basic operation the rejections are handled inside the queue silently. This also means while consuming from AQ instances you don't need to deploy a `try` & `catch` functionality. However in order to capture the rejections you can either provide a general error handler function within the `options` object or register an error listener to the `"error"` event after the instantiation to check why and which promise was rejected.
- There are also three events such as "next", "error" and "empty", those can be listened by event listener functions. The event listener functions can be added / removed freely at any time. Every event can hold multiple event listener functions.
- Once an AQ instance is intiated it will be available for `enqueue`ing even if time to time it becomes empty. So you may keep it alive indefinitelly or just `.kill()` it if no longer needed.
- Being an async iterator, AQ instances are ideally consumed by a `for await of` loop.

**Instances**

The AQ constructor takes an options argument. Simply called as,

    var aq = new AQ(opts);

and consumed like

	async function getAsyncValues(aq){
	  for await (let item of aq){
	    console.log(`The Promise at endpoint resolved with a value of "${item}"`);
	  };
	};

The **options** object argument (`opts` above) could take the following shape

    var opts = { timeout  : 200
               , errHandle: false // errh
               , clearMode: "soft"
               };

- **`timeout`:** Since AQ instances get `dequeue`d automatically one thing that we shall avoid is to have an indefinitelly pending promise in the queue. The `timeout` property is of `Number` type and defines a duration in ms. `timeout` should always be provided unless you are sure that all `enqueue`d items are either synchronous or promises those will certainly resolve or reject within a reasonable time.
- **`errHandle`:** Since AQ instances are silent, the rejections within the queue are not emitted to the outside. Instead in case you need to react against the rejections you can define an error handler function and assign it to the `opts.errhHandle` property. As of v0.2 `errHandle` only handles the errors caught at the head. The promise rejections behind the head are **not** handled by `errHandle`. Instead use the `"error"` event if you want to handle the errors originated from elsewhere in the queue. *In near future this method of error handling will cease to exist in favor of the `"error"` event.*
- **`clearMode`:** AQ instances have a `.clear(clearMode)` method used to clear the queue at any time. `clearMode` can take only two values. `"hard"` or `"soft"`.
    - `"hard"` clears all the items in the queue regardless their state.
    - `"soft"` clears all the items in the queue except for the ones in resolved state.

**Methods**

As of v0.2 the following methods are available

- **`.enqueue(item)`:** Inserts an item to the end of the queue and increments the `size` of the queue. The return value is a `panel` object. The `panel` object has three properties and a method as follows
    - **`item`:** A reference to the enqueued item itself.
    - **`state`:** Shows the current state of the item in the queue such as "pending", "resolved", "rejected" or "aborted". 
    - **`pid`:**  An ID to the item which can be accesses through the `Error` object to retry that particular async call or whatnot.
    - **`.abort()`:** Method is used to manually abort the promise prematurely whenever needed. An aborted promise will not be dequeued.
- **`.clear("hard" | "soft")`:** Depending on the provided argument clears the queue either completely or by keeping the items in resolved state respectively. The return value is the current AQ instance.
- **`.flush()`:** Similar to `.clear("hard")` but the returns an array of items in resolved or pending states. This can be used to prematurely clear the queue and apply the remaining resolved or pending items to standard `Promise` methods like `.all()`, `.race()`or `.any()` etc.
- **`.on("event")`:** Adds or removes event listeners. You can add multiple event listeners per event. AQ instances can take three event types
    - `"next"` event is fired per successfull yielding of a pending or an already resolved item at the head of the queue. Some pending items at the head might of course get rejected and the `"next"` event won't fire for rejections.
    - `"error"` event is fired once an item in the queue gets rejected except for the rejections those can be caught by the error handler (rejections at head). An error object is passed to the event handler. The `error` object can take the shape as follows;

            { name   : "Timeout"                                // name of the error
            , message: "Promise timed out before fullfillment"  // descrtiption
            , pid    : "D8VJQ7ZMIDA"                            // the ID of the rejected or aborted promise
            }

    - `"empty"` event is fired whenever the queue becomes empty.

    When invoked, the `.on("event")` returns an object with two methods. **`.add(f)`** and **`.remove(id)`** whereas `f` is a function and `id` is a unique id string.

    - **`.on("event").add(f)`:** Such as `var id = aq.on("error").add(e => doSomethingWith(e));`. The return value will be a unique id string like **`"4E34SIO5X56"`** which can be used to remove a particular event listener at a later time.
    - **`.on("event").remove(id)`:** Such as `aq.on("empty").remove("4E34SIO5X56");` The return value is either `true` or `false` depending on the outcome.


**Properties**

As of v0.2, AQ instances have only one read only property which is `.size` that gives you the number of items in the queue.

**License**

Copyright<sup>©</sup> 2021, Redu. Relesed under [GNU General Public License v3.0](https://choosealicense.com/licenses/gpl-3.0/)