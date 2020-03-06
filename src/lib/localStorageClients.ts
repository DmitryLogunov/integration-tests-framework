import {config} from "../tests/lib/helpers/config";
import _ from 'lodash';
import uniqid from 'uniqid';
import fs from 'fs';
import {promisify} from 'util';
import mkdirp  from 'mkdirp';
import getenv from 'getenv';
import * as kafka from './components/kafka';
import {messaging} from 'dlp-service-components';
import * as logger from './components/logger';
import stackTrace from 'stack-trace';

const writeFile = promisify(fs.writeFile);
const mkSubDir = promisify(mkdirp);



/**
 * consumeTopicAndSaveMessagesToFiles(topic, pathToKafkaMessagesStorage)  - consuming to topic and saving all messages to file
 *
 * @param {String} topic
 * @param {String} pathToMessagesStorage
 * @param {String} mq - messages queue client ('kafka', 'nats' or 'all')
 */
export const consumeTopicAndSaveMessagesToFiles = async(topic: string, pathToMessagesStorage: string, mq: string) => {
  if (typeof topic === 'undefined') {
    logger.warn("Couldn't create topic counsumer: topic is undefined");
    return;
  }

  if (typeof mq === 'undefined') {
    mq = 'all';
  }

  if (mq === 'kafka' || mq === 'all') {
    const consumer = await kafka.getConsumer(topic);

    if (typeof consumer === 'undefined') {
      logger.warn("Couldn't add event handler to kafka consumer: counsumer is undefined", {topic});
      return;
    }

    consumer.on('message', async(message: MessageInterface) => {
      try {
        logger.info("Local kafka storage consumer: the message has been recieved", {topic, message: message.value }, stackTrace.get());

        const parsedMessage = JSON.parse(message.value.toString());
        const flowID = parsedMessage.header.flow_id;

        await mkSubDir(`${pathToMessagesStorage}/kafka/${topic}/${flowID}`);
        const filename = uniqid();
        const pathToFile = `${pathToMessagesStorage}/kafka/${topic}/${flowID}/${filename}.msg`;

        await writeFile(pathToFile, JSON.stringify(parsedMessage), 'utf8');
      } catch (err) {
        logger.error("Error: Local kafka storage consumer: recieved message hasn't been saved", { topic, message: message.value }, stackTrace.get());
      }
    });
  }

  if (mq === 'nats' || mq === 'all') {
    const natsServer = process.env.NATS_SERVER !== '' ? process.env.NATS_SERVER : null;
    const natsToken = process.env.NATS_TOKEN !== '' ? process.env.NATS_TOKEN : null;

    const messagingOptions = {
      provider: 'nats',
      kafka: { brokers: getenv('KAFKA_BROKERS', '') },
      nats: { server: natsServer, token: natsToken }
    };
    const natsClient = messaging.getClient(messagingOptions);

    natsClient.subscribe(topic, async (message: MessageInterface) => {
      try {
        logger.info("Local nats storage consumer: the message has been recieved", {topic, message}, stackTrace.get());

        const parsedMessage = JSON.parse(message.toString());
        const flowID = parsedMessage.header.flow_id;

        await mkSubDir(`${pathToMessagesStorage}/nats/${topic}/${flowID}`);
        const filename = uniqid();
        const pathToFile = `${pathToMessagesStorage}/nats/${topic}/${flowID}/${filename}.msg`;

        await writeFile(pathToFile, JSON.stringify(parsedMessage), 'utf8');
      } catch (err) {
        logger.error("Error: Local nats storage consumer: recieved message hasn't been saved", { topic, message }, stackTrace.get());
      }
    })
  }
}

/**
 * Publishes message in kafka topic
 *
 * @param message
 * @param topic
 * @returns null
 */
export const publishMessage = kafka.publishMessage;
