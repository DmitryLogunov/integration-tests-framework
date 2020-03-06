import * as logger from '../logger/index';
import stackTrace from 'stack-trace';

import getenv from 'getenv';
import fs from 'fs';
import {promisify} from 'util';

import _ from 'lodash';

const readFile = promisify(fs.readFile);
const readDir = promisify(fs.readdir);

const consul = require('consul')({
  host: getenv('CONSUL_HOST', 'localhost'),
  port: getenv('CONSUL_PORT', '8500')
});
const consulKV = consul.kv;

/**
 * Checks Consul health
 *
 * @returns Promise (wich resolve bool)
 */
export const checkHealth = () => {
  return new Promise(async (resolve) => {
    logger.info('Checking if Consul is alive..', {}, stackTrace.get());

    consul.health.state('critical', (err: Error) => {
      if (err) {
        logger.error('Consul is unreachable!', {err}, stackTrace.get());
        resolve(false);
      } else {
        logger.info('Consul is alive!', {}, stackTrace.get());
        resolve(true);
      }
    });
  })
};

/**
 * Sets config from Consul using incoming request
 *
 * @param {Object} data - request object
 * @returns null
 */
export const setToConsul = (data: Array<KeyValuePair>) => {
  const errorHandler =
    (error: Error) => {
      if (error) {
        logger.error('Error setting value', {error: error.message}, stackTrace.get());
      }
    };

  for (let item of data) {
    consulKV.set(item.key.toString(), item.value.toString(), errorHandler);
  }
};


/**
 * Gets value of key from Consul
 *
 * @param {string} path - key string
 * @returns {Promise}
 */
export const getFromConsul = (path: string): Promise<Array<KeyValuePair>> => {
  return new Promise((resolve, reject) => {
    consulKV.get({key: path, recurse: true}, (err: Error, data: Array<KeyValuePair>) => {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
};

/**
 * Builds array with key-values pairs from data object
 *
 * @param {Array} data - list KV pairs
 * @returns {Array}
 */
export const formatKVPS = (data: Array<KeyValuePairFromConsul>): KeyValuePair => {
  const kvData = _.filter(data, (item: KeyValuePairFromConsul) => _.has(item, 'Key') && _.has(item, 'Value'));
  return _.map(kvData, (pair: KeyValuePairFromConsul) => {
    try {
      const jsonValue = JSON.parse(pair.Value);
      if (typeof jsonValue === 'object') {
        return {key: pair.Key, value: jsonValue};
      }
    } catch (e) {
    }

    return {key: pair.Key, value: pair.Value};
  });
};

/**
 * Gets list of child key-pathes
 *
 * @param {string} path - key string
 * @returns {Promise}
 */
export const getChildKeys = (path: string): Promise<Array<string>> => {
  return new Promise(async (resolve, reject) => {
    await consulKV.keys(path, (err: Error, data: Array<string>) => {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
};


/**
 * Delete key-value pair
 *
 * @param {string} path - key string
 * @returns {Promise}
 */
export const deleteKey = (path: string): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    await consulKV.del(path, (err: Error) => {
      if (err) {
        reject(err);
      }
      resolve();
    });
  });
};


/**
 * Delete list key-value pairs
 *
 * @param {string} path - key string
 * @returns {Promise}
 */
export const deleteListKeys = (keys: Array<string>): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      if (_.isEmpty(keys)) {
        resolve();
      }
      for (let i = 0; i < keys.length; i++) {
        await deleteKey(keys[i]);
      }
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};


/**
 * Delete list key-value pairs
 *
 * @param {string} path - key string
 * @returns {Promise}
 */
export const deleteAllChildKeys = (path: string): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      const keys = await getChildKeys(path);
      await deleteListKeys(keys);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};
