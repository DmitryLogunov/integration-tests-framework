// TODO: legacy from Aleksey Tatarnikov - there is should reafcatoring

import fs from 'fs';
import {config} from './config';
import kafka_node from 'kafka-node';
import * as logger from '../../../lib/components/logger';
import stackTrace from 'stack-trace';
import {diff, observableDiff} from 'deep-diff';
import request from 'superagent';
import {promisify} from 'util';
import {CallbackInPromiseInterface, CompareJsonResult} from "./lib.types";
import {Message} from "../../../lib/components/messages";


process.env.KAFKA_BROKERS = config.kafka_url;

export const readFile = (name: string) => {
  return new Promise((resolve, reject) => {
    fs.readFile(name, 'utf-8', (err: Error, data: string) => {
      if (err) {
        //TODO: do we go here?
        return reject(err);
      }

      resolve(data);
    });
  });
};

export const readDir = (path: string) => {
  return new Promise((resolve, reject) => {
    fs.readdir(path, (err: Error, files: Array<string>) => {
      if (err) {
        return reject(err);
      }

      resolve(files);
    });
  });
};


export const kafka_broker_client = () => {
  return new Promise(async (resolve: (data: any) => void, reject: (err: Error) => void) => {
    try {
      const kafkaHost: string = (process.env.KAFKA_BROKERS || 'kafka:9092').replace(/ /g, ',');
      const kafkaClient: any = await new kafka_node.KafkaClient({kafkaHost});
      resolve(kafkaClient);
    } catch (e) {
      return reject(e);
    }

  });
};

export const publish_message = (topic: string, message: string) => {

  return new Promise(async (resolve, reject) => {

    let Producer = kafka_node.Producer,
      client = await kafka_broker_client(),
      producer = new Producer(client),
      send_cb = (err: Error) => {
        producer.close();

        if (err) {
          logger.error(err.message, {}, stackTrace.get());
          return reject(err);
        } else
          resolve();
      };

    producer.on('ready', () => {
      producer.send([{topic, messages: message}], send_cb);
    });

    producer.on('error', (err: Error) => {
      logger.error(err.message, {}, stackTrace.get());
      //TODO: make sure we need 2 close calls below
      producer.close();
      reject(err);
    });

  });//return Promise
};//publish_message

export const get_all_msgs = (topic: string, partition: number) => {
  partition = partition || 0;
  return new Promise(async (resolve, reject) => {
    const client = await new kafka_node.Client(config.zookeeper_url);

    const consumer = await new kafka_node.Consumer(client,
      [{topic: topic, partition: partition, offset: 0}],
      {fromOffset: true});


    let msgs: Array<Message> = [],
      is_error_happened = false;

    consumer.on('message', function (message: Message) {
      msgs.push(message);
    });

    consumer.on('error', function (err: Error) {
      is_error_happened = true;
      logger.error(err.message, {}, stackTrace.get());
      consumer.close();
      return reject(err);
    });

    setTimeout(() => {
      consumer.close();
      if (!is_error_happened) {
        resolve(msgs);
      }
    }, parseInt(config.timeouts.kafka_consume) * 1000);

  });// return Promise
};//get_count

//TODO: make sure there is any messages in a topic - otherwise it waits
export const get_last_msg = (topic: string, partition: number, n: number) => {
  partition = partition || 0;
  n = n || 0;
  return new Promise(async (resolve, reject) => {
    let Consumer = kafka_node.Consumer,
      client = new kafka_node.Client(config.zookeeper_url),
      consumer = new Consumer(client, [], {fromOffset: true}),
      offset = new kafka_node.Offset(client),
      offsetFetch = promisify(offset.fetch);

    /**
     * Get the latest offset available in config topic
     */
    /* Legacy from Aleksey Tatarnikov

     let latestOffset: number = await (
         () => {
             return new Promise((resolve, reject) => {
                 offset.fetch([{ topic, partition, time: -1 }], function (err: Error, data: {[key: string]: Array<Array<number>>}) {
                     // logger.info('Consumer current offset', {}, stackTrace.get());
                     resolve(data[topic][partition][0]);
                 });
             });
         }
     )();
    */

    const latestOffset: number =
      await offsetFetch([{topic, partition, time: -1}],
        (err: Error, data: { [key: string]: Array<Array<number>> }) => {
          // logger.info('Consumer current offset', {}, stackTrace.get());
          return data[topic][partition][0];
        });

    consumer.on('message', function (message: MessageInterface) {
      consumer.close();
      resolve(message.value);
    });

    consumer.on('error', function (err: Error) {
      consumer.close();
      logger.error(err.message, {}, stackTrace.get());
      return reject(err);
    });

    consumer.addTopics([{topic, offset: latestOffset - 1 - n}], (err: Error, added: any) => {
      if (err) {
        logger.error(err.message, {}, stackTrace.get());
        return reject(err);
      } else {
        // logger.info("Topics have benn added", { topics: added }, stackTrace.get());
      }
    }, true);

  });
};

export const compare_json = (string1: string, string2: string, excPath: string[]): Promise<CompareJsonResult> => {
  return new Promise((resolve, reject) => {
    try {
      const json1 = JSON.parse(string1),
        json2 = JSON.parse(string2);

      let result = true;
      let diffs = diff(json1, json2);

      if (typeof diffs != 'undefined') {//if there are any diffs
        diffs.forEach((e: { path: Array<string> }) => {
          if (excPath.indexOf(form_path(e.path)) == -1)
            result = false;
        });
      }

      resolve(new CompareJsonResult(result, diffs));
    } catch (e) {
      return reject(new CompareJsonResult(false, e.message));
    }
  });
};

//we form string representation of a path, consisting of elms of an array
export const form_path = (list: Array<string>): string => {
  let result = '';

  list.forEach((e) => {
    result += `${e},`;
  });

  return result.slice(0, -1); //remove last "'" character
};

export const check_get = function (url: string, callback: CallbackInPromiseInterface) {
  return new Promise((resolve, reject) => {
    request
      .get(url)
      .send()
      .end((err: Error, res: object) => {
        if (err)
          return reject(err);
        else {
          callback(res, resolve, reject);
        }
      });
  });
};


export const generate_user_data = () => {
  let date_now = Date.now();
  return {
    username: `usr_${date_now}`,
    firstname: "Peter",
    lastname: "Petrov",
    email: `email_${date_now}@gmail.com`,
    realmRoles: "testrole",
    emailVerified: true,
    clientRoles: "testrole",
    additionalInfo: {
      redirect_uri: config.keycloak.verify_email_redirect_uri
    }
  };
};

export const delay = function (duration: number) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      resolve();
    }, duration)
  });
};

