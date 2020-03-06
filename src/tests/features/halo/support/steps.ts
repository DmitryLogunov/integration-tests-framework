import {BeforeAll, setWorldConstructor, When} from 'cucumber';
import path from 'path';
import * as logger from '../../../../lib/components/logger';
import {messaging} from 'dlp-service-components';
import * as _ from 'lodash';
import {expect} from 'chai';
import fs from 'fs';
import uniqid from 'uniqid';
import {promisify} from 'util';
import getenv from 'getenv';

// TODO: fix problem with producing message to kafka toppic using kafka-node client => inpossible to close producer.
//const {publishMessage} = require(mainLibPath + '/kafkaNodeClient');
import {rdKafkaProduceMessage} from '../../../lib/helpers/rdKafka';
import {getTopicMessagesFromLocalStorage} from '../../../../lib/localStorage';
import {Message} from 'lib/components/messages';

const readFile = promisify(fs.readFile);

import {HaloCustomWorld} from "./world";

const fixturesPath = path.join(__dirname, '..', 'data');
const haloTopic = 'halo';
const haloEmitTopic = 'halo_emit';

const HALO_EMIT_WAITING_PERIOD = 1500;

let haloEmitMessages: Array<Message> = [];

/* Send halo message to kafka 'halo' topic */
BeforeAll(() => {
  return new Promise(async (resolve, reject) => {
    try {
      setWorldConstructor(HaloCustomWorld);

      const haloMessage = JSON.parse(await readFile(`${fixturesPath}/halo.json`, 'utf-8'));
      haloMessage.header.flow_id = 'dlp-service-tests_' + uniqid();

      // Messages queue client options
      const haloWorld = new HaloCustomWorld();
      const mqProvider = await haloWorld.getMqProvider();
      const messagingOptions = {
        provider: mqProvider,
        kafka: { brokers: getenv('KAFKA_BROKERS', '') },
        nats: { server: getenv('NATS_SERVER', ''), token: getenv('NATS_TOKEN', '') }
      };
      const messagingClient = messaging.getClient(messagingOptions);

      messagingClient.publish(haloTopic, haloMessage);

      setTimeout(async () => {
        haloEmitMessages =
          await getTopicMessagesFromLocalStorage(haloEmitTopic, haloMessage.header.flow_id, mqProvider);
        resolve();
      }, HALO_EMIT_WAITING_PERIOD);
    } catch (error) {
      logger.error("ERROR: HALO_EMIT_MESSAGES have not been got");
      return reject(error);
    }
  });
});


/* Check halo_emit responses */
When(/^each service should send message to halo_emit: (.*)$/, (serviceName: string) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const wantedService =
          _.find(haloEmitMessages, (haloEmitMessage: Message) => {
            return haloEmitMessage.header.service_name === serviceName;
          });
        expect(typeof wantedService).to.not.eql('undefined');
        resolve(true);
      } catch (error) {
        expect(error).to.eql(null);
        return reject(`Error: halo_emit message has not got for ${serviceName}`);
      }
      return reject(`Error: halo_emit message has not got for ${serviceName}`);
    }, 2*HALO_EMIT_WAITING_PERIOD);
  });
});


