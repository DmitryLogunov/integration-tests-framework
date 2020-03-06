import * as config from './lib/components/config';
import * as subscriptions from './lib/components/subscriptions/kafka';
import * as logger from './lib/components/logger';
import stackTrace from 'stack-trace';

import uniqid from 'uniqid';
import getenv from 'getenv';
import path from 'path';

import {buildFeatures, checkConfigData, loadLocalConfig, startTerminus} from './lib/server';
import {startLocalStorage} from './lib/localStorage';
import app from './app';

process.env.KAFKA_BROKERS = getenv('KAFKA_BROKERS', '');
process.env.NATS_SERVER = getenv('NATS_SERVER', '');
process.env.NATS_TOKEN = getenv('NATS_TOKEN', '');

/**
 * Application server
 *
 * @returns null
 */
const startServer = async () => {
  try {
    /* Load configs  */
    checkConfigData(); // set timeout to check config

    const localConfig = await loadLocalConfig();
    if (!localConfig) {
      logger.error("Service cannot continue to work so will be terminated.");
      process.exit(1);
    }

    global.uuid = localConfig.service_name + '_' + uniqid();
    global.service_name = localConfig.service_name;

    await config.getConfigFromConsul();

    /* Halo and Logflush suscriptions */
    subscriptions.logflush();
    subscriptions.halo();

    /* Start Local Kafka Storage: Consume topics and save messages */
    const localStorageConfigPath = path.resolve(__dirname + '/tests/config/localStorage.yml');
    await startLocalStorage(localStorageConfigPath);

    /* Build features*/
    await buildFeatures();

    /* Start terminus server */
    startTerminus(app);
    logger.info('Starting Tests service...!', {}, stackTrace.get());

  } catch (e) {
    logger.error('Handled error in Tests service Server. Service cannot continue to work so will be terminated.', {error: e.message}, stackTrace.get());
    process.exit(1);
  }
};

//***************** START SERVER ********************/

startServer();

