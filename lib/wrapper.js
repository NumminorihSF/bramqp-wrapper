var domain = {
  Basic: require('../domain/basic'),
  Confirm: require('../domain/confirm'),
  Exchange: require('../domain/exchange'),
  Queue: require('../domain/queue'),
  Tx: require('../domain/tx')
};



function Wrapper (client){
  this.client = client;
}

Wrapper.prototype.wrap = function(chan, done){
  return {
    channel: chan,
    basic: new domain.Basic(this.client, chan),
    confirm: new domain.Confirm(this.client, chan),
    exchange: new domain.Exchange(this.client, chan),
    queue: new domain.Queue(this.client, chan),
    tx: new domain.Tx(this.client, chan),
    done: done
  }
};


module.exports = Wrapper;