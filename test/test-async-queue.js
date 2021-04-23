import AsyncQueue from "../lib/async-queue.js";

async function getAsyncValues(aq){
  for await (let item of aq){
    console.log(`The Promise at endpoint resolved with a value of "${item}"`);
  };
};

function makePromiseArray({length,maxDuration,rejectRatio}){
  return Array.from({length}, (_,i) => new Promise((v,x) => {
                                                     var dur = ~~(Math.random()*maxDuration),
                                                         act = Math.random() < rejectRatio ? { fun: x
                                                                                             , msg: { name   : "Bad Luck"
                                                                                                    , message: `Promise ${i} expected at ${dur}ms but rejected due to ${rejectRatio*100}% bad luck`
                                                                                                    }
                                                                                             }
                                                                                           : { fun: v
                                                                                             , msg: `Promise ${i} resolved at ${dur}ms due to ${100*(1-rejectRatio)}% good luck`
                                                                                             };
                                                     setTimeout(act.fun,dur,act.msg);
                                                   }));
};

function run(ts){
  ts.forEach((t,i) => setTimeout(args => ( console.log( `%cTest #${i+1} @${t.time.toString().padStart(5," ")}ms %c${t.name.padEnd(18," ")}:%c ${t.desc}`
                                                      , `color:yellow`
                                                      , `color:lightgreen`
                                                      , `color:white`
                                                      )
                                         , t.func(args)
                                         ), t.time, t.args));
};

var errh  = e => console.log(`The error handler caught exception ${e.name} caught due to "${e.message}"`),
    opts  = { timeout  : 200
            , errHandle: false //errh
            , clearMode: "soft"
            },
    tmp,
    aq    = new AsyncQueue(opts),
    tests = [ { name: "Promises"
              , desc: `Enqueueing 10 promises to the queue`
              , func: ({length,maxDuration,rejectRatio}) => makePromiseArray({length,maxDuration,rejectRatio}).forEach(e => aq.enqueue(e))
              , args: { length     : 10
                      , maxDuration: 300
                      , rejectRatio: 0.1
                      }
              , time: 0
              }
            , { name: "Clear"
              , desc: "Clear the queue at a given time"
              , func: ({clearMode}) => ( console.log(`Clearing ${aq.size} promises`)
                                       , aq.clear(clearMode)
                                       , console.log(`Finished clearing. The queue size is now ${aq.size}`)
                                       )
              , args: {clearMode: "hard"}
              , time: 200
              }
            , { name: "Sync & Async"
              , desc: "Inserting a sync value and  Promise.resolve()"
              , func: ({s,a}) => ( aq.enqueue(s)
                                 , aq.enqueue(a)
                                 )
              , args: { s: "this is an insertion of a string"
                      , a: Promise.resolve("An already resolved Promise")
                      }
              , time: 301
              }
            , { name: "Inserting Promises"
              , desc: "Enqueueing an array of promises to be flused at the next step"
              , func: ({length,maxDuration,rejectRatio}) => makePromiseArray({length,maxDuration,rejectRatio}).forEach(e => aq.enqueue(e))
              , args: { length     : 10
                      , maxDuration: 300
                      , rejectRatio: 0.1
                      }
              , time: 350
              }
            , { name: "Flush"
              , desc: "Flushing queue and testing flushed promises by Promise.all()"
              , func: _ => ( tmp = aq.flush()
                           , console.log(`Flushed ${tmp.length} promises. The size of queue is ${aq.size}`)
                           , Promise.all(tmp)
                                    .then(values => console.log(values))
                                    .catch(error => console.log("Promise.all() rejected with \n",error))
                          )
              , args: {}
              , time: 550
              }
            , { name: "Sync & Async"
              , desc: "Inserting sync value and Promise.resolve()"
              , func: ({s,a}) => ( aq.enqueue(s)
                                 , aq.enqueue(a)
                                 )
              , args: { s: "this is an insertion of a string"
                      , a: Promise.resolve("An already resolved Promise")
                      }
              , time: 700
              }
            ];

getAsyncValues(aq);
run(tests);

