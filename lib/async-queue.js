export default class {
  #Link;
  #head;
  #last;
  #stage;
  #size;
  #live;
  #events;
  #runEvent = function(event,...args){
                this.#events[event].length && this.#events[event].forEach(e => e.f(...args));
              };
  #idGen    = _ => (Date.now()*Math.random()).toString(36).replace(".","").toUpperCase();

  constructor(options = {}){
    const AQ       = this;

    this.timeout   = !isNaN(options.timeout)                     && options.timeout;
    this.clearMode = ["soft","hard"].includes(options.clearMode) && options.clearMode;
    this.raceMode  = options.raceMode === !!options.raceMode && options.raceMode;
    this.#last     = new function(){
                           this.promise = new Promise((...rs) => [this.resolve,this.reject] = rs);
                           this.state   = "pending";
                           this.staged  = true;
                         }();
    this.#size     = 0;
    this.#live     = true;
    this.#events   = { "next" : []
                     , "error": []
                     , "empty": []
                     , "reply": []
                     };
    this.#Link     = class {

                       constructor(item){
                         this.previous = AQ.#last;
                         this.next     = void 0;
                         this.id       = AQ.#idGen();
                         this.state    = "pending";
                         this.proxy    = Object.defineProperties(Object.create(null),{ "item" : { get: function(){
                                                                                                         return item;
                                                                                                       }.bind(this)
                                                                                                }
                                                                                     , "id"   : { get: function(){
                                                                                                         return this.id;
                                                                                                       }.bind(this)
                                                                                                }
                                                                                     , "state": { get: function(){
                                                                                                         return this.previous.state;
                                                                                                       }.bind(this)
                                                                                                }
                                                                                     , "abort": { value: function(){
                                                                                                           return this.abort("aborted");
                                                                                                         }.bind(this)
                                                                                                }
                                                                                     });
                         this.promise  = new Promise((resolve,reject) => {
                                                       var setTimeoutID = AQ.timeout && setTimeout(_ => this.previous.state === "pending" &&
                                                                                                        ( this.previous.state = "aborted"
                                                                                                        , this.previous.reject({ name   : "Timeout"
                                                                                                                               , message: `Promise timed out before fullfilment`
                                                                                                                               , pid    : this.id
                                                                                                                               })
                                                                                                        ), AQ.timeout);
                                                       this.resolve = resolve;
                                                       this.reject  = reject;
                                                       Object(item).constructor === Promise ? item.then(v  => ( clearTimeout(setTimeoutID)
                                                                                                              , this.previous.state !== "aborted" && ( this.previous.state = "resolved"
                                                                                                                                                     , this.previous.resolve(v)
                                                                                                                                                     , AQ.#runEvent("reply")
                                                                                                                                                     , AQ.raceMode && AQ.clear("upto",this.id)
                                                                                                                                                     )
                                                                                                              ))
                                                                                                  .catch(e => ( clearTimeout(setTimeoutID)
                                                                                                              , (typeof e !== "object" || e === null) && (e = { name   : "Anonymous"
                                                                                                                                                              , message: e
                                                                                                                                                              })
                                                                                                              , e.pid = this.id
                                                                                                              , !this.previous.staged              &&
                                                                                                                this.previous.state === "pending"  &&
                                                                                                                ( this.previous.state = "rejected"
                                                                                                                , AQ.#runEvent("error",e)
                                                                                                                , this.previous.promise
                                                                                                                               .catch(e => console.log( `%c${e.name} exception: %c${e.message}`
                                                                                                                                                      , `color:orangered`
                                                                                                                                                      , `color:white`
                                                                                                                                                      ))
                                                                                                                )
                                                                                                              , this.previous.reject(e)
                                                                                                              )
                                                                                                        )
                                                                                            : ( clearTimeout(setTimeoutID)
                                                                                              , this.previous.state !== "aborted" && ( this.previous.state = "resolved"
                                                                                                                                     , this.previous.resolve(item)
                                                                                                                                     , AQ.#runEvent("reply")
                                                                                                                                     , AQ.raceMode && AQ.clear("upto",this.id)
                                                                                                                                     )
                                                                                              );
                                                     });
                       }

                       get panel(){
                         return this.proxy;
                       }

                       get staged(){
                         return this.promise === AQ.#stage.promise;
                       }

                       abort(e){
                         e = { name   : "Aborted"
                             , message: `Pending promise ${e} before fullfilment`
                             , pid    : this.id
                             };
                         return (this.previous.state === "pending") ? ( this.previous.state = "aborted"
                                                                      , !this.previous.staged && ( AQ.#runEvent("error", e)
                                                                                                 , this.previous.promise
                                                                                                                .catch(e => console.log( `%c${e.name || e} exception: %c${e.message || "-"}`
                                                                                                                                       , `color: darksalmon`
                                                                                                                                       , `color: #aaa`)
                                                                                                                                       )
                                                                                                 )
                                                                      , this.previous.reject(e)
                                                                      , true
                                                                      )
                                                                    : false;
                       }
                     };
  }

  get size(){
    return this.#size;
  }

  on(event){
    return ["next","error","empty"].includes(event) ? { do    : f => {
                                                                  var id = this.#idGen();
                                                                  if (typeof f !== "function") throw new TypeError("Provided callback is not a function");
                                                                  this.#events[event].push({id,f});
                                                                  return id;
                                                                }
                                                      , forget: id => {
                                                                  var ix = this.#events[event].findIndex(e => e.id === id)
                                                                  return ix === -1 ? false
                                                                                   : !!this.#events[event].splice(ix,1).length;
                                                                }
                                                      }
                                                    : !!console.log(`No ${event} event is added. Events can either be "next", "error" or "empty"`);
  }

  enqueue(item){
    this.#size++;
    this.#last = this.#head ? this.#last.next = new this.#Link(item)
                            : this.#head      = new this.#Link(item);
    return this.#last.panel;
  }

  clear(clearMode = this.clearMode, targetId) {
    var cursor, e;
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
                     return this;
        default    : e = new Error(`.clear() failed. "${clearMode}" is an invalid clearMode value. It can either be "hard" or "soft".`);
                     e.name = "MisfitOptionError";
                     throw e;
      }
    }
    catch(e){
      console.log( `%c${e.name || e} exception: %c${e.message || "-"}`
                 , `color: fuchsia`
                 , `color: #aaa`
                 );
    }
  }

  flush(){
    var result = [];
    while (this.#head){
      (this.#head.abort("flushed") || this.#head.previous.state === "resolved") && result.push(this.#head.proxy.item);
      this.#head = this.#head.next;
      this.#size--;
    }
    return result;
  }

  kill(){
    while (this.#head){
      this.#head.abort("killed");
      this.#head = this.#head.next;
      this.#size--;
    }
    this.#live = false;
    console.log("Queue is being terminated..!");
  }

  async *[Symbol.asyncIterator](){
    var handled = false;
    while (true){
      this.#head ? ( this.#size--
                   , this.#stage = this.#head
                   , this.#head  = this.#head.next
                   , ["aborted","rejected"].includes(this.#stage.state) && (handled = true)
                   )
                 : this.#stage = this.#last;
      this.#runEvent("empty");
      try {
        if (this.#live) {
          !handled && ( yield this.#stage.promise.then()
                      , this.#runEvent("next")
                      )
        }
        else return void 0;
      }
      catch(e){
        this.#stage.state = e.name === "Aborted" ? "aborted"
                                                 : "rejected";
        console.log( `%c${e.name || e} exception: %c${e.message || "-"}`
                   , `color: #de1e7e`
                   , `color: #aaa`
                   );
        e.pid = this.#head.id;
        this.#runEvent("error",e);
      }
      finally{
        this.#stage.proxy = null;
        this.#stage       = null;
        handled           = false;
      }
    }
  }
}