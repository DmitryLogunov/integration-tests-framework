import {BeforeAll, setWorldConstructor, Then, When} from 'cucumber';
import {expect} from 'chai';

import path from 'path';
import fs from 'fs';
import {promisify} from 'util';

const mainLibPath = path.resolve(__dirname + '../../../../../lib');
const testsLibPath = path.resolve(__dirname + '../../../../lib');

const {getTopicMessagesFromLocalStorage, getTopic} = require(mainLibPath + '/localStorage');
const localStorageConfigPath = path.resolve(__dirname + '../../../../config/localStorage.yml');

import _ from 'lodash';

const readFile = promisify(fs.readFile);

const logger = require(mainLibPath + '/components/logger');

const {config} = require(testsLibPath + '/helpers/config');
const TIMEOUTS = {timeout: config.timeouts.generic_test * 1000};

const soapAPIEndpoint = 'soap/BookingOrder?wsdl';
const requestXMLDataPath = path.resolve(__dirname + '/../data/request');
const responseXMLDataPath = path.resolve(__dirname + '/../data/response');

import {SoapCustomWorld} from "./world";

const KAFKA_RESPONSE_WAITING_PERIOD = 1000;

const {
  getRequestXML, sendRequestToSoap,
  checkSoapResponseIsError, checkSoapResponseIsSuccess,
  parseSoapResponse, getXMLItemText
} = require(testsLibPath + '/helpers/soap');

let response: any;

BeforeAll(() =>{
  setWorldConstructor(SoapCustomWorld);
});


// Sending request with NOT valid xml
When('soap-integrator gets not valid xml response should include xml with error', TIMEOUTS, () => {
  return new Promise(async (resolve, reject) => {
    try {
      const notValidXMLData = await getRequestXML(requestXMLDataPath, 'NotValidRequest.xml');
      const response = await sendRequestToSoap(notValidXMLData);

      expect(response.status).to.eql(500);

      const responseDataXML = response.data;

      expect(checkSoapResponseIsError(responseDataXML)).to.eql(true);
      expect(checkSoapResponseIsSuccess(responseDataXML)).to.eql(false);

      resolve();
    } catch (error) {
      return reject(error.message);
    }
  });
});

// Sending request with valid xml
When('soap-integrator gets valid xml response should include xml with no errors', TIMEOUTS, () => {
  return new Promise(async (resolve, reject) => {
    try {
      const validXMLData = await getRequestXML(requestXMLDataPath, 'BookingOrderRequest.xml');
      const response = await sendRequestToSoap(validXMLData);

      expect(response.status).to.eql(200);

      this.responseDataXML = response.data;

      expect(checkSoapResponseIsError(this.responseDataXML)).to.eql(false);
      expect(checkSoapResponseIsSuccess(this.responseDataXML)).to.eql(true);

      const parsedResponseDataXML = parseSoapResponse(this.responseDataXML);
      const parsedResponseDataXMLShouldBe =
        JSON.parse(await readFile(`${responseXMLDataPath}/ParsedBookingOrderResponse.json`, 'utf-8'));

      expect(parsedResponseDataXML).to.eql(parsedResponseDataXMLShouldBe);

      resolve();
    } catch (error) {
      return reject(error.message);
    }
  });
});

// Sending request with valid xml
When('send valid xml request with invalid token to soap-integrator', TIMEOUTS, () => {
  return new Promise(async (resolve, reject) => {
    try {
      const validXMLData = await getRequestXML(requestXMLDataPath, 'BookingOrderRequest.xml');
      response = await sendRequestToSoap(validXMLData, 'Bearer invalid_token');
      resolve();
    } catch (e) {
      response = e.response;
      resolve();
    }
  });
});

// Checking if it has been published valid message into kafka topic
Then('it should produce valid message to kafka topic', TIMEOUTS, () => {
  return new Promise(async (resolve, reject) => {
    try {
      const bookingOrderTopic = await getTopic(localStorageConfigPath, 'booking.order.request');
      const responseBatchId = getXMLItemText('tns1:BatchId', this.responseDataXML);
      const soapWorld = new SoapCustomWorld();
      const mqProvider = await soapWorld.getMqProvider();

      setTimeout(async() => {
        // responseBatchId == flow_id
        const soapBookingOrderMessage =
          await getTopicMessagesFromLocalStorage(bookingOrderTopic, responseBatchId, mqProvider);

        const soapBookingOrderMessageBodyShoudBe =
          JSON.parse(await readFile(`${responseXMLDataPath}/BookingOrderKafkaMessage.json`, 'utf-8')).body.data;

        expect(typeof soapBookingOrderMessage).to.not.eql('undefined');
        expect(_.has(soapBookingOrderMessage, 'length')).to.eql(true);
        expect(soapBookingOrderMessage.length > 0).to.eql(true);
        expect(soapBookingOrderMessage[0].header.action).to.eql('booking.order.request');
        expect(soapBookingOrderMessage[0].header.service_name).to.eql('SOAP_INTEGRATOR');
        expect(soapBookingOrderMessage[0].body.data).to.eql(soapBookingOrderMessageBodyShoudBe);

        resolve();
      }, KAFKA_RESPONSE_WAITING_PERIOD);
    } catch (error) {
      return reject(error.message);
    }
  });
});

Then(/^request blocked with status code (\d{3}) and message "(.*)"/, {timeout: config.timeouts.generic_test * 500}, function (status: string, message: string) {
  expect(response.status).to.eql(+status);
  expect(response.data.success).to.eql(false);
  expect(response.data.message).to.eql(message);
});
