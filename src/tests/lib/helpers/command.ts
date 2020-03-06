import axios from 'axios';
import {config} from './config';
import {expect} from 'chai';
import querystring from 'querystring';
import uniqid from 'uniqid';
import {Response} from 'express';

/**
 * Request Keycloak for responsing accessToken
 */
export const getAccessToken = async (clientId?: string, username?: string, password?: string, realmName?: string) => {
  // get Keycloak params
  const responseKeycloakParams = await axios({
    method: 'get',
    url: config.services['initiatorgateway'].url + '/keycloak'
  });

  // logger.info(" ----> HELPERS/COMMAND: responseKeycloakParams: " ,{responseKeycloakParams}, stackTrace.get());

  const keycloakParams = responseKeycloakParams.data;

  // get Access-token
  const params = {
    grant_type: 'password',
    username: username || `${keycloakParams.realmName}-admin`,
    password: password || config.keycloak.realm.user_password,
    client_id: clientId || config.keycloak.realm.client_id
  };

  // logger.info(" ----> HELPERS/COMMAND: keycloakParams: " , {keycloakParams}, stackTrace.get());

  const data = querystring.stringify(params);
  const requestParams = {
    method: 'post',
    url: `${keycloakParams.authServerUrl}/realms/${realmName || keycloakParams.realmName}/protocol/openid-connect/token`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': data.length
    },
    data
  };

  // logger.info(" ----> HELPERS/COMMAND: Request access token: " , {requestParams}, stackTrace.get());

  const response = await axios(requestParams);

  // logger.info(" ----> HELPERS/COMMAND: Response access token: " , {responseData: response.data}, stackTrace.get());

  return response.data.access_token;
};

/**
 *  Sending command to command-gatewayr
 */
export const sendCommand = async (command: string, flowID: string, data: object, token: string, type: string, connectionId?: string) => {
  if (!connectionId) {
    connectionId = uniqid();
  }
  const url = `${config.comm_srv_url}/?command=${command}&type=${type || 'utility'}&connection_id=${connectionId}&flow_id=${flowID}`;
  const requestParams = {
    method: 'post',
    url,
    cors: true,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    data
  };
  return await axios(requestParams);
};

/**
 *  Sending command to command-gatewayr
 */
export const sendCommandAnonymously = async (command: string, flowID: string, data: string, type: string, connectionId?: string) => {
  if (!connectionId) {
    connectionId = uniqid();
  }
  const url = `${config.comm_srv_url}/?command=${command}&type=${type || 'utility'}&connection_id=${connectionId}&flow_id=${flowID}`;
  const requestParams = {
    method: 'post',
    url,
    cors: true,
    headers: {
      Authorization: '',
      'Content-Type': 'application/json'
    },
    data
  };

  return await axios(requestParams);
};

/**
 *  Sending command to command-gatewayr
 */
export const sendCommandUsingQuery = async (command: string, data: string, token: string, query: string) => {
  const url = `${config.comm_srv_url}/?${query}`;
  const requestParams = {
    method: 'post',
    url,
    cors: true,
    headers: {
      Authorization: `Bearer ${token}`
    },
    data
  };
  return await axios(requestParams);
};


/**
 *  checkResponse(err, res) - handler for checking healthCheck response
 *
 *  @param {Object} err - error
 *  @param {Object} res - response
 */
export const checkResponseOK = (err: Error, res: Response) => {
  if (err) {
    expect(err).to.eql(null);
  } else {
    expect(typeof res).to.not.eql('undefined');
    expect(res.status).to.eql(200);
  }
};
