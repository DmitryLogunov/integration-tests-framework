import path from 'path';
import axios, {AxiosResponse} from 'axios';
import xpath, {XPathSelect} from 'xpath';
import {DOMParser} from 'xmldom';

import fs from 'fs';
import {promisify} from 'util';

const mainLibPath = path.resolve(__dirname + '../../../../lib');
const testsLibPath = path.resolve(__dirname + '../../../lib');

const {getTopicMessagesFromLocalStorage, getTopic} = require(mainLibPath + '/localStorage');
const localStorageConfigPath = path.resolve(__dirname + '../../../../config/localStorage.yml');

import _ from 'lodash';

const readFile = promisify(fs.readFile);

const {config} = require(testsLibPath + '/helpers/config');

const soapAPIEndpoint = 'soap/BookingOrder?wsdl';
const requestXMLDataPath = path.resolve(__dirname + '/../data/request');
const responseXMLDataPath = path.resolve(__dirname + '/../data/response');

const KAFKA_RESPONSE_WAITING_PERIOD = 1000;

/**
 *
 * @param {string} requestXMLData
 */
export const sendRequestToSoap = async (requestXMLData: string, token?: string): Promise<AxiosResponse<any>> => {
  const url = `${config.services.soap_integrator.url}/${soapAPIEndpoint}`;
  if (!token) {
    token = `Bearer ${config.soap_access_token}`;
  }
  try {
    const requestParams = {
      method: 'POST',
      url: url,
      headers: {
        'Content-Type': 'application/xml',
        'Authorization': token
      },
      data: requestXMLData
    };

    const response = await axios(requestParams);

    return response;
  } catch (error) {
    return error.response;
  }
};

/**
 *
 * @param {string} dataPath
 * @param {string} requestXMLFilename
 * @returns {string}
 */
export const getRequestXML = async (dataPath: string, requestXMLFilename: string): Promise<string> => {
  if (!fs.existsSync(`${dataPath}/${requestXMLFilename}`)) {
    throw new Error('Request xml data source file does not exist');
  }

  return await readFile(`${dataPath}/${requestXMLFilename}`, 'utf-8');
};

/**
 *
 * @param {string} responseDataXML
 * @returns {boolean}
 */
export const checkSoapResponseIsError = (responseDataXML: string): boolean => {
  const doc = new DOMParser().parseFromString(responseDataXML);
  const faultcodeFromXML = xpath.select('string(//faultcode)', doc);

  return faultcodeFromXML === '500';
};

/**
 *
 * @param {string} responseDataXML
 * @returns {boolean}
 */
export const checkSoapResponseIsSuccess = (responseDataXML: string): boolean => {
  return getXMLItemText('tns1:Success', responseDataXML) === 'true';
};

/**
 *
 * @param {string} responseDataXML
 * @returns {Array<object>}
 */
export const parseSoapResponse = (responseDataXML: string): Array<object> => {
  const doc = new DOMParser().parseFromString(responseDataXML);

  const select: XPathSelect = xpath.useNamespaces({
    "soap": "http://schemas.xmlsoap.org/soap/envelope/",
    "tns1": "http://Cgli.types.soap.webservices"
  });

  const bookingsResponseItems =
    _.filter(
      _.map(
        select('//tns1:ValidateBookingsResponseItems/node()', doc),
        (node) => {
          return node.childNodes;
        }
      ),
      (item) => {
        return !_.isEmpty(item) && _.has(item, 'length') && item.length === 4;
      }
    );

  const parsedBookingsResponseItems =
    _.map(bookingsResponseItems, (bookingsResponseItem: any) => {
      return _.map(bookingsResponseItem, (subItem: any) => {
        const data = subItem.lastChild !== null && _.has(subItem.lastChild, 'data') ? subItem.lastChild.data : '';
        return {name: subItem.localName, data};
      })
    });

  return parsedBookingsResponseItems;
};

/**
 *
 * @param {string} itemTag
 * @param {string} responseDataXML
 * @returns {string}
 */
export const getXMLItemText = (itemTag: string, responseDataXML: string): string | null => {
  const doc = new DOMParser().parseFromString(responseDataXML);

  const select = xpath.useNamespaces({
    "soap": "http://schemas.xmlsoap.org/soap/envelope/",
    "tns1": "http://Cgli.types.soap.webservices"
  });

  const searchResult = select(`//${itemTag}/text()`, doc);

  if (!_.isNull(searchResult) && _.has(searchResult, 'length') && searchResult.length > 0) {
    return searchResult[0].data;
  }
  return null;
};
