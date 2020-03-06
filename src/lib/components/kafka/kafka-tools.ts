import kafka from 'kafka-node';
import * as logger from '../logger';
import stackTrace from 'stack-trace';
import _ from 'lodash';


/**
 * @returns Promise with metadata results
 */
function getMetedata(): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const client = new kafka.KafkaClient({kafkaHost: process.env.KAFKA_BROKERS});

    (<any>client).once('connect', () => {
      (<any>client).loadMetadataForTopics([], (error: string, results: Array<object>) => {
        if (error) {
          logger.error("Error with getting the list of all topics", {error}, stackTrace.get());
          reject(error);
        }
        resolve((<any>results[1]).metadata); // TODO: review the results type
      });
    });
  });
}


/**
 * @param topic
 * @returns Promise with list of topics
 */
async function getListTopics(): Promise<any> {
  const metadata = await getMetedata();
  const listTopics = _.mapValues(metadata, (value: object) => {
    return parseInt(_.last(_.keys(value)), 0);
  });

  return <any>listTopics;
}


/**
 * Checks if kafka topic created
 *
 * @param topic
 * @returns Integer, partition number
 */
async function isTopicCreated(topic: string): Promise<boolean> {
  const listTopics = await getListTopics();

  return _.has(listTopics, topic);
}


/**
 * @param topic
 * @param partition
 * @returns {Promise}
 */
function getSingleConsumer(topic: string, partition: number): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const client = new kafka.KafkaClient(<any>{
      kafkaHost: (process.env.KAFKA_BROKERS || 'kafka:9092').replace(/ /g, ','),
      idleConnection: 10 // TODO: check why this field is absent in the type
    });

    const consumer = new kafka.Consumer(client, [], {fromOffset: true});
    const offset = new kafka.Offset(client);

    /**
     * Get the latest offset available in config topic
     */
    const latestOffset = await (
      () => {
        return new Promise((resolve, reject) => {
          offset.fetch([{topic, partition, time: -1}], (err: Error, data: any) => {
            if (err) {
              logger.error("Error of kafka consumer with fetching latest offset", {error: err.message}, stackTrace.get());
              reject();
            }
            if (data !== undefined) {
              resolve(data[topic][partition][0]);
            }
          });
        });
      })();

    consumer.on('error', function (err: Error) {
      logger.error("Error of kafka consumer", {error: err.message}, stackTrace.get());
      reject();
    });

    consumer.addTopics(
      <any>[{topic, partition, offset: latestOffset}], // TODO: check why this does not match with the type
      (err: string) => {
        if (err) {
          logger.error(err, {}, stackTrace.get());
          reject();
        } else {
          resolve(consumer);
        }
      },
      true
    );
  });
}

export {
  getMetedata,
  getListTopics,
  getSingleConsumer,
  isTopicCreated
};
