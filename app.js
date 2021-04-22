import AsyncQueue from "./lib/async-queue.js";

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

var errh = e => console.log(`The error handler caught exception ${e.name} caught due to "${e.message}"`),
    opts = { timeout  : 200
           , errHandle: false //errh
           , clearMode: "soft"
           },
    aq   = new AsyncQueue(opts),
    clr  = 350,  // 1st clear time
    rnd  = 300,  // 10 promises with 0 ~ rnd ms resolve
    as1  = 375,  // asynchrnous instertion of a string
    ap1  = 400,  // asynchrnous instertion of a promise
    aa1  = 500,  // asynchrnous instertion of an array of promises to flush
    aa2  = 1000, // asynchrnous instertion of an array of promises to abort
    fls  = 650,  // flush at
    abrt = 1010, // abort at
    faop = { length     : 10
           , maxDuration: 300
           , rejectRatio: 0.01
           },
    aaop = { length     : 10
           , maxDuration: 1000
           , rejectRatio: 0
           },
    pa;

aq.clear();

async function getAsyncValues(){
  for await (let item of aq){
    console.log(`The Promise at endpoint resolved with a value of "${item}"`);
  };
};

getAsyncValues();

for (var i=1, r; i <= 10; i++){
  r = ~~(Math.random()*rnd);
  aq.enqueue(new Promise(resolve => setTimeout(resolve, r, `done ${i} at ${r}ms`)));
};

setTimeout(_ => console.log(`Size at timeout (${opts.timeout}ms) is ${aq.size}`),opts.timeout);

setTimeout(function(){
             console.log(`Queue size just before clearing is ${aq.size}`);
             aq.clear();
             console.log(`Queue cleared @${clr}ms ${aq.size ? "but previously resolved promises are kept..!" : "with no remaining items"}`);
           }, clr);

setTimeout(function(){
             console.log(`size @ ${as1}ms is: ${aq.size}`);
             aq.enqueue("Asynchronous insertion of this string");
           }, as1);

setTimeout(function(){
             console.log(`size @ ${ap1}ms is: ${aq.size}`);
             aq.enqueue(Promise.resolve("Asynchronous insertion of a promise"));
           }, ap1);

setTimeout(function(){console.log(`Size @${ap1+1}ms: ${aq.size}`);},ap1+1);

setTimeout(function(){
             makePromiseArray(faop).forEach(p => aq.enqueue(p));
             console.log(`Queue size ${fls-aa1}ms before flush() is ${aq.size}`);
           },aa1);

setTimeout(function(){
             var ps = aq.flush();
             console.log(`Flushed ${ps.length} promises and the queue size after flush is ${aq.size}`);
             Promise.all(ps)
                    .then(rs => console.log("Promise.all() resolutions", rs))
                    .catch(e => console.log(`Promise.all() caught ${e.name || e} exception: ${e.message || e}`));
           },fls);

setTimeout(function(){
             pa = makePromiseArray(aaop);
             pa.forEach(p => aq.enqueue(p));
             console.log(`Queue size ${abrt-aa2}ms before abort() is ${aq.size}`);
           },aa2);

setTimeout(function(){
             aq.abort(pa[0]);
             aq.abort(pa[3]);
             aq.abort(pa[6]);
           },abrt);

setTimeout(function(){
             console.log(`size @ ${aa1+250}ms is: ${aq.size}`);
             aq.enqueue("Asynchronous insertion of this second string");
           }, aa1+250);

setTimeout(function(){
             console.log(`size @ ${aa1+250}ms is: ${aq.size}`);
             aq.enqueue(Promise.resolve("Asynchronous insertion of another promise"));
           }, aa1+500);

for (var i=1; i <= 2; i++) aq.enqueue("Synchronous " + i);

