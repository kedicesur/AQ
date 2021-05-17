import {AQ} from "../mod.ts";

async function getAsyncValues(aq){
    for await (const response of aq){
      console.log( `%cReceived response: ${response} at the endpoint`
                 , `color: #00e8f9`
                 );
    }
    console.log("The stream is finalized");
}

function asyncRequest(minStart,maxStart,minDelay,maxDelay,id){
    var startTime = minStart + (maxStart-minStart)*Math.random(),
        delay     = minDelay + (maxDelay-minDelay)*Math.random();
    console.log(`Request #${id.toString()
                              .padStart(2,"0")} will be made @${startTime.toFixed(2)
                                                                         .padStart(6,"0")} ms and is expected to resolve @${(startTime+delay).toFixed(2)
                                                                                                                                             .padStart(6,"0")} ms`);
    return new Promise(v => setTimeout( v
                                      , startTime
                                      , `Request #${id.toString()
                                                      .padStart(2,"0")} made @${startTime.toFixed(3)
                                                                                         .padStart(7,"0")}ms.\n`
                                      )).then(r => aq.enqueue(new Promise(v => setTimeout( v
                                                                                         , delay
                                                                                         , `${r}Waited ${delay.toFixed(2)
                                                                                                              .padStart(6,"0")} ms for the response to arrive at ${(startTime+delay).toFixed(2)
                                                                                                                                                                                    .padStart(6,"0")} ms`
                                                                                         ))))
}

var n        = 10,
    aq       = new AQ({ clearMode: "soft"
                      , race     : true
                      }),
    promises = Array.from({length:n}, (_,i) => asyncRequest(50,250,100,500,i));

getAsyncValues(aq);