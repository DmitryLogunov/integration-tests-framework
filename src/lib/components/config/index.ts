import _ from 'lodash';
import * as logger  from '../logger';
import stackTrace from 'stack-trace';
import * as schema  from '../schema';
import * as config  from '../config';
import * as dlpService  from '../dlpService';
import { MessageCategory } from '../messages';
import uuidv4 from 'uuid/v4';
import axios from 'axios';


interface LocalConfig {
  service_name: string
  version: string
  maintainer: string
  capabilities?: string
}


/**
 * Get config from Consul (using HTTP request)
 *
 * @assign global.config
 * @returns null
 */
async function getConfigFromConsul() {
  try {
    const getConfigRequest = {
      header: dlpService.getMessageHeader(MessageCategory.ADMIN_QUERY, 'get-config', uuidv4())
    };

    const res = await axios.post(`http://${process.env.CONFIG_SERVICE_HOST}/getConfig`, getConfigRequest);

    if (schema.validate(res.data, 'config')) {
      if (res.data.body.service_uuid === global.uuid) {
        global.config = res.data.body.config;
     //   logger.info('Config has been loaded', {config: global.config});
        return global.config;
      }
    } else {
      logger.error("Config failed schema validation", {res}, stackTrace.get());
      throw new Error('RESPONSE_CONFIG_NOT_VALID');
    }

  } catch (error) {
    logger.error("Error: failed to retrieve config", {error: error.message}, stackTrace.get());
    throw new Error("Config has not been loaded");
  }
};

interface KeyPair {
  key: string
  value: string
}


/**
 * Get config from global.config by key
 *
 * @returns config's value
 */
function getConfigByKey(key: string) {
  try {
    // TODO: _.find return value is interpreted wrong
    const keyPair: KeyPair = <any>_.find(global.config, (o: KeyPair) => o.key === key);
    if (typeof keyPair === 'undefined') {
      return;
    }

    try {
      const jsonValue = JSON.parse(keyPair.value);
      if (typeof jsonValue === 'object') {
        return jsonValue;
      }
    } catch (e) {
    }

    return keyPair.value;
  } catch (e) {
    logger.error(e, {}, stackTrace.get());
  }
}

export {
  LocalConfig,
  getConfigFromConsul,
  getConfigByKey
};
