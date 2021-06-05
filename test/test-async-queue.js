import AsyncQueue from "../lib/async-queue.js";

async function getAsyncValues(aq){
  for await (const item of aq){
    console.log( `%cThe Promise at endpoint resolved with a value of "${item}"`
               , `color: #00e8f9`
               );
  }
  console.log("The stream is finalized");
}

function makePromiseArray({length,earliest,maxDuration,rejectRatio}){
  return Array.from({length}, (_,i) => new Promise((v,x) => {
                                                     var dur = Number((earliest + Math.random()*maxDuration).toFixed(2)),
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
}

function run(ts){
  console.log( `%cTHIS TEST SESSION INCLUDES ${ts.length.toString().padStart(2," ")} TESTS:`
             , `background-color: white; color: black`
             );
  ts.forEach((t,i) => setTimeout(args => ( console.log( `%cTest #${i+1} @${t.time.toString().padStart(5," ")}ms %c${t.name.padEnd(18," ")}:%c ${t.desc}`
                                                      , `background-color:#eec80b;color:black`
                                                      , `background-color:#7d2a35`
                                                      , `color:white`
                                                      )
                                         , t.func(args)
                                         ), t.time, t.args));
}

var opts  = { timeout  : 200
            , clearMode: "soft"
            },
    tc   = 1,
    tmp  = void 0,
    es   = 0,
    ns   = 0,
    aq    = new AsyncQueue(opts),
    tests = [ { name: "Promises"
              , desc: `Enqueueing 10 promises to the queue`
              , func: ({length,earliest,maxDuration,rejectRatio}) => makePromiseArray({length,earliest,maxDuration,rejectRatio}).forEach(e => aq.enqueue(e))
              , args: { length     : 10
                      , earliest   : 0
                      , maxDuration: 300
                      , rejectRatio: 0.25
                      }
              , time: 0
              }
            , { name: "Clear"
              , desc: "Clear the queue at a given time"
              , func: ({clearMode}) => ( console.log(`Clearing ${aq.size} promises in "${aq.clearMode}" mode`)
                                       , aq.clear(clearMode)
                                       , console.log(`Finished clearing. The queue size is now ${aq.size}`)
                                       )
              , args: {clearMode: opts.clearMode}
              , time: 200
              }
            , { name: "Sync & Async"
              , desc: "Inserting a sync value and Promise.resolve()"
              , func: ({s,a}) => ( aq.enqueue(s)
                                 , aq.enqueue(a)
                                 )
              , args: { s: "this is an insertion of a string"
                      , a: Promise.resolve("An already resolved Promise")
                      }
              , time: 301
              }
            , { name: "Inserting Promises"
              , desc: "Enqueueing an array of 10 promises to be flused at the next step"
              , func: ({length,earliest,maxDuration,rejectRatio}) => makePromiseArray({length,earliest,maxDuration,rejectRatio}).forEach(e => aq.enqueue(e))
              , args: { length     : 10
                      , earliest   : 0
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
            , { name: "Testing Events"
              , desc: `Check the count of "next" and "error" events`
              , func: _ => ( console.log( `In total ${ns} dequeueing attemts are %cresolved.`
                                        , `color: #00e8f9`
                                        )
                           , console.log( `In total ${es} items are either %caborted prematurely, %crejected at the pending state %cor %crejected at the staged state.`
                                        , `color: darksalmon`
                                        , `color: orangered`
                                        , `color: white`
                                        , `color: #de1e7e`
                                        )
                           )
              , args: {}
              , time: 900
              }
            , { name: "Abortion"
              , desc: "Testing panel.abort() and panel.state functionalities"
              , func: ({ length,earliest,maxDuration,rejectRatio}) => {
                                                                     aq.timeout = void 0;
                                                                     var panels = makePromiseArray({length,earliest,maxDuration,rejectRatio}).map(p => aq.enqueue(p));
                                                                     setTimeout( ps => ps.forEach((p,i) => ( console.log( `%cPanel #${i.toString()
                                                                                                                                       .padStart(3," ")} is in ${p.state} state @${earliest/2}ms`
                                                                                                                        , "color:lightgreen")
                                                                                                           , (i%2) && p.abort()
                                                                                                           ))
                                                                               , earliest/2
                                                                               , panels
                                                                               );
                                                                     setTimeout( ps => ps.forEach((p,i) => console.log(`Panel #${i.toString()
                                                                                                                                  .padStart(3," ")} is in ${p.state} state @${earliest}ms`))
                                                                               , earliest
                                                                               , panels
                                                                               );
                                                                     setTimeout( ps => ps.forEach((p,i) => console.log(`%cPanel #${i.toString()
                                                                                                                                    .padStart(3," ")} is in ${p.state} state @${maxDuration/2}ms`
                                                                                                                      , "color:lightgreen"
                                                                                                                      ))
                                                                               , maxDuration/2
                                                                               , panels
                                                                               );
                                                                     setTimeout( ps => ps.forEach((p,i) => console.log(`Panel #${i.toString()
                                                                                                                                  .padStart(3," ")} is in ${p.state} state @${maxDuration+50}ms`))
                                                                               , maxDuration+50
                                                                               , panels
                                                                               );
                                                                   }
              , args: { length     : 4
                      , earliest   : 100
                      , maxDuration: 400
                      , rejectRatio: 0
                      }
              , time: 1000
              }
            , { name: "Kill Queue"
              , desc: "Testing the termination of the queue with held promises"
              , func: ({ length,earliest,maxDuration,rejectRatio}) => {
                                                                     aq.timeout = void 0;
                                                                     var panels = makePromiseArray({length,earliest,maxDuration,rejectRatio}).map(p => aq.enqueue(p));
                                                                     setTimeout( ps => ( ps.forEach((p,i) => console.log(`Panel #${i.toString()
                                                                                                                                    .padStart(3," ")} is in ${p.state} state @${earliest}ms`))
                                                                                       , aq.kill()
                                                                                       )
                                                                               , earliest+150
                                                                               , panels
                                                                               );
                                                                     setTimeout( ps => ( ps.forEach((p,i) => console.log(`Panel #${i.toString()
                                                                                                                                    .padStart(3," ")} is in ${p.state} state @${maxDuration}ms`))
                                                                                       , aq.enqueue("something after kill")
                                                                                       , aq.enqueue(Promise.resolve("someting async after kill"))
                                                                                       , --tc > 0 && ( aq = new AsyncQueue(opts)
                                                                                                     , getAsyncValues(aq)
                                                                                                     , run(tests)
                                                                                                     )
                                                                                       )
                                                                               , maxDuration+300
                                                                               , panels
                                                                               );
                                                                   }
              , args: { length     : 4
                      , earliest   : 0
                      , maxDuration: 300
                      , rejectRatio: 0
                      }
              , time: 1500
              }
            ];

var id0 = aq.on("error").do(_ => es++);
var id1 = aq.on("next").do( _ => ns++);
var id2 = aq.on("empty").do(_ => !aq.size && console.log(`%cEmpty queue fired`, "background-color:#e71837;color:white"));
console.log(id0,id1,id2);

getAsyncValues(aq);
run(tests.slice(0,7));