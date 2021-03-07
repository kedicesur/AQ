export default class AsyncQueue {
  #head;
  #last;
  #stage;
  #size;
  #Link;

  constructor(options){
    var AQ = this;

    this.clearMode = ["soft","hard"].includes(options.clearMode) && options.clearMode;
    this.timeout   = !isNaN(options.timeout)                     && options.timeout;
    this.errHandle = options.errHandle instanceof Function       && options.errHandle;
    this.#last     = new function(){
                           this.promise = new Promise((...rs) => [this.resolve,this.reject] = rs);
                           this.state  = "staged";
                         }();
    this.#size     = 0;
    this.#Link     = class {
                       constructor(item){
                         this.item     = item;
                         this.previous = AQ.#last;
                         this.state    = "pending";
                         this.next     = void 0;
                         this.promise  = new Promise((resolve,reject) => {
                                                       var setTimeoutID = AQ.timeout && setTimeout(_ => ( this.previous.state = "aborted"
                                                                                                        , this.previous.reject({ name   : "Timeout"
                                                                                                                               , message: "Promise timed out before fullfilment"
                                                                                                                               })
                                                                                                        ), AQ.timeout);
                                                       this.resolve = resolve;
                                                       this.reject  = reject;
                                                       Object(item).constructor === Promise ? item.then(v  => ( clearTimeout(setTimeoutID)
                                                                                                              , this.previous.state = "resolved"
                                                                                                              , this.previous.resolve(v)
                                                                                                              ))
                                                                                                  .catch(e => {
                                                                                                           clearTimeout(setTimeoutID);
                                                                                                           switch (this.previous.state){
                                                                                                             case "pending": this.previous.state = "rejected";
                                                                                                                             this.previous.promise.catch(e => console.log(`${e.name} exception: ${e.message}`));
                                                                                                                             this.previous.reject({ name   : e.name    || "Rejected"
                                                                                                                                                  , message: e.message || "Exception in promise"
                                                                                                                                                  });
                                                                                                                             break;
                                                                                                             case "staged" : this.previous.reject({ name   : e.name    || "Rejected"
                                                                                                                                                  , message: e.message || "Exception in promise"
                                                                                                                                                  });
                                                                                                           };
                                                                                                        })
                                                                                            : ( clearTimeout(setTimeoutID)
                                                                                              , this.previous.state = "resolved"
                                                                                              , this.previous.resolve(item)
                                                                                              );
                                                     });
                       };

                       abort(e){
                         switch (this.previous.state){
                           case "pending": this.previous.state = "aborted";
                                           this.previous.promise.catch(e => console.log( `%c${e.name || e} exception: %c${e.message || "-"}`
                                                                                       , `color: pink`
                                                                                       , `color: #aaa`)
                                                                                       );
                                           this.previous.reject({ name   : "Aborted"
                                                                , message: `Pending promise ${e} before fullfilment`
                                                                });
                                           return true;
                           case "staged" : this.previous.state = "aborted";
                                           this.previous.reject({ name   : "Aborted"
                                                                , message: `Staged Promise ${e} before fullfilment`
                                                                });
                                           return true;
                           default       : return false;
                         };
                       };
                     };
  };

  get size(){
    return this.#size;
  };

  enqueue(item){
    this.#size++;
    this.#last = this.#head ? this.#last.next = new this.#Link(item)
                            : this.#head      = new this.#Link(item);
    return this;
  };

  clear(clearMode = this.clearMode) {
    try{
      switch (clearMode){
        case "soft": var cursor = this.#head;
                     while (cursor){
                       cursor.abort("cleared");
                       cursor = cursor.next;
                     };
                     return this;
        case "hard": while (this.#head){
                       this.#size--;
                       this.#head.abort("cleared")
                       this.#head = this.#head.next;
                     };
                     return this;
        default    : var e = new Error(`.clear() failed. "${clearMode}" is an invalid clearMode value. It can either be "hard" or "soft".`);
                     e.name = "MisfitOptionError";
                     throw e;
      };
    }
    catch(e){
      console.log( `%c${e.name || e} exception: %c${e.message || "-"}`
                 , `color: fuchsia`
                 , `color: #aaa`
                 );
    }
  };

  flush(){
    var result = [];
    while (this.#head){
      (this.#head.abort("flushed") || this.#head.previous.state === "resolved") && result.push(this.#head.item);
      this.#head = this.#head.next;
      this.#size--;
    };
    return result;
  };

  async *[Symbol.asyncIterator](){
    var s = false;
    while (true){
      this.#head ? ( this.#size--
                   , this.#stage       = this.#head
                   , this.#head        = this.#head.next
                   , ["aborted","rejected"].includes(this.#stage.state) && ( s                   = Symbol("handled")
                                                                           , this.#stage.promise = Promise.reject(s)
                                                                           )
                   , this.#stage.state = "staged"
                   )
                 : this.#stage = this.#last;
      try {
        yield this.#stage.promise;
      }
      catch(e){
        (e !== s) && (this.errHandle ? this.errHandle(e)
                                     : console.log( `%c${e.name || e} exception: %c${e.message || "-"}`
                                                  , `color: #de1e7e`
                                                  , `color: #aaa`
                                                  ));
      }
     finally{
       this.#stage = null;
       s           = false;
     };
    };
  };
};