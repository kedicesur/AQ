import {AQ} from "../mod.ts";

async function getAsyncValues(aq){
  for await (const res of aq){
    res.ok && res.json()
                 .then(json => console.log( `%cReceived color name "${json.data.name}" with value ${json.data.color} at the endpoint`
                                          , `color: ${json.data.color}`
                                          ));
  }
    console.log("The stream is finalized");
}


var url    = "https://reqres.in/api/products/",
    urlCnt = 12,
    tryCnt = 5,
    urls   = Array.from({length: urlCnt}, (_,i) => url+(i+1)),
    aq     = new AQ({timeout: 80}),
    panels,
    retry  = e => {
               const ix = panels.findIndex(p => p.id === e.pid),
                     tc = panels[ix].tryCnt;
               ix >= 0 && tc && ( panels[ix] = aq.enqueue(fetch(urls[ix]))
                                , panels[ix].tryCnt = tc - 1
                                , console.log(`Retry #${(tryCnt-panels[ix].tryCnt).toString().padStart(2," ")} for "${url+(ix+1)}"`)
                                );
             };

aq.on("error").do(retry); // Literature BITCH..!
getAsyncValues(aq);
panels = urls.map(url => {
                    const panel = aq.enqueue(fetch(url));
                    panel.tryCnt = tryCnt;
                    return panel;
                  });