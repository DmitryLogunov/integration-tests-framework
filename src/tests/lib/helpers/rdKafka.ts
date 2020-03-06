import * as logger from '../../../lib/components/logger';
import stackTrace from 'stack-trace';
import getenv from 'getenv';
import RDKafkaClient from '../../../lib/rdKafkaClient';
import fs from 'fs';
import {promisify} from 'util';

import _ from 'lodash';

const readFile = promisify(fs.readFile);
const readDir = promisify(fs.readdir);

/**
 * produceMessageAndCounsumeAnswers() - produces message to kafka topic and get messages form topicEmit
 *
 */
export const rdKafkaProduceMessageAndCounsumeAnswers =
  (message: object, topic: string, topicEmit: string, delayOfListeningEmitMessages: number) => {

    return new Promise(async (resolve, reject) => {
      logger.info(" Producing message into topic and get answers from topic_emit",
        {message, topic, topicEmit, delayOfListeningEmitMessages}, stackTrace.get());

      try {
        const rdkafka = new RDKafkaClient(getenv('KAFKA_BROKERS'));

        await rdkafka.consumeTopic(topicEmit);
        await rdkafka.produceMessage(topic, message);
        setTimeout(() => {
          rdkafka.close();
          resolve(rdkafka.getTopicMessages(topicEmit));
        }, 2000);

      } catch (error) {
        return reject(error);
      }
    });
  };

/**
 * produceMessageAndCounsumeAnswers() - produces message to kafka topic and get messages form topicEmit
 */
export const rdKafkaProduceMessage = (message: object, topic: string) => {
  return new Promise(async (resolve, reject) => {
    logger.info(" Producing message into topic", {message, topic}, stackTrace.get());

    try {
      const rdkafka = new RDKafkaClient(getenv('KAFKA_BROKERS'));

      await rdkafka.produceMessage(topic, message);
      setTimeout(() => {
        rdkafka.close();
        resolve();
      }, 2000);

    } catch (error) {
      return reject(error);
    }
  });
};

