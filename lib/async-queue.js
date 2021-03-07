export default class AsyncQueue {
  #HEAD;
  #LAST;

  static #LINK = class {
    #RESOLVER;

    constructor(item,resolver){
      this.promise = new Promise(resolve => ( this.#RESOLVER = resolve
                                            , Object(item).constructor === Promise ? resolver(item.then(value => ({value, done: false})))
                                                                                   : resolver({value: item, done: false})
                                            ));
      this.next    = void 0;
    };

    get resolver(){
      return this.#RESOLVER;
    };
  };

  constructor(){
    new Promise(resolve => this.#HEAD = new AsyncQueue.#LINK(null,resolve));
    this.size = 1;
  };

  enqueue(item){
    this.size++;
    this.#LAST = this.#LAST ? this.#LAST.next = new AsyncQueue.#LINK(item,this.#LAST.resolver)
                            : this.#HEAD      = new AsyncQueue.#LINK(item,this.#HEAD.resolver);
    return this;
  };

  clear(){
    this.#LAST && ( this.#HEAD = this.#LAST
                  , this.size  = 1
                  );
  }

  next(){
    var promise = this.#HEAD.promise.then(value => ({value, done: false}));
    this.size--;
    this.#HEAD.next ? this.#HEAD = this.#HEAD.next
                    : this.#LAST = void 0;
    return promise;
  };

  [Symbol.asyncIterator]() {
    return this;
  };
}

