export default class {
  #Link;
  #head;
  #last;
  #stage;
  #size;
  #live;
  #events;
  #idGen = _ => (Date.now()*Math.random()).toString(36).replace(".","").toUpperCase();

  constructor(options = {}){
    const AQ = this;
    this.timeout   = !isNaN(options.timeout)                     && options.timeout;
    this.clearMode = ["soft","hard"].includes(options.clearMode) && options.clearMode;
    this.raceMode  = options.raceMode === !!options.raceMode && options.raceMode;

    // Use Promise.withResolvers()
    const { promise, resolve, reject } = Promise.withResolvers();
    this.#last     = { promise, resolve, reject, state: "pending", staged: true };
    this.#last.promise.catch(() => {});

    this.#size     = 0;
    this.#live     = true;
    this.#events   = { "next" : []
                     , "error": []
                     , "empty": []
                     , "reply": []
                     };
    this.#Link = class {
      constructor(item){
        this.previous = AQ.#last;
        this.next     = void 0;
        this.id       = AQ.#idGen();
        this.state    = "pending";
        this.wasStaged= false;
        this.proxy    = Object.defineProperties( Object.create(null)
                                               , { "item" : { get: _ => item}
                                                 , "id"   : { get: _ => this.id}
                                                 , "state": { get: _ => this.previous ? this.previous.state : this.state}
                                                 , "abort": { value: _ => this.abort( "aborted")}
                                                 }
                                               );
        const { promise, resolve, reject } = Promise.withResolvers();
        this.promise = promise;
        this.resolveLink = resolve;
        this.rejectLink  = reject;

        const timeoutId = AQ.timeout && setTimeout( e => this.previous && this.previous.state === "pending" && ( this.previous.state = this.state = "aborted"
                                                                                                               , !this.previous.staged && ( AQ.#runEvent("error", e)
                                                                                                                                          , this.previous.promise.catch(err => console.log(`%c${err.name || err} exception: %c${err.message || "-"}`, `color: yellow`, `color: #aaa`))
                                                                                                                                          )
                                                                                                               , this.previous.reject(e)
                                                                                                               )
                                                  , AQ.timeout
                                                  , { name: "Timeout", message: "Promise timed out before fulfillment", pid: this.id }
                                                  );

        this.resolve = v => (timeoutId && clearTimeout(timeoutId), this.resolveLink(v));
        this.reject  = e => (timeoutId && clearTimeout(timeoutId), this.rejectLink(e));

        (item && typeof item.then === 'function') ? item.then(v => this.previous                     &&
                                                                   this.previous.state !== "aborted" && ( this.previous.state = this.state = "resolved"
                                                                                                        , this.previous.resolve(v)
                                                                                                        , AQ.#runEvent("reply", { value: v, pid: this.id })
                                                                                                        , AQ.raceMode && queueMicrotask(() => AQ.clear("upto", this.id))
                                                                                                        ))
                                                        .catch(e => ( e = (typeof e !== "object" || e === null) ? { name: "Anonymous"
                                                                                                                  , message: e
                                                                                                                  }
                                                                                                                : e
                                                                    , e.pid = this.id
                                                                    , this.previous                     &&
                                                                      !this.previous.staged             &&
                                                                      this.previous.state === "pending" && ( this.previous.state = this.state = "rejected"
                                                                                                           , AQ.#runEvent("error", e)
                                                                                                           , this.previous.promise.catch(err => console.log(`%c${err.name} exception: %c${err.message}`, `color:orangered`, `color:white`))
                                                                                                           , this.previous.reject(e)
                                                                                                           )
                                                                    ))
                                                  : this.previous                     &&
                                                    this.previous.state !== "aborted" && ( this.previous.state = this.state = "resolved"
                                                                                         , this.previous.resolve(item)
                                                                                         , AQ.#runEvent("reply", { value: item, pid: this.id })
                                                                                         , AQ.raceMode && queueMicrotask(() => AQ.clear("upto", this.id))
                                                                                         );
      }

      get panel(){ return this.proxy; }
      get staged(){ return this.wasStaged; }

      abort(e){
        return ( e = { name: "Aborted", message: `Pending promise ${e} before fulfillment`, pid: this.id }
               , this.previous                     &&
                 this.previous.state === "pending" ? ( this.previous.state = this.state = "aborted"
                                                     , !this.previous.staged && ( AQ.#runEvent("error", e)
                                                                                , this.previous.promise.catch(err => console.log(`%c${err.name || err} exception: %c${err.message || "-"}`, `color: darksalmon`, `color: #aaa`))
                                                                                )
                                                     , this.previous.reject(e)
                                                     , true
                                                     )
                                                   : false
               );
      }
    };
  }

  get size(){
    return this.#size;
  }

  // Modern ES2024: Explicit Resource Management
  [Symbol.asyncDispose]() {
    this.kill();
  }

  #runEvent(event, ...args) {
    this.#events[event]?.length && this.#events[event].forEach(e => {
                                                                 try { e.f(...args); }
                                                                 catch(err) { console.log(`Event handler error:`, err); }
                                                               });
  }

  // Fix #12: Add method to clear all event listeners
  clearEvents(){
    this.#events = { "next": []
                   , "error": []
                   , "empty": []
                   , "reply": []
                   };
    return this;
  }

  on(event){
    // Fix #18: Return consistent values - always return handler object
    return !["next","error","empty"].includes(event) ? ( console.log(`No ${event} event is added. Events can either be "next", "error" or "empty"`)
                                                       , { do: () => {}, forget: () => false }
                                                       )
                                                     : { do: f => {
                                                               const id = this.#idGen(); 
                                                               if (typeof f !== "function") {
                                                                   throw new TypeError("Provided callback is not a function");
                                                               }
                                                               this.#events[event].push({id,f});
                                                               return id;
                                                             }

                                                        , forget: id => {
                                                                     const ix = this.#events[event].findIndex(e => e.id === id);
                                                                     return ix === -1 ? false : !!this.#events[event].splice(ix,1).length;
                                                                  }
                                                       };
  }

  enqueue(item){
    this.#size++;
    // Pass 'this' (the AQ instance) to the Link constructor
    this.#last = this.#head ? this.#last.next = new this.#Link(item)
                            : this.#head      = new this.#Link(item);
    return this.#last.panel;
  }

  clear(clearMode = this.clearMode, targetId) {
    let cursor, e;
    // Fix #18: Return consistent values
    try {
      switch (clearMode) {
        case "soft": cursor = this.#head;
                     while (cursor) {
                       cursor.abort("cleared");
                       cursor = cursor.next;
                     }
                     return this;
        case "hard": while (this.#head) {
                       this.#size--;
                       this.#head.abort("cleared");
                       this.#head = this.#head.next;
                     }
                     return this;
        case "upto": cursor = this.#head;
                     while (cursor && (cursor.id !== targetId)) {
                       cursor.abort("cleared");
                       cursor = cursor.next;
                     }
                     cursor && cursor.id === targetId && cursor.abort("cleared");
                     return this;
        default: e = new Error(`.clear() failed. "${clearMode}" is an invalid clearMode value.`);
                 e.name = "MisfitOptionError";
                 throw e;
      }
    } catch (e) {
      console.log(`%c${e.name || e} exception: %c${e.message || "-"}`
                 , `color: fuchsia`
                 , `color: #aaa`
                 );
      return this;
    }
  }

  // Fix #10: Return structured result with resolved/rejected/aborted info
  flush(){
    const result = { resolved: []
                   , rejected: []
                   , aborted: []
                   , pending: []
                   };
    
    while (this.#head) ( this.#head.abort("flushed") ? result.pending.push(this.#head.proxy.item)
                                                     : this.#head.previous?.state && result[this.#head.previous.state]?.push(this.#head.proxy.item)
                       , this.#head = this.#head.next
                       , this.#size--
                       );
    return result;
  }

  kill(){
    !this.#head && this.#last && this.#last.state === "pending" && ( this.#last.state = "killed"
                                                                   , this.#last.resolve(void 0)
                                                                   );
    while (this.#head) ( this.#head.abort("killed")
                       , this.#head = this.#head.next
                       , this.#size--
                       );
    const { promise, resolve, reject } = Promise.withResolvers();
    this.#last = { promise, resolve, reject, state: "pending", staged: true };
    this.#last.promise.catch(() => {});
    this.#live = false;
    console.log("Queue is being terminated..!");
  }

  async *[Symbol.asyncIterator](){
    let handled = false;
    let wasEmpty = true;
    while (true){
      this.#head ? ( this.#size--
                   , this.#stage = this.#head
                   , this.#head.wasStaged = true
                   , this.#head  = this.#head.next
                   , ["aborted","rejected"].includes(this.#stage.state) && (handled = true)
                   )
                 : this.#stage = this.#last;
      
      !this.#head && !wasEmpty && this.#runEvent("empty");
      wasEmpty = !this.#head;
      
      const nextHeadId = this.#head?.id;
      try {
        if (this.#live) {
          !handled && ( yield this.#stage.promise
                      , nextHeadId && this.#runEvent("next", nextHeadId)
                      )
        }
        else return void 0;
      }
      catch(e){
        this.#stage.state = e.name === "Aborted" ? "aborted"
                                                 : ( e.pid = nextHeadId
                                                   , "rejected"
                                                   )
        console.log( `%c${e.name || e} exception: %c${e.message || "-"}`
                   , `color: #de1e7e`
                   , `color: #aaa`
                   );
        this.#runEvent("error",e);
      }
      finally{
        this.#stage && ( this.#stage.previous && (this.#stage.previous = null)
                       , this.#stage.proxy = null
                       , this.#stage       = null
                       );
        handled           = false;
      }
    }
  }
}
