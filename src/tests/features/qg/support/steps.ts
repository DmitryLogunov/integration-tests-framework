import {messaging} from 'dlp-service-components';

import {setWorldConstructor, Then, When, BeforeAll} from 'cucumber';
import path from 'path';
import {assert, expect} from 'chai';
import uniqid from 'uniqid';
import fs from 'fs';
import {promisify} from 'util';
import * as logger from '../../../../lib/components/logger';
import {config} from '../../../lib/helpers/config';
import {sendQuery} from '../../../lib/helpers/query';
import {getAccessToken} from '../../../lib/helpers/command';
import {ApolloSubscriber} from '../../../lib/helpers/apollo';
import {delay} from "../../../lib/helpers/lib";
import {clearInterval} from "timers";
import Timer = NodeJS.Timer;
import {subscribeHalo} from '../../../lib/helpers/apollo';
import {QGCustomWorld} from "./world";
import getenv from 'getenv';

const readFile = promisify(fs.readFile);

const fixturesPath: string = path.join(__dirname, '..', 'data');

const WAITING_PERIOD = 5000;

BeforeAll(() =>{
  setWorldConstructor(QGCustomWorld);
});

When('make query using wrong auth token', {timeout: config.timeouts.generic_test * 1000}, function () {
  return new Promise(async (resolve, reject) => {
    try {
      await sendQuery('{scheduledCommands {cronetask}}', 'token');
    } catch (e) {
      try {
        expect(e.message).to.eql('Request failed with status code 403');
      } catch (e) {
        return reject(e.message);
      }
      resolve();
    }
    return reject('No 403 response as expected');
  });
});

When('make wrong query', {timeout: config.timeouts.generic_test * 1000}, function () {
  return new Promise(async (resolve, reject) => {
    try {
      const accessToken = await getAccessToken();
      await sendQuery('{someData {someResult}}', accessToken);
    } catch (e) {
      try {
        expect(e.response.status).to.eql(400, 'response code');
      } catch (e) {
        return reject(e.message);
      }
      resolve();
    }
    return reject('No 400 response as expected');
  });
});


When('make valid query', {timeout: config.timeouts.generic_test * 1000}, function () {
  return new Promise(async (resolve, reject) => {
    try {
      const accessToken = await getAccessToken();
      const response = await sendQuery('{scheduledCommands {cronetask}}', accessToken);

      expect(response.status).to.eql(200);
      resolve();
    } catch (e) {
      return reject(e.message);
    }
  });
});

const responses: ServiceResponse = {};
const subscriber = new ApolloSubscriber();

function resolveHalo(service: string) {
  responses[service] = true;
}

When('send halo and subscribe to halo_emit', {timeout: config.timeouts.generic_test * 1000}, function () {
  return new Promise(async (resolve, reject) => {
    try {
      const subscrPromises: Array<Promise<{}>> = [];

      for (const service of Object.keys(config.services)) {
        const name = config.services[service].name;
        responses[name] = false;
        subscrPromises.push(subscriber.subscribeHalo(name, resolveHalo));
      }
      await Promise.all(subscrPromises);
      await delay(1000);

      const haloMessage = JSON.parse(await readFile(`${fixturesPath}/halo.json`, 'utf-8'));
      haloMessage.header.flow_id = 'dlp-service-tests_' + uniqid();


      // Messages queue client options

      const mqProvider = await this.getMqProvider();
      const messagingOptions = {
        provider: mqProvider,
        kafka: { brokers: getenv('KAFKA_BROKERS', '') },
        nats: { server: getenv('NATS_SERVER', ''), token: getenv('NATS_TOKEN', '') }
      };
      const messagingClient = messaging.getClient(messagingOptions);

      messagingClient.publish('halo', haloMessage);

      resolve();
    } catch (e) {
      return reject(e.message);
    }
  });
});

let interval: Timer, timer: Timer;

function checkResp () {
  const noResp: Array<string> = [];
  for (const service in responses) {
    if (!responses[service]) {
      noResp.push(service);
    }
  }
  return noResp;
}

function finished () {
  clearTimeout(timer);
  clearInterval(interval);
  subscriber.close();
}

Then('should receive halo_emit from all services', {timeout: config.timeouts.generic_test * 1000}, function () {
  return new Promise(async (resolve, reject) => {
    try {
      interval = setInterval(async () => {
        const noResp: Array<string> = checkResp();
        if (noResp.length === 0) {
          resolve();
          finished();
        }
      }, 200);

      timer = setTimeout(async () => {
        const noResp: Array<string> = checkResp();
        if (noResp.length > 0) {
          reject(`Some services didn't respond: ${noResp.join(', ')}`);
        } else {
          resolve();
        }

        finished();

      }, WAITING_PERIOD);

    } catch (e) {
      return reject(e.message);
    }
  });
});
