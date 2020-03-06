import {BeforeAll, Given, setWorldConstructor, Then, When} from 'cucumber';
import {expect} from 'chai';
import path from 'path';
import _ from 'lodash';
import {config} from '../../../lib/helpers/config';
import {getAccessToken, sendCommand} from '../../../lib/helpers/command';
import {checkUserExists, generateUserData, getUserSessionsFromKeycloak} from '../../../lib/helpers/users';
import {getTopic, getTopicMessagesFromLocalStorage} from '../../../../lib/localStorage';
import * as logger from '../../../../lib/components/logger';
import stackTrace from 'stack-trace';
import uniqid from 'uniqid';
import {Message} from "../../../../lib/components/messages";
import axios from "axios";
import {UMCustomWorld, UserCreds} from "./world";
import {MagicLinkParser} from "../../../lib/helpers/magicLinkParser";
import {subscribeCommandResult} from "../../../lib/helpers/apollo";

const localStorageConfigPath = path.resolve(__dirname + '../../../../config/localStorage.yml');

const TIMEOUTS = {timeout: config.timeouts.generic_test * 1000};

BeforeAll(function () {
  setWorldConstructor(UMCustomWorld);
});

Given(/^a random user in (\w*) state$/,function(state: string) {
  return new Promise(async(resolve, reject) => {
    try {
      //Add new user with random data
      let user = generateUserData();
      state === 'disabled' ? user.enabled = false : user.enabled = true;
      this.setFlowID('tests_service_' + uniqid());
      this.setConnectionID('tests_service_connection_' + uniqid());
      this.setAccessToken(await getAccessToken());
      const responseAddUser = await sendCommand('user.add', this.getFlowID(), user, this.getAccessToken(), 'admin', this.getConnectionID());

      logger.info(" ----- DEBUG:", {responseAddUser});

      this.setCurrentUserResponse(responseAddUser);

      //Subscribe and get user_id
      const notification: any = await subscribeCommandResult(this.getConnectionID());
      logger.debug('----- DEBUG: Socket message: ', notification);
      expect(notification).to.not.be.empty;

      //TODO remove replace action after fix DLPCORE-398
      user.userID = notification.data.systemCommandResult.data[0].value.replace(/"/g,'');

      //Get password of added user and set userData to World
      setTimeout(async () => {
        const mqProvider = await this.getMqProvider();
        const magicLinkParser: MagicLinkParser = new MagicLinkParser(localStorageConfigPath, mqProvider);
        const credential: any = await magicLinkParser.parse(this.getFlowID());
        if (credential) {
          user.password = credential.userPassword;
          this.setUserData(user);
          setTimeout(() => {
            resolve();
          }, 500);
        } else {
          return reject("User credential missing");
        }
      },1000);
    } catch (e) {
      return reject(e);
    }
  });
});

When('activate the user', function() {
  return new Promise(async(resolve, reject) => {
    setTimeout(async () => {
      try {
        const body = {
          "userId": this.getUserAddedId()
        };
        this.setFlowID('tests_service_' + uniqid());
        this.setConnectionID('tests_service_connection_' + uniqid());
        this.setCurrentUserResponse(await sendCommand('user.activate', this.getFlowID(), body, this.getAccessToken(), 'admin', this.getConnectionID()));
        resolve();
      } catch (e) {
        reject(e);
      }
    }, 500);
  });
});

When('deactivate the user', function() {
  return new Promise(async(resolve, reject) => {
    try {
      const body = {
        "userId": this.getUserAddedId()
      };
      this.setFlowID('tests_service_' + uniqid());
      this.setConnectionID('tests_service_connection_' + uniqid());
      this.setCurrentUserResponse(await sendCommand('user.deactivate', this.getFlowID(), body, this.getAccessToken(), 'admin', this.getConnectionID()));
      resolve();
    } catch (e) {
      reject(e);
    }
  });
});

When('update the user email', function() {
  return new Promise(async(resolve, reject) => {
    try {
      let user = this.getUserData();
      user.email = 'new_' + user.email;
      this.setUserData(user);

      const body = {
        "userId": user.userID,
        "newEmail": user.email
      };
      this.setFlowID('tests_service_' + uniqid());
      this.setConnectionID('tests_service_connection_' + uniqid());
      this.setCurrentUserResponse(await sendCommand('user.updateEmail', this.getFlowID(), body, this.getAccessToken(), 'admin', this.getConnectionID()));
      resolve();
    } catch (e) {
      reject(e);
    }
  });
});

When('send command to logout user', function() {
  return new Promise(async(resolve, reject) => {
    try {
      let user = this.getUserData();
      user.userID = user.userID.replace(/"/g,'');
      const body = {
        "userId": user.userID
      };
      this.setFlowID('tests_service_' + uniqid());
      this.setConnectionID('tests_service_connection_' + uniqid());
      this.setCurrentUserResponse(await sendCommand('user.logout', this.getFlowID(), body, this.getAccessToken(), 'admin', this.getConnectionID()));
      resolve();
    } catch (e) {
      reject(e);
    }
  });
});

When('the user login to the system with success', function () {
  return new Promise(async(resolve, reject) => {
    try {
      const user = this.getUserData();
      const token = await getAccessToken(undefined, user.email, user.password);
      expect(token).to.not.be.empty;
      user.accessToken = token;
      this.setUserData(user);
    } catch (e) {
      return reject(e.message);
    }
    resolve();
  });
});

When('the user login to the system without success', function () {
  return new Promise(async(resolve, reject) => {
    try {
      const user = this.getUserData();
      await getAccessToken(undefined, user.email, user.password);
    } catch (e) {
      expect(e.message).to.equal('Request failed with status code 400');
      return resolve();
    }
    reject('Disabled user has successfully logged in to the system');
  });
});

/* Add a random user into the system */
When('add a random user into the system', TIMEOUTS, function () {
  return new Promise(async (resolve, reject) => {
    try {
      this.setFlowID('tests_service_' + uniqid());
      this.setAccessToken(await getAccessToken());
      this.setUserData(generateUserData());
      this.setCurrentUserResponse(await sendCommand('user.add', this.getFlowID(), this.getUserData(), this.getAccessToken(), 'admin'));

      logger.debug("----- DEBUG: user data to add: ", {userData: this.getUserData()}, stackTrace.get());
      logger.debug("----- DEBUG: user add response: ", {currentUserResponse: this.getCurrentUserResponse().data}, stackTrace.get());

      resolve();
    } catch (e) {
      return reject(e);
    }
  });
});

/* Add a random user into the system => a user has been added */
Then('a user has been added', TIMEOUTS, function () {
  return new Promise(async (resolve, reject) => {
    try {
      // get Keycloak params
      const responseKeycloakParams = await axios({
        method: 'get',
        url: config.services['initiatorgateway'].url + '/keycloak'
      });

      this.setKeycloakParams(responseKeycloakParams.data);
      const mqProvider = await this.getMqProvider();

      // check if user has been added
      setTimeout(async () => {
        const userAddedMessages: Array<Message> =
          await getTopicMessagesFromLocalStorage('system.commands.result', this.getFlowID(), mqProvider);

        logger.debug("----- DEBUG: user udded messages: ", {
          flowID: this.getFlowID(),
          userAddedMessages
        }, stackTrace.get());


        expect(userAddedMessages).to.be.an('array');
        expect(userAddedMessages).to.not.be.empty;

        const messageUserAdded: Message =
          _.find(userAddedMessages, (userMessage) => {
            return userMessage.header.service_name === 'usermanagement_service';
        });

        this.setUserAddedId(messageUserAdded.body.data.userId);
        logger.debug("----- DEBUG: messageUserAdded: ", messageUserAdded);

        logger.debug("----- DEBUG: user udded ID: ", {
          flowID: this.getFlowID(),
          usedAddedID: this.getUserAddedId()
        }, stackTrace.get());

        expect(this.getCurrentUserResponse().data.message).to.eql("Command has been accepted");
        expect(messageUserAdded.header.flow_id).to.eql(this.getFlowID());

        // check case: added user can succefully login
        const magicLinkParser: MagicLinkParser = new MagicLinkParser(localStorageConfigPath, mqProvider);
        const userCreds: UserCreds | null = await magicLinkParser.parse(this.getFlowID());
        logger.debug("----- DEBUG: user creds: ", {userCreds}, stackTrace.get());

        if (!userCreds) {
          return reject("User Creds cannot be undefined");
        }

        this.setUserCreds(userCreds);

        const userAccessToken =
          await getAccessToken(config.keycloak.realm.client_id,
            this.getUserCreds().userEmail,
            this.getUserCreds().userPassword,
            this.getKeycloakParams().realmName);

        logger.debug("----- DEBUG: user access token: ", {
          flowID: this.getFlowID(),
          userEmail: this.getUserData().email,
          userAccessToken
        }, stackTrace.get());

        expect(userAccessToken).to.not.be.empty;

        resolve();
      }, 3000);
    } catch (e) {
      return reject(e);
    }
  });
});

/* Add a random user into the system => delete a user */
Then('delete a user', TIMEOUTS, function () {
  return new Promise(async (resolve, reject) => {
    try {
      this.setFlowID('tests_service_' + uniqid());
      logger.debug("----- DEBUG: user wich should be deleted: ",
        {flowID: this.getFlowID(), usedDeleteID: this.getUserAddedId()}, stackTrace.get());

      this.setCurrentUserResponse(await sendCommand('user.delete', this.getFlowID(), {userId: this.getUserAddedId()}, this.getAccessToken(), 'admin'));
    } catch (e) {
      return reject(e.message);
    }

    try {
      setTimeout(async () => {
        const mqProvider = await this.getMqProvider();
        const userDeletedMessages: Array<Message> =
          await getTopicMessagesFromLocalStorage('system.commands.result', this.getFlowID(), mqProvider);

        logger.debug("----- DEBUG: user deleted messages: ", {
          flowID: this.getFlowID(),
          userDeletedMessages
        }, stackTrace.get());

        expect(userDeletedMessages).to.be.an('array');
        expect(userDeletedMessages).to.not.be.empty;

        const messageUserDeleted: Message = userDeletedMessages[0];

        expect(this.getCurrentUserResponse().data.message).to.eql("Command has been accepted");
        expect(messageUserDeleted.header.flow_id).to.eql(this.getFlowID());

        try {
          const userAccessToken =
            await getAccessToken(config.keycloak.realm.client_id,
              this.getUserCreds().userEmail,
              this.getUserCreds().userPassword,
              this.getKeycloakParams().realmName);

          expect(true).to.eql(false); //There is should throw exception
        } catch(error) {
          expect(error.response.status).to.eql(401);
        }

        resolve();
      }, 3000);
    } catch (e) {
      return reject(e);
    }
  });
});

Then(/^the number of user sessions equals (\d)$/, function(sessionCount: string) {
    return new Promise(async(resolve, reject) => {
        try {
            setTimeout(async () => {
                const response = await getUserSessionsFromKeycloak(this.getUserAddedId());
                expect(response.data.length).to.equal(+sessionCount);
                resolve();
            }, 500);
        } catch (e) {
            reject(e);
        }
    });
});

/* Restore and reset password */
Then('send command to restore password', TIMEOUTS, function () {
  return new Promise(async (resolve, reject) => {
    try {
      const topic = await getTopic(localStorageConfigPath, 'results');

      if (!topic) {
        return reject("Kafka topic cannot be null");
      }

      this.setResultTopic(topic);

      const restorePasswordCommandData = {
        username_or_email: this.getUserData().email,
        realm_name: this.getKeycloakParams().realmName,
        client_id: config.keycloak.realm.client_id,
        redirect_uri: '',
        message_text: '${magicLink}',
        message_subject: 'Some subject',
        message_from_name: 'User Name',
        message_from_address: 'from-test@email.ru'
      };

      this.setFlowID('tests_service_' + uniqid());

      logger.info(" ------- DEBUG: restorePasswordCommandData", {
        flowID: this.getFlowID(),
        restorePasswordCommandData
      }, stackTrace.get());

      const responseRestorePassword =
        await sendCommand('user.restorePassword', this.getFlowID(), restorePasswordCommandData, '', 'admin');

      logger.info(" ------- DEBUG: response restorePasswordCommandData",
        {flowID: this.getFlowID(), responseRestorePasswordData: responseRestorePassword.data}, stackTrace.get());

      setTimeout(async () => {
        const mqProvider = await this.getMqProvider();
        const restorePasswordResultMessages: Array<Message> =
          await getTopicMessagesFromLocalStorage('system.commands.result', this.getFlowID(), mqProvider);

        logger.info("------- DEBUG: restore password result messages: ",
          {flowID: this.getFlowID(), restorePasswordResultMessages}, stackTrace.get());

        expect(restorePasswordResultMessages).to.be.an('array');
        expect(restorePasswordResultMessages).to.not.be.empty;

        const restorePasswordResultMessage: Message | undefined = _.find(restorePasswordResultMessages, (message: Message) => {
          return message.header.action === 'restorePassword.result';
        });

        if (!restorePasswordResultMessage) {
          return reject("restorePasswordResultMessage cannot be undefined");
        }

        this.setRestorePasswordToken(restorePasswordResultMessage.body.magicCode);

        if (!this.getRestorePasswordToken() || this.getRestorePasswordToken().length === 0) {
          return reject("Restore password token cannot be null");
        }

        logger.debug(" ------ DEBUG: restore password token (restore pass)",
          {
            flowID: this.getFlowID(),
            restorePasswordToken: this.getRestorePasswordToken()
          }, stackTrace.get());

        // check case: after restore password added user can succefully login
        logger.debug(" ------ DEBUG: user creds: ", {userCreds: this.getUserCreds()}, stackTrace.get());

        expect(this.getUserCreds()).to.not.be.empty;

        const userAccessToken =
          await getAccessToken(config.keycloak.realm.client_id,
            this.getUserCreds().userEmail,
            this.getUserCreds().userPassword,
            this.getKeycloakParams().realmName);

        logger.info("----- DEBUG: user access token (after restore): ",
          {
            flowID: this.getFlowID(),
            userEmail: this.getUserData().email,
            userAccessToken
          }, stackTrace.get());

        expect(userAccessToken).to.not.be.empty;

        resolve();
      }, 3000);
      resolve();
    } catch (e) {
      return reject(e);
    }
  });
});

Then('http request is completed successfully', function() {
  return new Promise(async(resolve,reject) => {
    try {
      const response: any = this.getCurrentUserResponse();
      logger.debug('----- DEBUG: Response: ', response.data);
      expect(response.data.success).to.equal(true);
      expect(response.data.message).to.equal('Command has been accepted');
      resolve();
    } catch (e) {
      return reject(e);
    }
  });
});

Then(/^received message "(.*)" from web socket$/, function(message: string) {
  return new Promise(async(resolve,reject) => {
    try {
      const notification: any = await subscribeCommandResult(this.getConnectionID());
      logger.debug('----- DEBUG: Notification message: ', notification.data.systemCommandResult);
      expect(notification).to.not.be.empty;
      expect(notification.data.systemCommandResult.success).to.equal(true);
      expect(notification.data.systemCommandResult.errors).to.be.empty;
      expect(notification.data.systemCommandResult.flow_id).to.equal(this.getFlowID());
      expect(notification.data.systemCommandResult.message).to.equal(message);
      resolve();
    } catch (e) {
      return reject(e);
    }
  });
});
:
/* Restore and reset password */
Then('send command to reset password', TIMEOUTS, function () {
  return new Promise(async (resolve, reject) => {
    setTimeout(async () => {
      try {
        // get Keycloak params
        const responseKeycloakParams = await axios({
          method: 'get',
          url: config.services['initiatorgateway'].url + '/keycloak'
        });

        this.setKeycloakParams(responseKeycloakParams.data);

        let flowID = this.getFlowID();

        const mqProvider = await this.getMqProvider();
        const restorePasswordEmailMessages: Array<Message> =
          await getTopicMessagesFromLocalStorage('email.send', flowID, mqProvider);

        expect(restorePasswordEmailMessages).to.be.an('array');
        expect(restorePasswordEmailMessages).to.not.be.empty;

        const restorePasswordEmailMessage: Message = restorePasswordEmailMessages[0];

        logger.debug("------- DEBUG: restore password email message (restore pass): ",
          {flowID, restorePasswordEmailMessage}, stackTrace.get());



        this.setRestorePasswordToken(restorePasswordEmailMessage.body.message);


        logger.debug(" ------ DEBUG: restore password token (restore pass)",
          {
            flowID,
            restorePasswordToken: this.getRestorePasswordToken()
          }, stackTrace.get());

        const oldUserCreds: UserCreds = this.getUserCreds();

        const newPassword = uniqid();
        const resetPasswordCommandData = {
          restore_password_token: this.getRestorePasswordToken(),
          realm_name: this.getKeycloakParams().realmName,
          client_id: config.keycloak.realm.client_id,
          new_password: newPassword
        };

        this.setFlowID('tests_service_' + uniqid());

        flowID = this.getFlowID();

        const responseResetPasswordCommand =
          await sendCommand('user.resetPassword', flowID, resetPasswordCommandData, '', 'admin');

        logger.debug("----- DEBUG: responseResetPasswordCommandData: ",
          {
            flowID,
            responseResetPasswordCommandData: responseResetPasswordCommand.data
          }, stackTrace.get());

        setTimeout(async () => {
          const resetPasswordResultMessages: Array<Message> =
            await getTopicMessagesFromLocalStorage('system.commands.result', flowID, mqProvider);

          logger.debug("----- DEBUG: reset password result list messages: ",
            {flowID, resetPasswordResultMessages}, stackTrace.get());

          expect(resetPasswordResultMessages).to.be.an('array');
          expect(resetPasswordResultMessages).to.not.be.empty;
          expect(resetPasswordResultMessages.length > 0).to.eql(true);

          const resetPasswordResultMessage: Message = resetPasswordResultMessages[0];

          logger.debug("----- DEBUG: reset password result message: ",
            {flowID, resetPasswordResultMessage}, stackTrace.get());

          expect(this.getUserCreds()).to.not.be.empty;

          // check case: added user couldn't succefully login with old creds
          logger.debug("----- DEBUG: oldUserCreds: ", {oldUserCreds}, stackTrace.get());
          let userAccessToken;
          try {
            userAccessToken =
              await getAccessToken(config.keycloak.realm.client_id,
                this.getUserCreds().userEmail,
                this.getUserCreds().userPassword,
                this.getKeycloakParams().realmName);

            if (userAccessToken) {
              return reject('Error: it should be impossible to login with old creds after reseting password');
            }

          } catch (error) {
            expect(error.response.status).to.eql(401);
            expect(error.response.statusText).to.eql('Unauthorized');
          }

          // check case: added user can succefully login with new creds
          userAccessToken =
            await getAccessToken(config.keycloak.realm.client_id,
              this.getUserCreds().userEmail,
              newPassword,
              this.getKeycloakParams().realmName);

          logger.debug("----- DEBUG: user access token (with new creds after reset pass: should NOT be empty): ",
            {
              flowID,
              userEmail: this.getUserData().email,
              userAccessToken
            }, stackTrace.get());

          expect(userAccessToken).to.not.be.empty;

          resolve();
        }, 4000);

        setTimeout(async () => {
          return reject();
        }, 5000);
      } catch (e) {
        return reject(e);
      }
    }, 3000);
  });
});
