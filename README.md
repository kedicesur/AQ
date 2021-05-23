# AQ

**An Asynchronous Queue Implementation with Synchronous / Asynchronous Enqueueing of Synchronous / Asynchronous Jobs for JS / TS (Node / Deno)**

AQ is a lightweight asynchronous queue implementation with no dependencies. You may `enqueue` synchronous or asynchronous items either synchronously or asynchronously.

As of in it's current state (v0.3) AQ is still under development phase with tons of `console.log()`s littering and such. Besides, at this phase of development it's not guaranteed that a new version to be backward compatible. So it *may* not be safe to use AQ in production code unless you wish to delete all `console.log()` statements yourself and stick with a certain version. Also please keep in mind that AQ is based upon modern ES2019 (ES10) features like [Private Class Fields](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_class_fields) and Async Iterators, make sure that you have the right environment. AQ is tested with Deno 1.92+ and should also be fine with Node v12+, Chrome 74+, Edge 79+.

**Functionality**

- AQ is a *"kind of relaxed"* FIFO queue structure which can take both asynchronous and synchronous items at the same time. Sync or async, all `enqueue`d items are wrapped by a promise (outer promise). A resolution of the inner promise (`enqueue`d item) triggers the *previous* outer promise in the queue to be resolved. Since the previous inner promise is doing the same thing, this interlaced async chaining mechanism forms the basis of an uninterrupted continuum. Such as when the queue becomes empty (when all inner promises are depleted) there is still one outer promise yielded at the tip of the queue, awaiting for a resolution or rejection. AQ will remain there, keeping the queue alive up until you `.kill()` AQ abrubtly. At the meantime you may safely `enqueue` new items asynchronously regardless the queue had become empty or not.
- The item at the head of the queue gets automatically dequeued once it resolves or instantly if it's already in the resolved state. Under normal operation all other items in the queue must wait until they become the head of their state (pending or resolved). So there is no  `dequeue` method in AQ at all.
- AQ can also be used as a race machine. In `raceMode = true` case all pending items up to the the first resolving promise get wiped out to allow the winner item to dequeue. However unlike `Promise.race()` the items `enqueue`d after the winner will remain in the queue. This is particularly so since the ones coming after the winner might have been asynchronously enqueued at a later time. The late ones should be granted with their chances.
- In the basic operation rejections are handled inside the queue silently. This also means while consuming from AQ instances you don't need to deploy a `try` & `catch` functionality. However in order to capture the rejections you can watch them by registering an errorlistener function to the `"error"` event to see why and which promise was rejected.
- There are three events those can be listened by eventlistener functions such as `"next"`, `"error"` and `"empty"`. The eventlistener functions can be added / removed freely at any time. Every event can hold multiple eventlistener functions. The eventlistener functions can also be anonymous and they can still be removed because all eventlistener functions are assigned with a unique id.
- Once an AQ instance is initiated it will remain being available for asynchronous `enqueue`ing even if in time it becomes empty. So you may keep it alive indefinitelly or just `.kill()` if it's no longer needed.
- Being an async iterator, AQ instances are ideally consumed by a `for await of` loop.

**Instances**

The AQ constructor takes an options argument and simply called as,
```javascript
var aq = new AQ(opts);
```
and consumed like
```javascript
async function getAsyncValues(aq){
  for await (let item of aq){
    console.log(`The Promise at endpoint resolved with a value of "${item}"`);
  };
};
```
The **options** object argument (`opts` above) could take the following shape
```javascript
var opts = { timeout  : 200
           , clearMode: "soft"
           , raceMode : false
           };
```
- **`timeout`:** Since AQ instances get `dequeue`d automatically one thing that we shall avoid is to have an indefinitelly pending promise in the queue. The `timeout` property is of `Number` type and defines a duration in ms. `timeout` should always be provided unless you are sure that all `enqueue`d items are either synchronous or promises those will certainly resolve or reject within a reasonable time.
- **`clearMode`:** AQ instances have a `.clear(clearMode)` method used to clear the queue at any time. `clearMode` can take only two values. `<"hard"` | `"soft">`.
    - `"hard"` clears all the items in the queue regardless their state.
    - `"soft"` clears all the items in the queue except for the ones in resolved state.
- **`raceMode`:** Boolean `<true | false>` option is used to switch the queue into the race mode. In race mode the queue is cleared only upto the first resolving item in the queue. Once the first resolving item is dequeued the queue now contains only the recent items those `enqueue`d after the resolving item and remains available for further `enqueue`ing operations.

**Methods**

As of v0.3 the following methods are available

- **`.enqueue(item)`:** Inserts an item to the end of the queue and increments the `size` of the queue. The return value is a `panel` object. The `panel` object has three properties and a method as follows
    - **`item`:** A reference to the enqueued item itself.
    - **`state`:** Shows the current state of the item in the queue such as `"pending"`, `"resolved"`, `"rejected"` or `"aborted"`. 
    - **`pid`:**  An ID to the item which can be checked against the `pid` property of the `Error` object caught at the `"error"` eventlistener function. This can be useful to retry a particular async call or whatnot.
    - **`.abort()`:** Method is used to manually abort a pending item prematurely whenever needed. An aborted item will not be dequeued.
- **`.clear("hard" | "soft" | "upto", [targetId])`:** Depending on the provided argument clears the queue accordingly;
    - **`"hard"`**: Clears the queue completelly.
    - **`"soft"`**: Clears the queue but leaves the already resolved items
    - **`"upto"`**: Clears the queue up to the item with the `id` maching the provided optional `targetId` argument. The items coming after are kept.

    The return value is the current AQ instance.
- **`.flush()`:** Similar to `.clear("hard")` but returns an array of items those are in resolved or pending states. This can be used to prematurely clear the queue and apply the remaining resolved or pending items to standard `Promise` methods like `.all()`, `.race()`or `.any()` etc.
- **`.on("event")`:** Adds or removes eventlisteners. You can add multiple eventlisteners per event. AQ instances can take three event types
    - `"next"` event is fired per successfull yielding of a pending or an already resolved item at the head of the queue. Some pending items at the head might of course get rejected and the `"next"` event won't fire for rejections.
    - `"error"` event is fired once an item in the queue gets rejected. An error object is passed to the event handler. The `error` object can take the shape as follows;
    ```javascript
            { name   : "Timeout"                                // name of the error
            , message: "Promise timed out before fullfillment"  // descrtiption
            , pid    : "D8VJQ7ZMIDA"                            // the ID of the rejected or aborted promise
            }
    ```
    - `"empty"` event is fired whenever the queue becomes empty.

    When invoked, the `.on("event")` returns an object with two methods. `.do(f)` and `.forget(id)` whereas `f` is a function and `id` is a unique id string.

    - **`.on("event").do(f)`:** Such as `var id = aq.on("error").do(e => doSomethingWith(e));`. The return value will be a Unique Id String like `"4E34SIO5X56"` even if your have provided an anonymous function. This Unique Id String can be saved to remove a particular eventlistener at a later time.
    - **`.on("event").forget(id)`:** Such as `aq.on("error").forget("4E34SIO5X56");` which will, if exists, remove the eventlistener function with the correspoing ID string from the eventlisteners list of that particular event. The return value is either `true` or `false` depending on the outcome.

**Properties**

As of v0.3, AQ instances have only one read only property which is `.size` that gives you the number of items in the queue.

**Use Cases**

AQ is a very lightweight tool but at the same time like a Swiss Army Knife, it will allow you to perform many interesting tasks easily. It doesn't offer a big API just because I want to keep it as simple as possible while being functional. This means, you may easily extend AQ's functionalities by using it's availabe methods cleverly. Having said that, there already exists many built in asynchronous capabilities in JS/TS language so you should consider using them in the first place. However only when some exceptional cases arise where the naked Promises are not sufficient then you may consider using AQ. The point being, all Promise methods are supplied with asynchronous tasks synchronously, while AQ can always be `enqueued` with asynchronous tasks asynchronously whenever you have something to `enqueue`.

Let us start with the case where you provide your asynchronous tasks synchronously.

1. **Sync Input - Async Output  Task Queue**

    This is the basic operation where we `enqueue` the async tasks synchronously. In this case the main differences compared to Promise methods are;
    
    - The whole system won't collapse all at once when a Promise fails.
    - You have full control on aborting at a certain `timeout` value.
    - You have full control on taking an action such as retrying by using the `"error"` event.
    
    In other words you simply `enqueue` the Promises sequentially and then;
    
    - Some of them may timeout and you may not care.
    - You may register an `"error"` eventlistener to take the necessary action such as retrying in case a Promise in AQ fails.
    - You may register a `"next"` eventlistener to take necessary action once a specific Promise resolves. Perhaps you may like to do a `aq.clear("hard")` in the eventlisterner function and abort the remaining promises.
    
    Assuming that we already have an array of multiple `urls` to fetch from an API, a simple `retry` for 5 times errorhandler may look like;
    ```javascript
    var aq     = new AQ({timeout: 80}),
        tryCnt = 5,
        panels,
        retry  = e => {
                   const ix = panels.findIndex(p => p.id === e.pid),
                         tc = panels[ix].tryCnt;
                   ix >= 0 && tc && ( panels[ix] = aq.enqueue(fetch(urls[ix]))
                                    , panels[ix].tryCnt = tc - 1
                                    , console.log(`Retry #${(tryCnt-panels[ix].tryCnt).toString().padStart(2," ")} for "${url+(ix+1)}"`)
                                    );
                 };

    aq.on("error").do(retry); // Literature BITCH..!
    getAsyncValues(aq);
    panels = urls.map(url => {
                        const panel = aq.enqueue(fetch(url));
                        panel.tryCnt = tryCnt;
                        return panel;
                      });
    ```
    In the above `retry` attempt we are utilizing the AQ functionalities at hand such as the `"error"` eventlistener and the `panel` object however in future releases AQ may employ a built in retry functionality. This is also a good place to point out  some important `fetch()` API rejection cases. Keep in mind that the `fetch()` API rejections are only limited with network errors and all server side errors resolve within the response object. You should check the `ok` property of the received `response` object in the consuming `for await` loop, in a similar manner to the following;
    ```javascript
    async function getAsyncValues(aq){
      for await (const res of aq){
         res.ok ? res.json()
                     .then(json => doSomethingWith(json))
                : handleServerError(res);
      }
      console.log("The stream is finalized");
    }
    ```
    Also not all JS/TS asynchronous functionalities serve you with Promises. One example could be the **Workers API**. You may easily promisify your worker tasks like 
    ```javascript
    var wp = new Promise((v,x) => ( firstWorker.onmessage(v)
                                  , firstWorker.onmessageerror(x)
                                  ));
    ```
2. **Async Input - Async Output Task Queue**

   Say you want to make Short Polling requests to an API once in every 500ms and you would like to use the first resolving response. Think like, the request that you made @0ms happens to resolve @1000ms and for some reason the one that you make @500ms resolves @900ms. You are interested in the second one since it gives you the most fresh state from the API. At this point you no longer need the first request and it's best to get rid of it. Then just add to your `options` object `{raceMode: true}` and keep `enqueue`ing your requests (polling) indefinitely at every 500ms. You will get the most fresh resolutions continusously and the *previously `enqueue`d slower ones* will be wiped out. Awesome..!

**Contribution**

I hope to have PRs inline with the fancy wide indenting of this code or i will have to rephrase them and it will make me a dull boy. Also, if you may, please pay attention to the followings,

-  We are not using any `if` clauses unless it is essential like in the case of `throw`ing an error. Please use [ternary with proper indenting](https://stackoverflow.com/a/67536242/4543207) instead.
- For conditionals always use shortcircuits whenever it is possible.
- For the tasks following the conditionals, use the comma operator to group multiple instructions.
- Please don't use `const` needlessly whenever you need to declare a variable.
- Use arrow functions whenever possible.
- Any bleeding edge JS/TS functionalities may be added if need be. AQ is not thought to be backward compatible.

**License**

Copyright<sup>©</sup> 2021, Redu. Relesed under [GNU General Public License v3.0](https://choosealicense.com/licenses/gpl-3.0/)