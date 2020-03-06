import * as config from './components/config';
import {formatKVPS, getFromConsul} from './components/consul';
import {consumeTopicAndSaveMessagesToFiles} from './localStorageClients';
import path from 'path';
import yaml from 'node-yaml';
import fs from 'fs';
import {promisify} from 'util';
import _ from 'lodash';

import * as logger from './components/logger';
import stackTrace from 'stack-trace';
import {Message} from "./components/messages";
import {TopicParams} from "../common.types";

const readFile = promisify(fs.readFile);
const readDir = promisify(fs.readdir);

const localStoragePath = path.resolve(__dirname + '/../data/storage');

/**
 * getTopicsList(pathToConfig) - returns the topics list
 *
 * @param {String} pathToStorageConfig - absolute path to YAML config with kafka topics list *
 * @return {Array<String>} - list kafka topics
 */
const getTopicsList = async (pathToStorageConfig: string): Promise<Array<string>> => {
  try {
    if (!fs.existsSync(pathToStorageConfig)) {
      logger.error("Local storage storage: Local Storage config file not exists", {pathToStorageConfig}, stackTrace.get());
      return [];
    }

    const storageConfig = await yaml.read(pathToStorageConfig);
    let listTopics: Array<string> = [];

    _.each(storageConfig.kafka.topicsGroups, (topicsGroup: ConfigurationTopicsGroupInterface) => {
      listTopics.push(
        _.map(
          _.map(topicsGroup.topics, (topic: ConsulTopicInteface) => {
            return {path: `${topicsGroup.path}/${topic.name}`, defaultValue: topic.default_value};
          }),
          (topicParams: TopicParams) => {
            const topicFromConfig = config.getConfigByKey(topicParams.path);

            if (topicFromConfig) {
              return topicFromConfig;
            }
            if (topicParams.defaultValue) {
              return topicParams.defaultValue;
            }
            return;
          })
      );
    });

    return _.flatten(listTopics);

  } catch (error) {
    logger.error("Local storage: unpossible to read Local Storage config file", {
      error: error.message,
      pathToStorageConfig
    }, stackTrace.get());
    return [];
  }
};

/**
 * startLocalStorage(pathToConfig) - consume topics and save messages to Local Kafka Storage
 *
 * @param {String} pathToConfig - absolute path to YAML config with kafka topics list
 * @param {String} mq - messages queue client ('kafka', 'nats' or 'all')
 */

export const startLocalStorage = async (pathToConfig: string, mq: string): Promise<void> => {
  let listTopics =  await getTopicsList(pathToConfig);

  logger.info("Local storage: list topics to consume", { listTopics }, stackTrace.get());

  _.each(listTopics, (topic: string) =>{
    consumeTopicAndSaveMessagesToFiles(topic, localStoragePath, mq);
  });
};

/**
 *  getTopicMessagesFromLocalStorage(topic, flowID) - return all massages of topic and flowID from Local Kafka Storage
 *
 *  @param {String} topic
 *  @param {String} flowID
 *  @param {String} mq - messages queue client ('kafka' or 'nats')
 *
 *  @return {Array<Object>} - messages array
 */
export const getTopicMessagesFromLocalStorage = async(topic: string, flowID: string, mq: string): Promise<Array<Message>> => {
  if (!mq || ( mq !== 'kafka' && mq !== 'nats')) return;

  const pathFlowIDMessages = `${localStoragePath}/${mq}/${topic}/${flowID}`;

  if (! (fs.existsSync(pathFlowIDMessages) && fs.lstatSync(pathFlowIDMessages).isDirectory()) ) {
    logger.info("Local storage: there are no messages in topic with flowID", {mq, topic, flowID}, stackTrace.get());
    return [];
  }

  let messages: Array<Message> = [];
  const messagesFiles = await readDir(pathFlowIDMessages);

  if (_.isEmpty(messagesFiles)) {
    logger.info("Local kafka storage: there are no messages in topic with flowID", {topic, flowID}, stackTrace.get());
    return [];
  }

  await Promise.all(
    _.map(messagesFiles, async(messageFile: string) => {
        const message = await readFile(`${pathFlowIDMessages}/${messageFile}`, 'utf8');
        logger.info("Local storage: message in topic with flowID has been read", {mq, topic, flowID, message}, stackTrace.get());
        try {
          const parsedMessage = JSON.parse(message);
          messages.push(parsedMessage);
        } catch (error) {
          logger.info("Local storage: couldn't parse message", {mq, topic, flowID, message}, stackTrace.get());
        }
      })
    );

  return messages;
};

/**
 * It checks if consul-key of topic exists in Consul. It returns topic name value from Consul if exists and default value if not.
 *
 * @param {string} topicKey
 * @returns {string}
 */
export const getTopic = async (pathToStorageConfig: string, topicKeyName: string): string|null => {
  try {
    if (!fs.existsSync(pathToStorageConfig)) {
      logger.error("Local kafka storage: Local Storage config file not exists", {pathToStorageConfig}, stackTrace.get());
      return null;
    }

    const storageConfig = await yaml.read(pathToStorageConfig);
    let topicParams: TopicParams | null = null;

    _.each(storageConfig.kafka.topicsGroups, (topicsGroup: ConfigurationTopicsGroupInterface) => {
      const searchedTopicInGroup = _.find(topicsGroup.topics, (topic: ConsulTopicInteface) => {
        return topic.name === topicKeyName;
      });

      if (searchedTopicInGroup) {
        topicParams = {
          path: `${topicsGroup.path}/${searchedTopicInGroup.name}`,
          defaultValue: searchedTopicInGroup.default_value
        };
        return false;
      }
    });

    if (!topicParams) {
      return null;
    }

    const topicFromConfig: string = formatKVPS(await getFromConsul(topicParams.path));

    if (!_.isEmpty(topicFromConfig) &&
      topicFromConfig.length > 0 &&
      typeof topicFromConfig[0] === 'object' &&
      _.has(topicFromConfig[0], 'value')) return topicFromConfig[0].value;

    if (!_.isEmpty(topicParams) && _.has(topicParams, 'defaultValue')) {
      return topicParams.defaultValue;
    }

    return null;
  } catch (error) {
    logger.error("Local storage storage: unpossible to read Local Storage config file", {
      error: error.message,
      pathToStorageConfig
    }, stackTrace.get());

    return null;
  }
};
