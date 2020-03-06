import * as logger from '../logger';
import stackTrace from 'stack-trace';
import * as schema from '../schema';
import * as config from '../config';
import {LocalConfig} from '../config';
import * as dlpService from '../dlpService';
import yaml from 'node-yaml';
import {KafkaMessage, Message, MessageCategory} from '../messages';
import * as kafka from '../kafka';
import * as nats from '../nats';


async function logflush(): Promise<any> {
  const logFlushTopic = config.getConfigByKey('kafka/topics/topic/admin/logflush') || 'logflush';
  const consumer = await kafka.getConsumer(logFlushTopic);

  consumer.on('message', (message: KafkaMessage) => {
    try {
      if (schema.validate(JSON.parse(message.value), 'logflush')) {
        logger.info('LOGFLUSH message', {message: JSON.parse(message.value).body.message}, stackTrace.get());
      }
    } catch (e) {
      logger.error(e, {}, stackTrace.get());
    }
  });

  return consumer;
}

async function halo(localConfig: LocalConfig = <LocalConfig>{}): Promise<any> {
  const haloTopic = config.getConfigByKey('kafka/topics/topic/admin/halo') || 'halo';
  const consumer = await kafka.getConsumer(haloTopic);

  consumer.on('message', async (message: KafkaMessage) => {
    let value;

    try {
      value = JSON.parse(message.value);
    } catch (err) {
      logger.error("Kafka message JSON syntax error", {message: message.value}, stackTrace.get());
      return;
    }

    if (value.header.action !== "halo") {
      return; // not a halo message
    }

    if (process.env.NATS_ENABLED) {
      nats.publish(haloTopic, message.value);  // TODO: temp solution to test NATS
    }

    try {
      if (schema.validate(value, 'halo')) {

        if (!localConfig) {
          localConfig = await yaml.read('../../../config.yml');
        }
        const messageHeader = value.header;

        const haloEmit: Message = {
          header: dlpService.getMessageHeader(MessageCategory.ADMIN_EVENT, 'halo_emit',
            messageHeader.connection_id, messageHeader.flow_id),
          body: {
            service_name: localConfig.service_name,
            version: localConfig.version,
            maintainer: localConfig.maintainer,
            capabilities: localConfig.capabilities
          },
          origin: value.origin
        };

        try {
          if (schema.validate(haloEmit, 'haloemit')) {
            const haloEmitTopic = config.getConfigByKey('kafka/topics/topic/service/halo_emit') || 'halo_emit';
            kafka.publishMessage(haloEmitTopic, haloEmit);
          }
          else {
            logger.error('Invalid message halo_emit', {message: haloEmit}, stackTrace.get());
          }
        } catch (err) {
          logger.error(err, {message: value.body.message}, stackTrace.get());
        }
      }
    } catch (err) {
      logger.error(err, {message: value.body.message}, stackTrace.get());
    }
  });

  return consumer;
}

export {
  logflush,
  halo
};

