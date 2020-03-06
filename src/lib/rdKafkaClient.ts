import rdkafka from 'node-rdkafka';
import fs from 'fs';
import {promisify} from 'util';
import mkdirp from 'mkdirp';
import uniqid from 'uniqid';

import * as logger from './components/logger';
import stackTrace from 'stack-trace';

import _ from 'lodash';

const writeFile = promisify(fs.writeFile);
const mkSubDir = promisify(mkdirp);

/**
 * @class RDKafkaClient - implements methods for 'node-rdkafka' api
 *
 */
export default class RDKafkaClient {
  private consumer: rdkafka.KafkaConsumer;
  private producer: rdkafka.Producer;
  private messages: any;

  constructor(brokers: string) {
    this.consumer = new rdkafka.KafkaConsumer({
      'group.id': 'kafka',
      'metadata.broker.list': brokers
    }, {});

    this.producer = new rdkafka.Producer({
      'metadata.broker.list': brokers
    }, {});

    this.consumer.connect();
    this.producer.connect();

    this.messages = {};
  }

  /**
   * Returns consumer
   */
  getConcumer() {
    return this.consumer;
  }

  /**
   * Return producer
   */
  getProducer() {
    return this.producer;
  }

  /**
   * Disconnect with consumer and producer
   */
  close() {
    this.consumer.unsubscribe();
    this.consumer.disconnect();
    this.producer.disconnect();
  }

  /**
   * produceMessage() - produces mesage into kafka topic
   *
   * @param {String} topic
   * @param {Object} message
   */
  produceMessage(topic: string, message: object) {
    this.producer.on('ready', () => {
      try {
        this.producer.produce(topic, null, new Buffer(JSON.stringify(message)));
      } catch (err) {
        console.error('A problem occurred when sending the message');
        console.error(err);
      }
    });
  }

  /**
   *
   * @param topic
   * @param action
   * @param additional
   */
  consumeTopicAndTakeAction(topic: string, action: ConsumeTopicActionfInterface, callback: CallbackInterface) {
    logger.info('Creating rdKafka consumer', {topic}, stackTrace.get());

    this.consumer
      .on('ready', () => {
        logger.info('Subscribe to topic (rdKafka consumer)', {topic}, stackTrace.get());

        this.consumer.subscribe([topic]);
        this.consumer.consume();
      })
      .on('data', (data) => {
        logger.info('Receive message on topic ', {topic}, stackTrace.get());

        if (!_.has(this.messages, topic)) {
          this.messages[topic] = [];
        }
        const parsedMessage = JSON.parse(data.value.toString());
        this.messages[topic].push(parsedMessage);

        action(data, this.producer, callback);
      })
      .on('event.error', (err: Error) => {
        logger.error("Error: rdKafka consumer event error ", {topic, error: err.message}, stackTrace.get());
      });
  }

  /**
   *
   * @param topic
   */
  consumeTopic(topic: string) {
    console.log('Creating consumer for ' + topic);

    this.consumer
      .on('ready', () => {
        console.log('Subscribe to topic ' + topic);
        this.consumer.subscribe([topic]);
        this.consumer.consume();
      })
      .on('data', (data) => {
        console.log('Receive message on topic ' + topic);

        if (!_.has(this.messages, topic)) {
          this.messages[topic] = [];
        }

        const parsedMessage = JSON.parse(data.value.toString());
        this.messages[topic].push(parsedMessage);
      })
      .on('event.error', (err) => {
        console.error(err);
      });
  }

  /**
   *
   * @param topic
   * @param pathToFile
   */
  consumeTopicAndSaveToFile(topic: string, pathToKafkaMessagesStorage: string) {
    console.log('Creating consumer for ' + topic);

    this.consumer
      .on('ready', () => {
        console.log('Subscribe to topic ' + topic);
        this.consumer.subscribe([topic]);
        this.consumer.consume();
      })
      .on('data', async (data) => {
        logger.info('Message has received on topic', {topic}, stackTrace.get());

        if (!_.has(this.messages, topic)) {
          this.messages[topic] = [];
        }

        const parsedMessage = JSON.parse(data.value.toString());
        this.messages[topic].push(parsedMessage);

        const flowID = parsedMessage.header.flow_id;

        await mkSubDir(`${pathToKafkaMessagesStorage}/${topic}/${flowID}`);
        const filename = uniqid();
        const pathToFile = `${pathToKafkaMessagesStorage}/${topic}/${flowID}/${filename}.msg`;

        await writeFile(pathToFile, JSON.stringify(parsedMessage), 'utf8');
      })
      .on('event.error', (err) => {
        console.error(err);
      });
  }

  /**
   * @param topic
   */
  getTopicMessages(topic: string) {
    if (!_.has(this.messages, topic)) return [];
    return this.messages[topic];
  }
};

