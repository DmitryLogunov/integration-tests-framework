import {Message} from "../../../../lib/components/messages";

const {When, Then, AfterAll, BeforeAll}  = require('cucumber');
import {expect} from 'chai';
import fs from 'fs';
import uniqid from 'uniqid';
import {promisify} from 'util';
const readFile = promisify(fs.readFile);
import path from 'path';
const _ = require('lodash');

import {config} from '../../../lib/helpers/config';
import {messaging} from 'dlp-service-components';
import {getTopicMessagesFromLocalStorage} from '../../../../lib/localStorage';
import * as logger from "../../../../lib/components/logger";
import {rdKafkaProduceMessage} from "../../../lib/helpers/rdKafka";

const TIMEOUTS = {timeout: config.timeouts.generic_test * 1000};
const MQ_RESPONSE_WAITING_PERIOD = 3000;
const fixturesPath = path.join(__dirname, '..', 'data');
const CUCUMBER_CREATING_HTML_REPORT_PERIOD = 2000;
const KAFKA_CREATING_CONSUMER_PERIOD = 4000;

import {MqClientsCustomWorld} from "./world";
import {setWorldConstructor} from "cucumber";

BeforeAll(() =>{
  setWorldConstructor(MqClientsCustomWorld);
});

AfterAll(() => {
  setTimeout(() => {
    logger.info(" Closing all kafka consumers ....");
    process.kill(process.pid, 'SIGINT');
    process.kill(process.pid, 'SIGTERM');
    Promise.resolve()
  }, CUCUMBER_CREATING_HTML_REPORT_PERIOD);

  setTimeout(() => {
    process.kill(process.pid, 'SIGINT');
    process.kill(process.pid, 'SIGTERM');
    Promise.resolve()
  }, 2*CUCUMBER_CREATING_HTML_REPORT_PERIOD);
});

// Checking publishing messages if messagingProvider eq kafka
When("messagingProvider eq 'kafka' message should be published to kafka", TIMEOUTS, () => {
  return new Promise(async (resolve, reject) => {
    try {
      // Messages queue client options
      this.messagingOptions = {
        provider: 'kafka',
        kafka: { brokers: config.kafka_url },
        nats: { server: config.nats_server, token: config.nats_token }
      };
      const mq = messaging.getClient(this.messagingOptions);

      const message = JSON.parse(await readFile(`${fixturesPath}/message.json`, 'utf-8'));
      message.header.flow_id = 'dlp-service-tests_check-publish-kafka-mq-' + uniqid();

      setTimeout(async () => {
        await mq.publish('testsTopic', message);

        setTimeout(async () => {
          const kafkaMessages: Array<Message> =
            await getTopicMessagesFromLocalStorage('testsTopic', message.header.flow_id, 'kafka');

          logger.debug("mqClient: kafka messages", {flowID: message.header.flow_id, kafkaMessages});

          expect(kafkaMessages).to.be.an('array');
          expect(kafkaMessages).to.not.be.empty;

          const natsMessages: Array<Message> =
            await getTopicMessagesFromLocalStorage('testsTopic', message.header.flow_id, 'nats');

          logger.debug("mqClient: nats messages", {flowID: message.header.flow_id, natsMessages});

          expect(natsMessages).to.be.an('array');
          expect(natsMessages).to.be.empty;

          resolve();
        }, MQ_RESPONSE_WAITING_PERIOD);
      }, KAFKA_CREATING_CONSUMER_PERIOD);
    } catch (e) {
      reject(e);
    }
  });
});

// Checking publishing messages if messagingProvider eq nats
When("messagingProvider eq 'nats' message should be published to nats", TIMEOUTS, () => {
  return new Promise(async (resolve, reject) => {
    try {
      // Messages queue client options
      this.messagingOptions.provider = 'nats';
      const mq = messaging.getClient(this.messagingOptions);

      const message = JSON.parse(await readFile(`${fixturesPath}/message.json`, 'utf-8'));
      message.header.flow_id = 'dlp-service-tests_check-publish-nats-mq' + uniqid();

      logger.debug("mqClient: mqPublishMode eq 'nats'", {flowID: message.header.flow_id});

      await mq.publish('testsTopic', message);

      setTimeout(async () => {
        const kafkaMessages: Array<Message> =
          await getTopicMessagesFromLocalStorage('testsTopic', message.header.flow_id, 'kafka');

        logger.debug("mqClient: kafka messages", {flowID: message.header.flow_id, kafkaMessages});

        expect(kafkaMessages).to.be.an('array');
        expect(kafkaMessages).to.be.empty;

        const natsMessages: Array<Message> =
          await getTopicMessagesFromLocalStorage('testsTopic', message.header.flow_id, 'nats');

        logger.debug("mqClient: nats messages", {flowID: message.header.flow_id, natsMessages});

        expect(natsMessages).to.be.an('array');
        expect(natsMessages).to.not.be.empty;

        resolve();
      }, MQ_RESPONSE_WAITING_PERIOD);
    } catch (e) {
      reject(e);
    }
  });
});


// Checking subscribing messages if messagingProvider eq kafka: creating kafka and nats consumers
When("create nats and kafka cunsumers", TIMEOUTS, () => {
  return new Promise(async (resolve, reject) => {
    try {
      this.flowID = 'dlp-service-tests_check-mq-client-handlers' + uniqid();

      logger.debug(" -----------  CREATING KAFKA and NATS CONSUMERS ---------", {flowID: this.flowID});

      // create Kafka consumer and add handler (mqSubscribeMode = 'kafka')
      this.messagingOptions.provider = 'kafka';
      this.mqKafka = messaging.getClient(this.messagingOptions);

      const kafkaHandler = async (message) => {
        logger.debug("mqClient: kafka handler has been called", {flowID: this.flowID, message});

        const messageEmit = JSON.parse(await readFile(`${fixturesPath}/message.json`, 'utf-8'));

        messageEmit.header.flow_id = JSON.parse(message).header.flow_id;
        messageEmit.body.description = "Kafka handler has been called";
        messageEmit.body.typeHandler = 'kafka';

        await rdKafkaProduceMessage(messageEmit, 'testsTopic.results');
      };

      await this.mqKafka.subscribe('testsTopic', kafkaHandler);

      // create Nats consumer and add handler (mqSubscribeMode = 'nats')
      this.messagingOptions.provider = 'nats';
      this.mqNats = messaging.getClient(this.messagingOptions);

      const natsHandler = async (message) => {
        logger.debug("mqClient: nats handler has been called", {flowID: this.flowID, message});

        const messageEmit = JSON.parse(await readFile(`${fixturesPath}/message.json`, 'utf-8'));
        messageEmit.header.flow_id = JSON.parse(message).header.flow_id;
        messageEmit.body.description = "Nats handler has been called";
        messageEmit.body.typeHandler = 'nats';

        await rdKafkaProduceMessage(messageEmit, 'testsTopic.results');
      };

      await this.mqNats.subscribe('testsTopic', natsHandler);

      resolve();
    } catch (e) {
      reject();
    }
  });
});


// Checking subscribing messages if messagingProvider eq kafka
When("publish message to check kafka consumer", TIMEOUTS, () => {
  return new Promise(async (resolve, reject) => {
    try {
      const message = JSON.parse(await readFile(`${fixturesPath}/message.json`, 'utf-8'));
      message.header.flow_id = this.flowID;

      logger.debug(" -----------  PUBLISHING MESSAGE to check kafka consumer ---------",
        {flowID: message.header.flow_id});

      setTimeout(async () => {
        await rdKafkaProduceMessage(message, 'testsTopic');
        resolve();
      }, KAFKA_CREATING_CONSUMER_PERIOD);
    } catch (e) {
      reject(e);
    }
  });
});

// Checking subscribing messages if messagingProvider eq nats
When("publish message to check nats consumer", TIMEOUTS, () => {
  return new Promise(async (resolve, reject) => {
    try {
      const message = JSON.parse(await readFile(`${fixturesPath}/message.json`, 'utf-8'));
      message.header.flow_id = this.flowID;

      logger.debug(" -----------  PUBLISHING MESSAGE to check nats consumer ---------",
        {flowID: message.header.flow_id});

      setTimeout(async () => {
        await this.mqNats.publish('testsTopic', message);

        resolve();
      }, KAFKA_CREATING_CONSUMER_PERIOD);

    } catch (e) {
      reject(e);
    }
  });
});


// Checking mqSubscribeMode eq 'kafka': kafka subscriber should be called
Then("if messagingProvider set as 'kafka' message should be handled by Kafka handler and NOT handled by Nats handler", TIMEOUTS, () => {
  return new Promise(async (resolve, reject) => {
    try {
      setTimeout(async () => {
        logger.debug(" -----------  CHECKING HANDLERS (kafka - yes, nats - no) ---------", {flowID: this.flowID});

        const emitMessages: Array<Message> =
          await getTopicMessagesFromLocalStorage('testsTopic.results', this.flowID, 'kafka');

        expect(emitMessages).to.be.an('array');
        expect(emitMessages).to.not.be.empty;

        const kafkaEmitMessage: Message = _.find(emitMessages, (message) => {
          return message.body.typeHandler === 'kafka';
        });

        const natsEmitMessage: Message = _.find(emitMessages, (message) => {
          return message.body.typeHandler === 'nats';
        });

        logger.debug("mqClient: emit messages (kafka)", {flowID:  this.flowID, kafkaEmitMessage, natsEmitMessage});

        expect(typeof kafkaEmitMessage === 'object').to.eql(true);
        expect(typeof natsEmitMessage === 'undefined').to.eql(true);

        resolve();
      }, 5*MQ_RESPONSE_WAITING_PERIOD);
    } catch (e) {
      reject();
    }
  });
});

// Checking mqSubscribeMode eq 'kafka': nats subscriber should not be called
Then("if messagingProvider set as 'nats' message should NOT be handled by Kafka handler and handled by Nats handler", TIMEOUTS, () => {
  return new Promise(async (resolve, reject) => {
    try {
      setTimeout(async () => {
        logger.debug(" -----------  CHECKING HANDLERS (kafka - no, nats - yes) ---------", {flowID: this.flowID});

        const emitMessages: Array<Message> =
          await getTopicMessagesFromLocalStorage('testsTopic.results', this.flowID, 'kafka');

        expect(emitMessages).to.be.an('array');
        expect(emitMessages).to.not.be.empty;

        const kafkaEmitMessage: Message = _.find(emitMessages, (message) => {
          return message.body.typeHandler === 'kafka';
        });

        const natsEmitMessage: Message = _.find(emitMessages, (message) => {
          return message.body.typeHandler === 'nats';
        });

        logger.debug("mqClient: emit messages (nats)", {flowID:  this.flowID, kafkaEmitMessage, natsEmitMessage});

        expect(typeof kafkaEmitMessage === 'undefined').to.eql(true);
        expect(typeof natsEmitMessage === 'object').to.eql(true);

        resolve();
      }, 5*MQ_RESPONSE_WAITING_PERIOD);
    } catch (e) {
      reject();
    }
  });
});

/*****************  Checking unsubscribing from topic if messagingProvider eq KAFKA **/

When("create kafka consumers", TIMEOUTS, () => {
  return new Promise(async (resolve, reject) => {
    try {
      logger.debug(" -----------  CREATING KAFKA CONSUMERS (checking unsubscribing kafka topic)---------", {flowID: this.flowID});

      // create Kafka consumer and add handler (mqSubscribeMode = 'kafka')
      this.messagingOptions.provider = 'kafka';
      this.mqKafka = messaging.getClient(this.messagingOptions);

      const kafkaHandler1 = async (message) => {
        logger.debug("mqClient: kafka handler has been called", {flowID: this.flowID, topic: 'testsTopic1', message});

        const messageEmit = JSON.parse(await readFile(`${fixturesPath}/message.json`, 'utf-8'));

        messageEmit.header.flow_id = JSON.parse(message).header.flow_id;
        messageEmit.body.consumerTopic = 'testsTopic1';
        messageEmit.body.description = "Kafka handler has been called";
        messageEmit.body.typeHandler = 'kafka';

        await rdKafkaProduceMessage(messageEmit, 'testsTopic.results');
      };

      const kafkaHandler23 = async (message) => {
        logger.debug("mqClient: kafka handler has been called", {flowID: this.flowID, topic: 'testsTopic2, testsTopic3', message});

        const messageEmit = JSON.parse(await readFile(`${fixturesPath}/message.json`, 'utf-8'));

        messageEmit.header.flow_id = JSON.parse(message).header.flow_id;
        messageEmit.body.consumerTopic = 'testsTopic2, testsTopic3';
        messageEmit.body.description = "Kafka handler has been called";
        messageEmit.body.typeHandler = 'kafka';

        await rdKafkaProduceMessage(messageEmit, 'testsTopic.results');
      };

      const kafkaHandler45 = async (message) => {
        logger.debug("mqClient: kafka handler has been called", {flowID: this.flowID, topics: 'testsTopic4, testsTopic5', message});

        const messageEmit = JSON.parse(await readFile(`${fixturesPath}/message.json`, 'utf-8'));

        messageEmit.header.flow_id = JSON.parse(message).header.flow_id;
        messageEmit.body.consumerTopic = 'testsTopic4, testsTopic5';
        messageEmit.body.description = "Kafka handler has been called";
        messageEmit.body.typeHandler = 'kafka';

        await rdKafkaProduceMessage(messageEmit, 'testsTopic.results');
      };

      await this.mqKafka.subscribe('testsTopic1', kafkaHandler1);
      await this.mqKafka.subscribe(['testsTopic2', 'testsTopic3'], kafkaHandler23);
      await this.mqKafka.subscribe(['testsTopic4', 'testsTopic5'], kafkaHandler45);

      resolve();
    } catch (e) {
      reject();
    }
  });
});

When("publish messages to check kafka consumer", TIMEOUTS, () => {
  return new Promise(async (resolve, reject) => {
    try {
      this.flowID = 'dlp-service-tests_check-mq-unsubscribing-' + uniqid();
      const message = JSON.parse(await readFile(`${fixturesPath}/message.json`, 'utf-8'));
      message.header.flow_id = this.flowID;

      logger.debug(" -----------  PUBLISHING MESSAGES to check kafka consumers (checking unsubscribing kafka topic)---------",
        {flowID: message.header.flow_id});

      setTimeout(async () => {
        await rdKafkaProduceMessage(message, 'testsTopic1');
        await rdKafkaProduceMessage(message, 'testsTopic2');
        await rdKafkaProduceMessage(message, 'testsTopic3');
        await rdKafkaProduceMessage(message, 'testsTopic4');
        await rdKafkaProduceMessage(message, 'testsTopic5');

        resolve();
      }, KAFKA_CREATING_CONSUMER_PERIOD);
    } catch (e) {
      reject(e);
    }
  });
});


Then("message should be handled by kafka handlers of all consumers", TIMEOUTS, () => {
  return new Promise(async (resolve, reject) => {
    try {
      setTimeout(async () => {
        logger.debug(" -----------  CHECKING HANDLERS (check unsubscribing kafka topic) ---------", {flowID: this.flowID});

        const emitMessages: Array<Message> =
          await getTopicMessagesFromLocalStorage('testsTopic.results', this.flowID, 'kafka');

        expect(emitMessages).to.be.an('array');
        expect(emitMessages).to.not.be.empty;

        const kafkaEmitMessages1: Message = _.filter(emitMessages, (message) => {
          return message.body.typeHandler === 'kafka' &&  message.body.consumerTopic === 'testsTopic1';
        });

        const kafkaEmitMessages23: Message = _.filter(emitMessages, (message) => {
          return message.body.typeHandler === 'kafka' &&  message.body.consumerTopic === 'testsTopic2, testsTopic3';
        });

        const kafkaEmitMessages45: Message = _.filter(emitMessages, (message) => {
          return message.body.typeHandler === 'kafka' &&  message.body.consumerTopic === 'testsTopic4, testsTopic5';
        });

        logger.debug("mqClient: emit messages (kafka)", {flowID:  this.flowID, emitMessages});

        expect(kafkaEmitMessages1.length).to.eql(1);
        expect(kafkaEmitMessages23.length).to.eql(2);
        expect(kafkaEmitMessages45.length).to.eql(2);

        resolve();
      }, 3*MQ_RESPONSE_WAITING_PERIOD);
    } catch (e) {
      reject();
    }
  });
});

When("unsubscribe kafka topics", TIMEOUTS, () => {
  return new Promise(async (resolve, reject) => {
    try {
      logger.debug(" -----------  UNSUBSCRIBE TOPIC to check kafka consumers (checking unsubscribing kafka topic)---------");

      await this.mqKafka.unsubscribe({topics: ['testsTopic1', 'testsTopic3']});

      resolve();
    } catch (e) {
      reject(e);
    }
  });
});

Then("message should not be handled by kafka handler of unsubscribed consumers", TIMEOUTS, () => {
  return new Promise(async (resolve, reject) => {
    try {
      setTimeout(async () => {
        logger.debug(" -----------  CHECKING HANDLERS 2 (check unsubscribing kafka topic) ---------", {flowID: this.flowID});

        const emitMessages: Array<Message> =
          await getTopicMessagesFromLocalStorage('testsTopic.results', this.flowID, 'kafka');

        expect(emitMessages).to.be.an('array');
        expect(emitMessages).to.not.be.empty;

        const kafkaEmitMessages1: Message = _.filter(emitMessages, (message) => {
          return message.body.typeHandler === 'kafka' &&  message.body.consumerTopic === 'testsTopic1';
        });

        const kafkaEmitMessages23: Message = _.filter(emitMessages, (message) => {
          return message.body.typeHandler === 'kafka' &&  message.body.consumerTopic === 'testsTopic2, testsTopic3';
        });

        const kafkaEmitMessages45: Message = _.filter(emitMessages, (message) => {
          return message.body.typeHandler === 'kafka' &&  message.body.consumerTopic === 'testsTopic4, testsTopic5';
        });

        logger.debug("mqClient: emit messages (kafka)", {flowID:  this.flowID, emitMessages});

        expect(kafkaEmitMessages1).to.be.empty;
        expect(kafkaEmitMessages23).to.be.empty;
        expect(kafkaEmitMessages45.length).to.eql(2);

        resolve();
      }, 5*MQ_RESPONSE_WAITING_PERIOD);
    } catch (e) {
      reject();
    }
  });
});

/*****************  Checking unsubscribing from topics if messagingProvider eq NATS **/

When("create nats consumers", TIMEOUTS, () => {
  return new Promise(async (resolve, reject) => {
    try {
      logger.debug(" -----------  CREATING NATS CONSUMERS (checking unsubscribing kafka topic)---------", {flowID: this.flowID});

      // create Nats consumer and add handler (mqSubscribeMode = 'nats')
      this.messagingOptions.provider = 'nats';
      this.mqNats = messaging.getClient(this.messagingOptions);

      const natsHandler1 = async (message) => {
        logger.debug("mqClient: nats handler has been called", {flowID: this.flowID, message});

        const messageEmit = JSON.parse(await readFile(`${fixturesPath}/message.json`, 'utf-8'));
        messageEmit.header.flow_id = JSON.parse(message).header.flow_id;
        messageEmit.body.consumerTopic = 'testsTopic1';
        messageEmit.body.description = "Nats handler has been called";
        messageEmit.body.typeHandler = 'nats';

        await rdKafkaProduceMessage(messageEmit, 'testsTopic.results');
      };

      const natsHandler23 = async (message) => {
        logger.debug("mqClient: nats handler has been called", {flowID: this.flowID, message});

        const messageEmit = JSON.parse(await readFile(`${fixturesPath}/message.json`, 'utf-8'));
        messageEmit.header.flow_id = JSON.parse(message).header.flow_id;
        messageEmit.body.consumerTopic = 'testsTopic2, testsTopic3';
        messageEmit.body.description = "Nats handler has been called";
        messageEmit.body.typeHandler = 'nats';

        await rdKafkaProduceMessage(messageEmit, 'testsTopic.results');
      };

      const natsHandler45 = async (message) => {
        logger.debug("mqClient: nats handler has been called", {flowID: this.flowID, message});

        const messageEmit = JSON.parse(await readFile(`${fixturesPath}/message.json`, 'utf-8'));
        messageEmit.header.flow_id = JSON.parse(message).header.flow_id;
        messageEmit.body.consumerTopic = 'testsTopic4, testsTopic5';
        messageEmit.body.description = "Nats handler has been called";
        messageEmit.body.typeHandler = 'nats';

        await rdKafkaProduceMessage(messageEmit, 'testsTopic.results');
      };

      await this.mqNats.subscribe('testsTopic1', natsHandler1);
      await this.mqNats.subscribe(['testsTopic2', 'testsTopic3'], natsHandler23);
      await this.mqNats.subscribe(['testsTopic4', 'testsTopic5'], natsHandler45);

      resolve();
    } catch (e) {
      reject(e);
    }
  });
});

When("publish messages to check nats consumer", TIMEOUTS, () => {
  return new Promise(async (resolve, reject) => {
    try {
      this.flowID = 'dlp-service-tests_check-mq-unsubscribing-' + uniqid();
      const message = JSON.parse(await readFile(`${fixturesPath}/message.json`, 'utf-8'));
      message.header.flow_id = this.flowID;

      logger.debug(" -----------  PUBLISHING MESSAGES to check kafka consumers (checking unsubscribing kafka topic)---------",
        {flowID: message.header.flow_id});

      setTimeout(async () => {
        await this.mqNats.publish('testsTopic1', message);
        await this.mqNats.publish('testsTopic2', message);
        await this.mqNats.publish('testsTopic3', message);
        await this.mqNats.publish('testsTopic4', message);
        await this.mqNats.publish('testsTopic5', message);

        resolve();
      }, KAFKA_CREATING_CONSUMER_PERIOD);
    } catch (e) {
      reject(e);
    }
  });
});


Then("message should be handled by nats handlers of all consumers", TIMEOUTS, () => {
  return new Promise(async (resolve, reject) => {
    try {
      setTimeout(async () => {
        logger.debug(" -----------  CHECKING HANDLERS (check unsubscribing nats topic) ---------", {flowID: this.flowID});

        const emitMessages: Array<Message> =
          await getTopicMessagesFromLocalStorage('testsTopic.results', this.flowID, 'kafka');

        expect(emitMessages).to.be.an('array');
        expect(emitMessages).to.not.be.empty;

        const natsEmitMessages1: Message = _.filter(emitMessages, (message) => {
          return message.body.typeHandler === 'nats' &&  message.body.consumerTopic === 'testsTopic1';
        });

        const natsEmitMessages23: Message = _.filter(emitMessages, (message) => {
          return message.body.typeHandler === 'nats' &&  message.body.consumerTopic === 'testsTopic2, testsTopic3';
        });

        const natsEmitMessages45: Message = _.filter(emitMessages, (message) => {
          return message.body.typeHandler === 'nats' &&  message.body.consumerTopic === 'testsTopic4, testsTopic5';
        });

        logger.debug("mqClient: emit messages (nats)", {flowID:  this.flowID, emitMessages});

        expect(natsEmitMessages1.length).to.eql(1);
        expect(natsEmitMessages23.length).to.eql(2);
        expect(natsEmitMessages45.length).to.eql(2);

        resolve();
      }, 5*MQ_RESPONSE_WAITING_PERIOD);
    } catch (e) {
      reject();
    }
  });
});

When("unsubscribe nats topics", TIMEOUTS, () => {
  return new Promise(async (resolve, reject) => {
    try {
      logger.debug(" -----------  UNSUBSCRIBE TOPIC to check nats consumers (checking unsubscribing nats topic)---------");

      await this.mqNats.unsubscribe({topics: ['testsTopic1', 'testsTopic3']});

      resolve();
    } catch (e) {
      reject(e);
    }
  });
});

Then("message should not be handled by nats handler of unsubscribed consumers", TIMEOUTS, () => {
  return new Promise(async (resolve, reject) => {
    try {
      setTimeout(async () => {
        logger.debug(" -----------  CHECKING HANDLERS 2 (check unsubscribing nats topic) ---------", {flowID: this.flowID});

        const emitMessages: Array<Message> =
          await getTopicMessagesFromLocalStorage('testsTopic.results', this.flowID, 'kafka');

        expect(emitMessages).to.be.an('array');
        expect(emitMessages).to.not.be.empty;

        const natsEmitMessages1: Message = _.filter(emitMessages, (message) => {
          return message.body.typeHandler === 'nats' &&  message.body.consumerTopic === 'testsTopic1';
        });

        const natsEmitMessages23: Message = _.filter(emitMessages, (message) => {
          return message.body.typeHandler === 'nats' &&  message.body.consumerTopic === 'testsTopic2, testsTopic3';
        });

        const natsEmitMessages45: Message = _.filter(emitMessages, (message) => {
          return message.body.typeHandler === 'nats' &&  message.body.consumerTopic === 'testsTopic4, testsTopic5';
        });

        logger.debug("mqClient: emit messages (nats)", {flowID:  this.flowID, emitMessages});

        expect(natsEmitMessages1).to.be.empty;
        expect(natsEmitMessages23.length).to.eql(1);
        expect(natsEmitMessages45.length).to.eql(2);

        resolve();
      }, 3*MQ_RESPONSE_WAITING_PERIOD);
    } catch (e) {
      reject();
    }
  });
});
