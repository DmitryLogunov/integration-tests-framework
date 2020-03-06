import {When, Then, setWorldConstructor, BeforeAll} from "cucumber";
import {Message} from "../../../../lib/components/messages";
import {assert, expect} from 'chai';
import uniqid from 'uniqid';
import stackTrace from 'stack-trace';

import * as logger from '../../../../lib/components/logger';
import {config} from '../../../lib/helpers/config';
import {getAccessToken, sendCommand} from '../../../lib/helpers/command';
import {getTopicMessagesFromLocalStorage} from "../../../../lib/localStorage";
import {EMCustomWorld} from "./world";
import * as fs from "fs";
import * as path from "path";

const TIMEOUTS_X1000 = {timeout: config.timeouts.generic_test * 1000};
const TIMEOUTS_X500 = {timeout: config.timeouts.generic_test * 1000};

const EMAIL_WAITING_PERIOD = 5000;
const EMAIL_SEND_TOPIC = 'email.send';
const RESULTS_TOPIC = 'system.commands.result';
const DATA = {
  message: "<hr/><b>Test</b>",
  subject: "DLP test message from email-service",
  from_address: "dlp.core@arcadialab.rus",
  from_name: "Test Service",
  to_address: "dlp.core@arcadialab.ru"
};

let response: any;

BeforeAll(function () {
  setWorldConstructor(EMCustomWorld);
});

When('send a command email.send', TIMEOUTS_X1000, function () {
  return new Promise(async (resolve, reject) => {
    try {
      this.setFlowID('tests_service_' + uniqid());
      const accessToken = await getAccessToken();
      const response = await sendCommand(EMAIL_SEND_TOPIC, this.getFlowID(), DATA, accessToken, 'utility');

      expect(response.status).to.eql(200);
      expect(response.data.success).to.eql(true);
      expect(response.data.message).to.eql('Command has been accepted');
      resolve();
    } catch (e) {
      return reject(e);
    }
  });
});

When(/^send a command email.send with params: (.*)$/, TIMEOUTS_X500, function (to_address: string) {
  return new Promise(async (resolve) => {
    try {
      this.setFlowID('tests_service_' + uniqid());
      const accessToken = await getAccessToken();
      const data = Object.assign({}, DATA);
      data['to_address'] = to_address;
      response = await sendCommand(EMAIL_SEND_TOPIC, this.getFlowID(), data, accessToken, 'utility');
      resolve();
    } catch (e) {
      response = e.response;
      resolve();
    }
  });
});

When('send a command email.send with attachment', TIMEOUTS_X1000, function () {
  return new Promise(async (resolve, reject) => {
    try {
      this.setFlowID('tests_service_' + uniqid());

      const accessToken = await getAccessToken();
      const attachedObject = fs.readFileSync(path.resolve(__dirname + '/../data/attachment.csv'));
      const attachment = {
        data: Buffer.from(attachedObject).toString('base64'),
        filename: "attachment.csv",
        type: "text/csv"
      };

      const data = Object.assign({}, DATA);
      data.attachments = [];
      data.attachments.push(attachment);

      const response = await sendCommand(EMAIL_SEND_TOPIC, this.getFlowID(), data, accessToken, 'utility');

      expect(response.status).to.eql(200);
      expect(response.data.success).to.eql(true);
      expect(response.data.message).to.eql('Command has been accepted');

      resolve();
    } catch (e) {
      return reject(e);
    }
  });
});

Then('command has been executed', TIMEOUTS_X1000, function () {
  return new Promise(async (resolve, reject) => {
    setTimeout(async () => {
      try {
        const mqProvider = await this.getMqProvider();
        const emailSentMessages: Array<Message> =
          await getTopicMessagesFromLocalStorage(RESULTS_TOPIC, this.getFlowID(), mqProvider);

        logger.info("Email sent Messages: ", {flowID: this.getFlowID(), emailSentMessages}, stackTrace.get());

        expect(emailSentMessages).to.be.an('array');
        expect(emailSentMessages.length).to.eql(1);
        expect(emailSentMessages).to.not.be.empty;

        const messageEmailSent: Message = emailSentMessages[0];
        expect(messageEmailSent.header.flow_id).to.eql(this.getFlowID());
        expect(messageEmailSent.body.success).to.eql(true);

        resolve();
      } catch (e) {
        return reject(e);
      }
    }, EMAIL_WAITING_PERIOD);
  });
});

Then(/^request failed with status code (\d{3}) and message (.*)$/, TIMEOUTS_X500,
  function (status: string, message: string) {
    expect(response.status).to.eql(+status);
    expect(response.data.success).to.eql(false);
    expect(response.data.message).to.eql(message);
  });

