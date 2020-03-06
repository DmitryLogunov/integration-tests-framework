import Nats from 'nats';


const nats = process.env.NATS_ENABLED ? Nats.connect({url: process.env.NATS_SERVER}) : null;


function publish(topic: string, msg: string) {
  if (nats) {
    nats.publish(topic, msg);
  }
}


interface NatsSubscriberCallback {
  (msg: string): void
}


function subscribe(topic: string, cb: NatsSubscriberCallback) {
  if (nats) {
    nats.subscribe(topic, cb);
  }
}


export {
  publish,
  subscribe
}

