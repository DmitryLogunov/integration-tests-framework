import {Then, BeforeAll, setWorldConstructor, When} from "cucumber";
import {CGCustomWorld} from "./world";
import {assert, expect} from 'chai';
import uniqid from 'uniqid';
import {config} from '../../../lib/helpers/config';
import {getAccessToken, sendCommand, sendCommandAnonymously, sendCommandUsingQuery} from '../../../lib/helpers/command';
import {generateUserData} from '../../../lib/helpers/users';
import {subscribeCommandResult} from '../../../lib/helpers/apollo';
import * as logger from "../../../../lib/components/logger";
import stackTrace from 'stack-trace';
const _ = require('lodash');

const TIMEOUTS = {timeout: config.timeouts.generic_test * 1000};

BeforeAll(function () {
  setWorldConstructor(CGCustomWorld);
});

/**
 * Send a command using wrong auth token
 */
When('send a command using wrong auth token', TIMEOUTS, function () {
  return new Promise(async (resolve, reject) => {
    try {
      const flowID = 'tests_service_' + uniqid();
      const user = {aaa: "bbb"};
      this.setCurrentUser(await sendCommand('user.add', flowID, user, this.getAccessToken(), 'admin'));
    } catch (e) {
      try {
        expect(e.message).to.eql('Request failed with status code 403');
      } catch (e) {
        return reject(e.message);
      }
      resolve();
    }
    return reject('No 403 response as expected');
  });
});

/**
 * Send a command into non-existing topic
 */
When('send a command into non-existing topic', TIMEOUTS, function () {
  return new Promise(async (resolve, reject) => {
    try {
      const flowID = 'tests_service_' + uniqid();
      this.setAccessToken(await getAccessToken());
      const user = {aaa: "bbb"};
      this.setCurrentUser(await sendCommand('user.add112233', flowID, user, this.getAccessToken(), 'admin'));
    } catch (e) {
      try {
        const response = e.response;
        if (!response.data) {
          throw new Error('No data from a response - wrong command processing');
        }
        expect(response.data.success).to.eql(false);
        expect(response.data.message).to.eql('Kafka topic not found for this command');
        expect(response.status).to.eql(400);
        resolve();
      } catch (e) {
        return reject(e.message);
      }
    }
    return reject('No 400 response as expected');
  });
});

/**
 * Check here how keycloak works
 */
When('try to login using wrong creds', TIMEOUTS, function () {
  return new Promise(async (resolve, reject) => {
    try {
      this.setAccessToken(await getAccessToken(config.keycloak.realm.client_id, 'aaa', 'bbb'));
      expect(this.getAccessToken()).to.eql('should_throw_exception');
    } catch (e) {
      try {
        if (!e.message) {
          throw new Error('Error: 401 response as expected');
        }
        expect(e.message).to.eql('Request failed with status code 401');
      } catch (e) {
        return reject(e.message);
      }
      resolve();
    }
    return reject('No 401 response as expected');
  });
});

/**
 * Check here how keycloak works
 */
When('try to login using wrong password', TIMEOUTS, function () {
  return new Promise(async (resolve, reject) => {
    try {
      this.setAccessToken(await getAccessToken(config.keycloak.realm.client_id, config.keycloak.realm.username, 'bbb'));
    } catch (e) {
      try {
        expect(e.message).to.eql('Request failed with status code 401');
      } catch (e) {
        return reject(e);
      }
      resolve();
    }
    return reject('No 401 response as expected');
  });
});

/**
 * Check CG response if user has no priveleges
 */
When('try to add a user having no privilege', TIMEOUTS, function () {
  return new Promise(async (resolve, reject) => {
    try {
      //get an access token
      //add the user
      //get an access using added user
      //try to add a user using new token
      const flowID = 'tests_service_' + uniqid();
      this.setAccessToken(await getAccessToken());
      this.setUserData(generateUserData());
      this.setCurrentUserResponse(await sendCommand('user.add', flowID, this.getUserData(), this.getAccessToken(), 'admin'));
      this.setAccessToken(await getAccessToken(config.keycloak.realm.client_id, config.keycloak.realm.username, 'bbb'));
    } catch (e) {
      try {
        expect(e).to.eql('Request failed with status code 401');
        resolve();
      } catch (e) {
        return reject(e);
      }
    }
  });
});

/**
 * Send valid command Halo: get response OK if we use valid access token
 */
When('Halo command: should get response OK if we use valid access token', TIMEOUTS, () => {
  return new Promise(async (resolve, reject) => {
    try {
      const flowID = 'tests_service_' + uniqid();
      const accessToken = await getAccessToken();
      const data = {message: "Halo message"};
      const response = await sendCommand('halo', flowID, data, accessToken, 'admin');

      expect(response.status).to.eql(200);
      expect(response.data.success).to.eql(true);
      expect(response.data.message).to.eql('Command has been accepted');
      resolve();
    } catch (e) {
      try {
        expect(e).to.eql(null);
        resolve();
      } catch (e) {
        return reject(e);
      }
      resolve();
    }
  });
});

/**
 * Send valid command Logflush: get response OK if we use valid access token
 */
When('Logflush command: should get response OK if we use valid access token', TIMEOUTS, () => {
  return new Promise(async (resolve, reject) => {
    try {
      const flowID = 'tests_service_' + uniqid();
      const accessToken = await getAccessToken();
      const data = {message: "Logflush message"};
      const response = await sendCommand('logflush', flowID, data, accessToken, 'admin');

      expect(response.status).to.eql(200);
      expect(response.data.success).to.eql(true);
      expect(response.data.message).to.eql('Command has been accepted');
      resolve();
    } catch (e) {
      try {
        expect(e).to.eql(null);
        resolve();
      } catch (e) {
        return reject(e);
      }
      resolve();
    }
  });
});

/**
 * Send NOT valid command Logflush: get response Error NOT_VALID_COMMAND if we use valid access token
 */
When('NOT valid Logflush command: should get response Error NOT_VALID_COMMAND if we use valid access token',
    TIMEOUTS, function () {
    return new Promise(async (resolve, reject) => {
      try {
        const flowID = 'tests_service_' + uniqid();
        const accessToken = await getAccessToken();
        const data = {message: "Logflush message"};
        // connection_id is not defined
        const query = `cpmmand=logflush&type=admin&flow_id=${flowID}`;
        await sendCommandUsingQuery('logflush', JSON.stringify(data), accessToken, query);
      } catch (e) {
        try {
          const response = e.response;

          if (!response.data) {
            throw new Error('No data from a response - wrong command processing');
          }

          expect(response.status).to.eql(400);
          expect(response.data.success).to.eql(false);
          expect(response.data.message).to.eql('Request is not valid');
          resolve();
        } catch (e) {
          return reject(e.message);
        }
      }
      return reject('Error: 400 response code is expected');
    });
  });

When('the user send restorePassword command anonymously', TIMEOUTS, function () {
  return new Promise(async (resolve, reject) => {
    try {
      this.setFlowID('tests_service_flow_' + uniqid());
      this.setConnectionID('tests_service_connection_' + uniqid());

      let body = {
        "username_or_email": this.getUserData().email,
        "redirect_uri": config.keycloak.verify_email_redirect_uri,
        "message_text": "Learn how to send a text from your email <a href=\'${magicLink}\'>Click here</a> account by following our guide.",
        "message_subject": "restorePassword command",
        "message_from_name": "dlp.core@arcadialab.rus",
        "message_from_address": "dlp.core@arcadialab.rus"
      };

      let response = await sendCommandAnonymously('user.restorePassword', this.getFlowID(), JSON.stringify(body), 'admin', this.getConnectionID());
      this.setCurrentUserResponse(response);
      resolve();
    } catch (e) {
      return reject(e.message);
    }
  });
});

When('the user send resetPassword command with incorrect restore_password_token in the request body', TIMEOUTS, function () {
  return new Promise(async (resolve, reject) => {
    try {
      this.setFlowID('tests_service_flow_' + uniqid());
      this.setConnectionID('tests_service_connection_' + uniqid());

      const body = {
        "restore_password_token": "incorrect token",
        "new_password": "1234Qwer"
      };

      const response = await sendCommandAnonymously('user.resetPassword', this.getFlowID(), JSON.stringify(body), 'admin', this.getConnectionID());
      this.setCurrentUserResponse(response);
      resolve();
    } catch (e) {
      return reject(e.message);
    }
  });
});

Then('the user should receive a success message via a web socket', TIMEOUTS, function () {
  setTimeout(async () => {
    return new Promise(async (resolve, reject) => {
      try {
        const message = await subscribeCommandResult(this.getConnectionID());
        logger.debug("----- DEBUG: message: ", message);
        expect(message).to.not.be.empty;
        expect(message.data.systemCommandResult.success).to.equal(true);
        resolve();
      } catch (e) {
        return reject(e.message);
      }
    });
  }, 500);
});

Then('the user should receive a failed message via a web socket', TIMEOUTS, function () {
  setTimeout(async () => {
    return new Promise(async (resolve, reject) => {
      try {
        const message = await subscribeCommandResult(this.getConnectionID());
        logger.debug("----- DEBUG: message: ", message);
        expect(message).to.not.be.empty;
        expect(message.data.systemCommandResult.success).to.equal(false);
        expect(message.data.systemCommandResult.message).to.equal('Restore password token is expired');
        resolve();
      } catch (e) {
        return reject(e.message);
      }
    });
  }, 500);
});
