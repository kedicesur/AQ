import {AQ} from "https://gitlab.com/Redu/aq/-/raw/master/mod.ts";

async function getAsyncValues(aq){
  for await (const response of aq){
    console.log( `%cReceived response: ${response} at the endpoint`
               , `color: #00e8f9`
               );
    //aq.kill();
  }
    console.log("The stream is finalized");
}

function fakeFetch(n,t,dmin,dmax,errt){
  var dur = dmin + (dmax-dmin)*Math.random();
  console.log(`Request #${n.toString()
                           .padStart(3," ")} made @${t.toFixed(2)
                                                      .padStart(9," ")} expected to respond @${(t+dur).toFixed(2)
                                                                                                      .padStart(9," ")}`);
  return new Promise((v,x) => setTimeout(_ =>  Math.random() > errt ? v(`Request #${n.toString()
                                                                                     .padStart(3," ")} made @${t.toFixed(2)
                                                                                                                .padStart(9," ")} responded @${(t+dur).toFixed(2)
                                                                                                                                                      .padStart(9," ")}`)
                                                                    : x(`Request #${n.toString()
                                                                                     .padStart(3," ")} rejected due to ${errt*100}% failure rate`)
                                        , dur
                                        ));
}

function poll(c=1){
  setTimeout( _ => ( aq.enqueue(fakeFetch(c,c*pper,dmin,dmax,errt))
                   , c < pcnt && poll(++c)
                   )
                   , pper);
}

var pcnt = 100,  // Promise Count
    pper = 100,  // Promise Period
    dmin = 250,  // Minimum Duration
    dmax = 5000, // Maximum Duration
    errt = 0.1,  // Error Rate
    aq   = new AQ({ clearMode: "soft"
                  , raceMode : true
                  });

getAsyncValues(aq);
poll();