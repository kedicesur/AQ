# AQ

**An Asynchronous Queue implementation for JS/TS (Deno)**

AQ is a lightweight asynchronous queue implementation with no dependencies. As of it's current state (v0.2) it may not be safe to use in production code. At this phase of development it's not guaranteed that a new version would be backward compatible. Also since the code uses modern ES2019 (ES10) features like [Private Class Fields](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_class_fields) and Async Iterators, make sure that you have the right environment. AQ is tested with Deno 1.92 and should also be OK with Node v12+, Chrome 74+, Edge 79+.

**Functionality**

- AQ is a FIFO queue structure which can take both asynchronous and synchronous items at the same time. The `enqueue`d items, regardless being sync or async are wrapped by a promise (outer promise). A resolution of the inner promise (`enqueue`d item) triggers the *previous* outer promise in the queue to be resolved. Since the previous inner promise is doing the same thing, this interlaced chaining mechanism forms the basis of an uninterrupted continuum. Such as when the queue becomes empty (when all inner promises are depleted) there is still one outer promise yielded at the tip of the queue, awaiting for a resolution or rejection. It will remain there, keeping the queue alive, up until something new gets `enqueue`d and eventually fulfills or the queue gets `.kill()`ed abrubtly.
- The item at the head of the queue gets automatically dequeued once it resolves or instantly if it's already in the resolved state. All other items in the queue must wait until they become the head regardless of their state (pending or resolved). So there is no  `dequeue` method in AQ at all.
- In basic operation the rejections are handled inside the queue silently. This also means while consuming from AQ instances you don't need to deploy a `try` & `catch` functionality. However in order to capture the rejections you can watch them by registering an error listener to the `"error"` event and see why and which promise was rejected.
- There are three events those can be listened by eventlistener functions such as "next", "error" and "empty". The eventlistener functions can be added / removed freely at any time. Every event can hold multiple eventlistener functions. The eventlistener functions can also be anonymous and they can still be removed because all eventlistener functions are assigned with a unique id.
- Once an AQ instance is initiated it will remain being available for `enqueue`ing even if in time it becomes empty. So you may keep it alive indefinitelly or just `.kill()` it if no longer needed.
- Being an async iterator, AQ instances are ideally consumed by a `for await of` loop.

**Instances**

The AQ constructor takes an options argument and simply called as,

    var aq = new AQ(opts);

and consumed like

	async function getAsyncValues(aq){
	  for await (let item of aq){
	    console.log(`The Promise at endpoint resolved with a value of "${item}"`);
	  };
	};

The **options** object argument (`opts` above) could take the following shape

    var opts = { timeout  : 200
               , clearMode: "soft"
               };

- **`timeout`:** Since AQ instances get `dequeue`d automatically one thing that we shall avoid is to have an indefinitelly pending promise in the queue. The `timeout` property is of `Number` type and defines a duration in ms. `timeout` should always be provided unless you are sure that all `enqueue`d items are either synchronous or promises those will certainly resolve or reject within a reasonable time.
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
- **`.on("event")`:** Adds or removes eventlisteners. You can add multiple eventlisteners per event. AQ instances can take three event types
    - `"next"` event is fired per successfull yielding of a pending or an already resolved item at the head of the queue. Some pending items at the head might of course get rejected and the `"next"` event won't fire for rejections.
    - `"error"` event is fired once an item in the queue gets rejected. An error object is passed to the event handler. The `error` object can take the shape as follows;

            { name   : "Timeout"                                // name of the error
            , message: "Promise timed out before fullfillment"  // descrtiption
            , pid    : "D8VJQ7ZMIDA"                            // the ID of the rejected or aborted promise
            }

    - `"empty"` event is fired whenever the queue becomes empty.

    When invoked, the `.on("event")` returns an object with two methods. **`.use(f)`** and **`.forget(id)`** whereas `f` is a function and `id` is a unique id string.

    - **`.on("event").use(f)`:** Such as `var id = aq.on("error").use(e => doSomethingWith(e));`. The return value will be a Unique Id String like **`"4E34SIO5X56"`** even if your have provided an anonymous function. This Unique Id String can be saved to remove a particular eventlistener at a later time.
    - **`.on("event").forget(id)`:** Such as `aq.on("error").forget("4E34SIO5X56");` which will remove the eventlistener function with the correspoing ID string from the eventlisteners list for that particular event. The return value is either `true` or `false` depending on the outcome.


**Properties**

As of v0.2, AQ instances have only one read only property which is `.size` that gives you the number of items in the queue.

**License**

Copyright<sup>©</sup> 2021, Redu. Relesed under [GNU General Public License v3.0](https://choosealicense.com/licenses/gpl-3.0/)