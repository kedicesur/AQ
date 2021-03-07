import AsyncQueue from "./lib/async-queue.js";

var aq = new AsyncQueue();

async function getAsyncValues(){
  for await (let item of aq){
    console.log(`The Promise resolved with a value of ${item.value}`);
  };
};

getAsyncValues();

for (var i=1, r; i <= 10; i++){
  r = Math.random()*5950;
  aq.enqueue(new Promise(resolve => setTimeout(resolve, r, `done ${i} at ${r}ms`)));
  };

setTimeout(function(){
             aq.clear();
             console.log(`Queue cleared @ 5000ms ${aq.size ? "but there is still one more promise to resolve..!" : ""}`);
           }, 5000);

setTimeout(function(){
             console.log("size @ 6000ms is:", aq.size);
             aq.enqueue(Promise.resolve('"this was an asynchronous insertion"'));
           }, 6000);

setTimeout(function(){
             console.log("size @ 7000ms is:", aq.size);
             aq.enqueue(Promise.resolve('"this was an asynchronous insertion"'));
           }, 7000);

for (var i=1; i <= 2; i++) aq.enqueue(i);
setTimeout(function(){console.log("Size:",aq.size);},7500);

