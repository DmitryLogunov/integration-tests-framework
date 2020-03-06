import kafka, {ConsumerGroup} from 'kafka-node';
import * as logger from '../logger';
import stackTrace from 'stack-trace';
import uniqid from 'uniqid';
import _ from 'lodash';
import {Message} from '../messages';


// TODO: ConsumerOptions declaration from kafka-node is not up to date
interface ConsumerOptions {
  kafkaHost?: string
  groupId: string
  sessionTimeout?: number,
  protocol?: Array<"roundrobin" | "range">,
  asyncPush?: boolean,
  id?: string,
  fromOffset: "latest" | "earliest" | "none"
}


/**
 * Gets kafka consumer using group mode
 *
 * @param topics
 * @param groupID - otpional, group ID if consumer should be a pert of group
 * @returns {Promise}
 */
function _getGroupConsumer(topics: string | Array<string>, groupId: string): Promise<any> {
  return new Promise(async (resolve, reject) => {
    if (typeof topics === 'string') {
      topics = [topics];
    }

    const consumerOptions: ConsumerOptions = {
      kafkaHost: process.env.KAFKA_BROKERS,
      groupId,
      protocol: ['roundrobin'],
      fromOffset: 'latest'
    };

    logger.info("Group consumer options", {consumerOptions}, stackTrace.get());

    try {
      logger.info("New group consumer", {topics, groupId}, stackTrace.get());
      let groupConsumer = new ConsumerGroup(consumerOptions, topics);

      process.once('SIGINT', () => {
        groupConsumer.close(true, () => {
          logger.info("Closing the kafka consumer", {topics}, stackTrace.get());
        });
      });

      resolve(groupConsumer);

    } catch (error) {
      logger.error("Could not create kafka consumer", {error}, stackTrace.get());
      reject(error);
    }
  });
}

/**
 * Gets kafka consumer (sets groupID in unique value if it not exists)
 *
 * @param topics
 * @param groupID - otpional, group ID if consumer should be a part of group
 * @returns {Promise}
 */
async function getConsumer(topics: string | Array<string>, groupId?: string): Promise<any> {
  try {
    if (typeof topics === 'string') {
      topics = [topics];
    }
    groupId = groupId || global.uuid || uniqid();

    await createTopicIfNotExists(topics);

    return _getGroupConsumer(topics, groupId);
  } catch (error) {
    logger.error("Error with creating kafka consumer", {error: error.message, topics}, stackTrace.get());
  }

  return Promise.reject();
}

interface Handlers {
  onMessage: Function
  onError: Function
  onConnect: Function
}


/**
 * Create consumer and add handlers
 *
 * @param topics
 * @param handles - Object {onMessage, onErrors, onConnect}
 * @param groupID - groups's ID
 * @returns {Promise}
 */
async function createConsumerAndAddHandlers(topics: string | Array<string>, handlers: Handlers, groupId: string) {
  if (typeof topics === 'string') {
    topics = [topics];
  }
  groupId = groupId || global.uuid || uniqid();

  const onMessage = async (message: string) => {
    if (_.has(handlers, 'onMessage')) {
      await handlers.onMessage(message);
      return;
    }
    logger.info("Received a message from a group topic", {topics, message}, stackTrace.get());
  };

  const onError = async (error: string) => {
    if (_.has(handlers, 'onError')) {
      await handlers.onError(error);
      return;
    }
    logger.error("Consumer creation failed", {topics, error}, stackTrace.get());
  };

  const onConnect = async () => {
    if (_.has(handlers, 'onConnect')) {
      await handlers.onConnect();
      return;
    }
    logger.info("Group consumer has been created", {topics, groupId}, stackTrace.get());
  };

  try {
    const consumer = await getConsumer(topics, groupId);

    consumer.on('connect', onConnect);
    consumer.on('message', onMessage);
    consumer.on('error', onError);

  } catch (error) {
    logger.error("Could not create kafka consumer", {error: error.message, topics}, stackTrace.get());
  }
}


/**
 * Creates kafka topics
 *
 * @param {string} | {Array} topics - topic name
 * @returns {Promise}
 */
function createTopicIfNotExists(topics: string | Array<string>): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof topics === 'string') {
        topics = [topics];
      }

      const client = new kafka.KafkaClient({kafkaHost: (process.env.KAFKA_BROKERS || 'kafka:9092').replace(/ /g, ',')});

      // TODO: KafkaClient declaration is not up to date
      (<any>client).createTopics(topics, true, (err: string, data: string) => {
        logger.info("Kafka topic has been created", {topics, data}, stackTrace.get());
        resolve(data);
      });
    } catch (error) {
      logger.error("Error with creating kafka topic", {error: error.message, topics}, stackTrace.get());
      reject(error);
    }
  });
}

/**
 * Publishes message in kafka topic
 *
 * @param message
 * @param topic
 * @returns null
 */
function publishMessage(topic: string, message: Message) {
  const Producer = kafka.Producer;
  const client = new kafka.KafkaClient({kafkaHost: (process.env.KAFKA_BROKERS || 'kafka:9092').replace(/ /g, ',')});
  const producer = new Producer(client);

  const errorHandler = (err: Error) => {
    if (err) {
      logger.error("Error with publishing message to kafka topic", {
        error: err.message,
        topic,
        message
      }, stackTrace.get());
    }
  };

  producer.on('ready', () => {
    producer.send([{topic, messages: JSON.stringify(message)}], errorHandler);
  });

  producer.on('error', errorHandler);

}

/**
 * Gets last message from kafka topic
 *
 * @param message
 * @param topic
 * @returns null
 */
function getLastMessage(topic: string): Promise<any> {
  return new Promise(async (resolve, reject) => {
    try {
      const consumer = await getConsumer(topic);
      consumer.on('message', (message: string) => {
        resolve(message);
      });
      consumer.on('error', (error: string) => {
        reject(error);
      });
    } catch (error) {
      logger.error("Could not get last message from topic", {error, topic}, stackTrace.get());
      reject(error);
    }
  });
}

export {
  getConsumer,
  publishMessage,
  getLastMessage,
  createConsumerAndAddHandlers,
  createTopicIfNotExists
};
