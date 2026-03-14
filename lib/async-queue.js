export default class {
  #Link;
  #head;
  #last;
  #stage;
  #size;
  #live;
  #events;
  #idGen = _ => (Date.now()*Math.random()).toString(36).replace(".","").toUpperCase();
  #Link = class {
    constructor(aq, item){
      this.aq       = aq;
      this.previous = aq.#last; // Access private field of the AQ instance
      this.next     = void 0;
      this.id       = aq.#idGen();
      this.state    = "pending";
      this.wasStaged= false;
      this.proxy    = Object.defineProperties(Object.create(null),{ "item" : { get: () => item }
                                                                  , "id"   : { get: () => this.id }
                                                                  , "state": { get: () => this.previous ? this.previous.state : this.state }
                                                                  , "abort": { value: () => this.abort("aborted") }
                                                                  });
      const { promise, resolve, reject } = Promise.withResolvers();
      this.promise = promise;
      this.resolveLink = resolve;
      this.rejectLink  = reject;

      let timeoutId;
      if (aq.timeout) {
        timeoutId = setTimeout(e => {
          if (this.previous && this.previous.state === "pending") {
            this.previous.state = this.state = "aborted";
            if (!this.previous.staged) {
              aq.#runEvent("error", e);
              this.previous.promise.catch(err => console.log(`%c${err.name || err} exception: %c${err.message || "-"}`, `color: yellow`, `color: #aaa`));
            }
            this.previous.reject(e);
          }
        }, aq.timeout, { name: "Timeout", message: "Promise timed out before fulfillment", pid: this.id });
      }

      this.resolve = v => { if (timeoutId) clearTimeout(timeoutId); this.resolveLink(v); };
      this.reject  = e => { if (timeoutId) clearTimeout(timeoutId); this.rejectLink(e); };

      const isThenable = item && typeof item.then === 'function';
      if (isThenable) {
        item.then(v => {
          if (this.previous && this.previous.state !== "aborted") {
            this.previous.state = this.state = "resolved";
            this.previous.resolve(v);
            aq.#runEvent("reply", { value: v, pid: this.id });
            if (aq.raceMode) queueMicrotask(() => aq.clear("upto", this.id));
          }
        }).catch(e => {
          e = (typeof e !== "object" || e === null) ? { name: "Anonymous", message: e } : e;
          e.pid = this.id;
          if (this.previous && !this.previous.staged && this.previous.state === "pending") {
            this.previous.state = this.state = "rejected";
            aq.#runEvent("error", e);
            this.previous.promise.catch(err => console.log(`%c${err.name} exception: %c${err.message}`, `color:orangered`, `color:white`));
            this.previous.reject(e);
          }
        });
      } else {
        if (this.previous && this.previous.state !== "aborted") {
          this.previous.state = this.state = "resolved";
          this.previous.resolve(item);
          aq.#runEvent("reply", { value: item, pid: this.id });
          if (aq.raceMode) queueMicrotask(() => aq.clear("upto", this.id));
        }
      }
    }

    get panel(){ return this.proxy; }
    get staged(){ return this.wasStaged; }

    abort(e){
      e = { name: "Aborted", message: `Pending promise ${e} before fulfillment`, pid: this.id };
      if (this.previous && this.previous.state === "pending") {
        this.previous.state = this.state = "aborted";
        if (!this.previous.staged) {
          this.aq.#runEvent("error", e);
          this.previous.promise.catch(err => console.log(`%c${err.name || err} exception: %c${err.message || "-"}`, `color: darksalmon`, `color: #aaa`));
        }
        this.previous.reject(e);
        return true;
      }
      return false;
    }
  };

  constructor(options = {}){
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
    this.#events = { "next": [], "error": [], "empty": [], "reply": [] };
    return this;
  }

  on(event){
    // Fix #18: Return consistent values - always return handler object
    if (!["next","error","empty"].includes(event)) {
      console.log(`No ${event} event is added. Events can either be "next", "error" or "empty"`);
      return { do: () => {}, forget: () => false };
    }
    return { 
      do: f => {
        const id = this.#idGen();
        if (typeof f !== "function") throw new TypeError("Provided callback is not a function");
        this.#events[event].push({id,f});
        return id;
      },
      forget: id => {
        const ix = this.#events[event].findIndex(e => e.id === id);
        return ix === -1 ? false : !!this.#events[event].splice(ix,1).length;
      }
    };
  }

  enqueue(item){
    this.#size++;
    // Pass 'this' (the AQ instance) to the Link constructor
    this.#last = this.#head ? this.#last.next = new this.#Link(this, item)
                            : this.#head      = new this.#Link(this, item);
    return this.#last.panel;
  }

  clear(clearMode = this.clearMode, targetId) {
    let cursor, e;
    // Fix #18: Return consistent values
    try{
      switch (clearMode){
        case "soft": cursor = this.#head;
                     while (cursor){
                       cursor.abort("cleared");
                       cursor = cursor.next;
                     }
                     return this;
        case "hard": while (this.#head){
                       this.#size--;
                       this.#head.abort("cleared")
                       this.#head = this.#head.next;
                     }
                     return this;
        case "upto": cursor = this.#head;
                     while (cursor && (cursor.id !== targetId)){
                      cursor.abort("cleared");
                      cursor = cursor.next;
                     }
                     // Fix #11: Clear the target item as well
                     if (cursor && cursor.id === targetId) {
                       cursor.abort("cleared");
                     }
                     return this;
        default    : e = new Error(`.clear() failed. "${clearMode}" is an invalid clearMode value.`);
                     e.name = "MisfitOptionError";
                     throw e;
      }
    }
    catch(e){
      console.log( `%c${e.name || e} exception: %c${e.message || "-"}`
                 , `color: fuchsia`
                 , `color: #aaa`
                 );
      return this;
    }
  }

  // Fix #10: Return structured result with resolved/rejected/aborted info
  flush(){
    const result = { resolved: [], rejected: [], aborted: [], pending: [] };
    while (this.#head){
      if (this.#head.abort("flushed")) {
        result.pending.push(this.#head.proxy.item);
      } else {
        const state = this.#head.previous?.state;
        if (state === "resolved") {
          result.resolved.push(this.#head.proxy.item);
        } else if (state === "rejected") {
          result.rejected.push(this.#head.proxy.item);
        } else if (state === "aborted") {
          result.aborted.push(this.#head.proxy.item);
        }
      }
      this.#head = this.#head.next;
      this.#size--;
    }
    return result;
  }

  kill(){
    if (!this.#head && this.#last && this.#last.state === "pending") {
      this.#last.state = "killed";
      this.#last.resolve(void 0);
    }
    while (this.#head){
      this.#head.abort("killed");
      this.#head = this.#head.next;
      this.#size--;
    }
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
      
      const isEmpty = !this.#head;
      if (isEmpty && !wasEmpty) {
        this.#runEvent("empty");
      }
      wasEmpty = isEmpty;
      
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
        if (this.#stage) {
           if (this.#stage.previous) this.#stage.previous = null;
           this.#stage.proxy = null;
           this.#stage       = null;
        }
        handled           = false;
      }
    }
  }
}
