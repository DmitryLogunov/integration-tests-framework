import * as logger from '../logger';
import * as config from '../config';
import {subscribe} from '../nats';


function logflush() {
  const logFlushTopic = config.getConfigByKey('kafka/topics/topic/admin/logflush') || 'logflush';

  subscribe(logFlushTopic, function (message: string) {
    logger.info('Received Logflush message in NATS network', {message});
  });
}

function halo() {
  const haloTopic = config.getConfigByKey('kafka/topics/topic/admin/halo') || 'halo';

  subscribe(haloTopic, function (message: string) {
    logger.info('Received HALO message in NATS network', {message});
  });
}

export {
  logflush,
  halo
};

