import {config} from './config';
import axios from 'axios';
import {getAccessToken} from './command';
import {AxiosResponseInterface} from "../../../common.types";
import {UserInterface} from "./users.types";

import _ from 'lodash';

/**
 *  Generate fake user data
 */
export const generateUserData = (): UserInterface => {
  const date_now: number = Date.now();

  const userData: UserInterface = {
      username: `usr_${date_now}`,
      firstname: "Peter",
      lastname: "Petrov",
      email: `email_${date_now}@gmail.com`,
      realmRoles: "testrole",
      emailVerified: true,
      clientRoles: "testrole",
      additionalInfo: {
          redirect_uri: config.keycloak.verify_email_redirect_uri,
          send_verification_email: true,
          message_subject: 'Activation email from test service',
          message_text: 'Text of activation email',
          message_from_address: 'test@email.com',
          message_from_name: 'Tests Service',
          message_to_address: `email_${date_now}@gmail.com`
      }
  };

  return userData;
};

/**
 * Find user in users by params in data
 *
 */
export const findUserInList = (wantedUserData: UserInterface, listUsers: Array<UserInterface>): UserInterface | {} => {
  for (const user of listUsers) {
    if (user.email === wantedUserData.email && user.username === wantedUserData.username) {
      return user;
    }
  }
  return {};
};

/**
 * getAllUsersFromKeycloak()
 */
export const getAllUsersFromKeycloak = async (): Promise<Array<UserInterface>> => {
  const responseKeycloakParams = await axios({
    method: 'get',
    url: config.services['initiatorgateway'].url + '/keycloak'
  });
  const keycloakParams = responseKeycloakParams.data;
  const accessToken = await getAccessToken();
  const getUsersUrl = `${keycloakParams.authServerUrl}/admin/realms/${keycloakParams.realmName}/users`;

  const allUsersResponse: AxiosResponseInterface = await axios({
    method: 'get',
    url: `${getUsersUrl}?max=1000`,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Access-Control-Allow-Origin': '*'
    }
  });

  return <Array<UserInterface>>allUsersResponse.data;
};

/**
 * Get sessions associated with the user
 */
export const getUserSessionsFromKeycloak = async (id: string): Promise<any> => {
    const responseKeycloakParams = await axios({
        method: 'get',
        url: config.services['initiatorgateway'].url + '/keycloak'
    });
    const keycloakParams = responseKeycloakParams.data;
    const accessToken = await getAccessToken();
    const getUserSessionsUrl = `${keycloakParams.authServerUrl}/admin/realms/${keycloakParams.realmName}/users/${id}/sessions`;

    const userSessions: AxiosResponseInterface = await axios({
        method: 'get',
        url: getUserSessionsUrl,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Access-Control-Allow-Origin': '*'
        }
    });

    return userSessions;
};

/**
 *
 */
export const checkUserExists = async (userData: UserInterface) => {
  const listAllRealmUsers = await getAllUsersFromKeycloak();

  if (_.isEmpty(listAllRealmUsers)) {
    return false;
  }

  try {
    const wantedUser = findUserInList(userData, listAllRealmUsers);
    return !_.isEmpty(wantedUser);
  } catch (error) {
    return false;
  }
};
