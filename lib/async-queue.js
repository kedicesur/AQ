export default class {
  #head;
  #last;
  #stage;
  #size;
<<<<<<< HEAD
=======
  #live;
>>>>>>> abort
  #events;
  #runEvent;
  #Link;

  constructor(options = {}){
    var AQ = this;

    this.clearMode = ["soft","hard"].includes(options.clearMode) && options.clearMode;
    this.timeout   = !isNaN(options.timeout)                     && options.timeout;
    this.errHandle = options.errHandle instanceof Function       && options.errHandle;
    this.#last     = new function(){
                           this.promise = new Promise((...rs) => [this.resolve,this.reject] = rs);
                           this.state   = "pending";
                           this.staged  = true;
                         }();
    this.#size     = 0;
<<<<<<< HEAD
=======
    this.#live     = true;
>>>>>>> abort
    this.#events   = { "next" : []
                     , "error": []
                     , "empty": []
                     };
    this.#runEvent = function(event,arg){
                       this.#events[event].length && this.#events[event].forEach(f => f(arg));
                     };
    this.#Link     = class {

                       constructor(item){
                         this.previous = AQ.#last;
                         this.state    = "pending";
                         this.next     = void 0;
                         this.proxy    = Object.defineProperties(Object.create(null),{ "item" : { get: function(){
                                                                                                         return item;
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
                                                       var setTimeoutID = AQ.timeout && setTimeout(_ => ( this.previous.state = "aborted"
                                                                                                        , this.previous.reject({ name   : "Timeout"
                                                                                                                               , message: "Promise timed out before fullfilment"
                                                                                                                               })
                                                                                                        ), AQ.timeout);
                                                       this.resolve = resolve;
                                                       this.reject  = reject;
                                                       Object(item).constructor === Promise ? item.then(v  => ( clearTimeout(setTimeoutID)
                                                                                                              , this.previous.state !== "aborted" && (this.previous.state = "resolved")
                                                                                                              , this.previous.resolve(v)
                                                                                                              ))
<<<<<<< HEAD
                                                                                                  .catch(e => {
                                                                                                           clearTimeout(setTimeoutID);
                                                                                                           switch (this.previous.state){
                                                                                                             case "pending": AQ.#runEvent("error",e);
                                                                                                                             this.previous.state = "rejected";
                                                                                                                             this.previous.promise.catch(e => console.log( `%c${e.name} exception: %c${e.message}`
                                                                                                                                                                         , `color: orangered`
                                                                                                                                                                         , `color: white`
                                                                                                                                                                         ));
                                                                                                                             this.previous.reject({ name   : e.name    || "Rejected"
                                                                                                                                                  , message: e.message || "Exception in promise"
                                                                                                                                                  });
                                                                                                                             break;
                                                                                                             case "staged" : this.previous.reject({ name   : e.name    || "Rejected"
                                                                                                                                                  , message: e.message || "Exception in promise"
                                                                                                                                                  });
                                                                                                           };
                                                                                                        })
=======
                                                                                                  .catch(e => ( clearTimeout(setTimeoutID)
                                                                                                              , !this.previous.staged              &&
                                                                                                                this.previous.state !== "aborted"  &&
                                                                                                                ( this.previous.state = "rejected"
                                                                                                                , AQ.#runEvent("error",e)
                                                                                                                , this.previous.promise
                                                                                                                               .catch(e => console.log( `%c${e.name} exception: %c${e.message}`
                                                                                                                                                      , `color:orangered`
                                                                                                                                                      , `color:white`
                                                                                                                                                      ))
                                                                                                                )
                                                                                                              , this.previous.reject({ name   : e.name    || "Rejected"
                                                                                                                                     , message: e.message || "Exception in promise"
                                                                                                                                     })
                                                                                                              )
                                                                                                        )
>>>>>>> abort
                                                                                            : ( clearTimeout(setTimeoutID)
                                                                                              , this.previous.state !== "aborted" && (this.previous.state = "resolved")
                                                                                              , this.previous.resolve(item)
                                                                                              );
                                                     });
                       };

                       get panel(){
                         return this.proxy;
                       };

                       get staged(){
                         return this.promise === AQ.#stage.promise;
                       }

                       abort(e){
<<<<<<< HEAD
                         switch (this.previous.state){
                           case "pending": AQ.#runEvent("error",e);
                                           this.previous.state = "aborted";
                                           this.previous.promise.catch(e => console.log( `%c${e.name || e} exception: %c${e.message || "-"}`
                                                                                       , `color: darksalmon`
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
=======
                         return (this.previous.state === "pending") ? ( AQ.#runEvent("error",e)
                                                                      , this.previous.state = "aborted"
                                                                      , !this.previous.staged && this.previous.promise
                                                                                                              .catch(e => console.log( `%c${e.name || e} exception: %c${e.message || "-"}`
                                                                                                                                     , `color: darksalmon`
                                                                                                                                     , `color: #aaa`)
                                                                                                                                     )
                                                                      , this.previous.reject({ name   : "Aborted"
                                                                                             , message: `Pending promise ${e} before fullfilment`
                                                                                             })
                                                                      , true
                                                                      )
                                                                    : false;
>>>>>>> abort
                       };
                     };
  };

  get size(){
    return this.#size;
  };

  on(event){
    return ["next","error","empty"].includes(event) ? { add   : f => {
                                                                  if (typeof f !== "function") throw new TypeError("Provided callback is not a function"); 
<<<<<<< HEAD
                                                                  this.#events[event].push(f)-1;
=======
                                                                  return this.#events[event].push(f)-1;
>>>>>>> abort
                                                                }
                                                      , remove: n => Number.isInteger(n) && (n>=0) && this.#events[event].splice(n,1)
                                                      }
                                                    : !!console.log(`No ${event} event is added. Events can either be "next", "error" or "empty"`);
  }

  enqueue(item){
    this.#size++;
    this.#last = this.#head ? this.#last.next = new this.#Link(item)
                            : this.#head      = new this.#Link(item);
    return this.#last.panel;
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
      (this.#head.abort("flushed") || this.#head.previous.state === "resolved") && result.push(this.#head.proxy.item);
      this.#head = this.#head.next;
      this.#size--;
    };
    return result;
  };

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
                   , this.#stage       = this.#head
                   , this.#head        = this.#head.next
                   , ["aborted","rejected"].includes(this.#stage.state) && (handled = true)
                   )
                 : this.#stage = this.#last;
      this.#runEvent("empty");
      try {
        if (this.#live) {
          !handled && ( yield this.#stage.promise
                      , this.#runEvent("next")
                      )
        }
        else return void 0;
      }
      catch(e){
<<<<<<< HEAD
        (e !== s) && ( this.#runEvent("error",e)
                     , this.errHandle ? this.errHandle(e)
                                      : console.log( `%c${e.name || e} exception: %c${e.message || "-"}`
                                                   , `color: #de1e7e`
                                                   , `color: #aaa`
                                                   ));
      }
      finally{
        this.#runEvent("next");
        this.#stage = null;
        s           = false;
      };
    };
  };
}
=======
        this.#stage.state = e.name | "rejected";
        e.name !== "Aborted" && this.#runEvent("error",e);
        this.errHandle ? this.errHandle(e)
                       : console.log( `%c${e.name || e} exception: %c${e.message || "-"}`
                                    , `color: #de1e7e`
                                    , `color: #aaa`
                                    );
      }
     finally{
       this.#stage.proxy = null;
       this.#stage       = null;
       handled           = false;
     };
    };
  };
}

>>>>>>> abort
