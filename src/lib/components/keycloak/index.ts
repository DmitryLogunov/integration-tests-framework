import axios from 'axios';
import querystring from 'querystring';
import * as logger from '../logger';
import stackTrace from 'stack-trace';

import _ from 'lodash';

export default class KeycloakClient {

  constructor(realmName, KK_BASE_URL, client_id, accessToken) {
    if (!realmName) {
      throw new Error('Cannot initialize KeycloakClient as realmName cannot be null or empty');
    }

    if (!KK_BASE_URL) {
      throw new Error('Cannot initialize KeycloakClient as KK_BASE_URL cannot be null or empty');
    }

    if (!client_id) {
      throw new Error('Cannot initialize KeycloakClient as client_id cannot be null or empty');
    }

    this.realmName = realmName;
    this.KK_BASE_URL = KK_BASE_URL;
    this.client_id = client_id;

    this.accessToken = accessToken;
  }

  /**
   * Get Access Token
   *
   */
  async getAccessToken(username, password) {
    logger.info('Getting access token', {}, stackTrace.get());

    let accessToken;

    const params = {
      grant_type: 'password',
      username: username,
      password: password,
      client_id: this.client_id
    };

    const url = `${this.KK_BASE_URL}/auth/realms/${this.realmName}/protocol/openid-connect/token`;
    const formData = querystring.stringify(params);

    logger.info('request data', {url, formData}, stackTrace.get());

    let response;

    try {
      response = await axios({
        method: 'POST',
        url: url,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: formData
      });
    } catch (err) {
      const message = "Failed to get access token";
      this.throwError(err, message, 'ACCESS_TOKEN_FAILED');
    }

    accessToken = response.data.access_token;
    logger.info('Successfully get realm token', {accessToken}, stackTrace.get());
    return accessToken;
  };

  setAccessToken(accessToken) {
    logger.info('set access token', {accessToken}, stackTrace.get());
    this.accessToken = accessToken;
  }

  /**
   * Get Realm Data
   *
   *
   */
  async getRealmData() {
    logger.info('Getting realm data', {}, stackTrace.get());

    let response;

    if (this.accessToken) {
      try {
        response = await axios({
          method: 'GET',
          url: `${this.KK_BASE_URL}/auth/admin/realms/${this.realmName}`,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        });
      } catch (err) {
        const message = "Failed to get realm data";
        this.throwError(err, message, 'REALM_DATA_FAILED');
      }

      logger.info('Successfully get realm data', {
        responseData: response.data
      }, stackTrace.get());

      return response.data;
    } else {
      logger.error("No access token", {}, stackTrace.get());
      throw new Error("No access token", 403);
    }
  };

  /**
   * Get Realm Groups
   *
   *
   */
  async getRealmGroups() {
    logger.info('Getting realm groups', {}, stackTrace.get());

    if (this.accessToken) {
      let response;

      try {
        response = await axios({
          method: 'GET',
          url: `${this.KK_BASE_URL}/auth/admin/realms/${this.realmName}/groups`,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        });
      } catch (err) {
        const message = "Failed to get realm groups";
        this.throwError(err, message, 'REALM_GROUPS_FAILED');
      }

      logger.info('Successfully get realm data', {
        responseStatus: response.status,
        responseData: response.data
      }, stackTrace.get());

      return response.data;
    } else {
      logger.error("No access token", {}, stackTrace.get());
      throw new Error("No access token", 403);
    }
  };

  /**
   * https://www.keycloak.org/docs-api/3.0/rest-api/index.html#_users_resource
   * @param value
   * @param propertyName
   * @returns {Promise<*>}
   */
  async retrieveUserByProperty(value, propertyName = 'username') {
    logger.info(`Retrieve User By ${propertyName}`, {value}, stackTrace.get());

    if (!this.accessToken) {
      logger.error("No access token", {}, stackTrace.get());
      throw new Error("No access token", 403);
    }
    const url = `${this.KK_BASE_URL}/auth/admin/realms/${this.realmName}/users?${propertyName}=${value}`;
    logger.info('request data', {url}, stackTrace.get());

    try {
      const response = await axios({
        method: 'get',
        url: url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (response.data && response.data.length && response.data[0][propertyName] === value) {
        logger.info('User successfully retrieved', {
          responseStatus: response.status,
          responseData: response.data
        }, stackTrace.get());
        const resultUser = response.data[0];

        try {
          resultUser.roles = await this.retrieveUserRoleMappings(resultUser.id);
        } catch (e) {
          resultUser.roles = null;
          logger.warn("Failed to update user by roles");
        }

        return resultUser;
      } else {
        return false;
      }
    } catch (err) {
      const message = 'Failed to retrieve user by property';
      this.throwError(err, message, 'USER_RETRIEVE_FAILED');
    }
  };

  /**
   * https://www.keycloak.org/docs-api/3.0/rest-api/index.html#_users_resource
   * @param userId
   * @returns {Promise<void>}
   */
  async retrieveUserByUserId(userId) {
    logger.info('Retrieve User By UserId', {userId}, stackTrace.get());

    if (this.accessToken) {
      let response = null;

      const url = `${this.KK_BASE_URL}/auth/admin/realms/${this.realmName}/users/${userId}`;
      logger.info('request data', {url}, stackTrace.get());

      try {
        response = await axios({
          method: 'GET',
          url: url,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
          }
        })
      } catch (err) {
        const message = "Failed to retrieve user by user id";
        this.throwError(err, message, 'USER_RETRIEVE_FAILED');
      }

      logger.info('User successfully retrieved', {
        responseStatus: response.status,
        responseData: response.data
      }, stackTrace.get());

      const resultUser = response.data;
      // will update it with him's role mappings
      try {
        resultUser.roles = await this.retrieveUserRoleMappings(resultUser.id);
      } catch (e) {
        resultUser.roles = null;
        logger.warn("Failed to update user by roles");
      }

      return resultUser;
    } else {
      logger.error("No access token", {}, stackTrace.get());
      throw new Error("No access token", 403);
    }
  };


  /**
   * Create new user
   *
   * @param string realmName
   * @param array data
   *
   */
  async createNewUser(data) {
    logger.info('Creating new user', {data}, stackTrace.get());

    if (this.accessToken) {
      let response = null;
      const url = `${this.KK_BASE_URL}/auth/admin/realms/${this.realmName}/users`;

      logger.info('request data', {url, data}, stackTrace.get());

      try {
        response = await axios({
          method: 'POST',
          url: url,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
          },
          data
        })
      } catch (err) {
        const message = "Failed to create new user";
        this.throwError(err, message, 'USER_CREATE_FAILED');
      }

      logger.info('User successfully created', {responseStatus: response.status}, stackTrace.get());
      return await this.retrieveUserByProperty(data.username);
    } else {
      logger.error("No access token", {}, stackTrace.get());
      throw new Error("No access token", 403);
    }
  };

  /**
   *
   * @param data
   * @param realmRolesToAssign
   * @param clientRolesToAssign - do not use for now
   * @returns {Promise<void>}
   */
  async createNewUserWithRoles(data, realmRolesToAssign, clientRolesToAssign) {
    logger.info('Creating new user with roles', {
      data,
      realmRolesToAssign: realmRolesToAssign,
      clientRolesToAssign: clientRolesToAssign
    }, stackTrace.get());

    if (this.accessToken) {
      const createdUser = await this.createNewUser(data);

      logger.info('createdUser', {createdUser}, stackTrace.get());

      // update with realm roles
      await this.addRealmLevelRoleMappingsToUser(createdUser.id, realmRolesToAssign);

      // update with client level roles
      await this.addClientLevelRoleMappingsToUser(createdUser.id, clientRolesToAssign);

      return await this.retrieveUserByUserId(createdUser.id);
    } else {
      logger.error("No access token", {}, stackTrace.get());
      throw new Error("No access token", 403);
    }
  }

  /**
   *
   * @param userId
   * @returns {Promise<*>}
   */
  async getRealmLevelRolesWhatCanBeMappedForUser(userId) {
    logger.info('Get realm-level roles that can be mapped', {}, stackTrace.get());

    if (this.accessToken) {
      let response = null;

      logger.info("accessToken successfully retrieved", {}, stackTrace.get());

      const url = `${this.KK_BASE_URL}/auth/admin/realms/${this.realmName}/users/${userId}/role-mappings/realm/available`;

      logger.info('request data', {url}, stackTrace.get());

      try {
        response = await axios({
          method: 'GET',
          url: url,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        })
      } catch (err) {
        const message = "Failed to get realm-level roles that can be mapped";
        this.throwError(err, message, 'GET_USER_MAPPED_REALM_ROLES_FAILED');
      }

      logger.info('Got realm-level roles that can be mapped', {responseData: response.status}, stackTrace.get());
      return response.data;
    } else {
      logger.error("No access token", {}, stackTrace.get());
      throw new Error("No access token", 403);
    }
  }

  /**
   *
   * @param userId
   * @returns {Promise<*>}
   */
  async getClientLevelRolesWhatCanBeMappedForUser(userId) {
    logger.info('Get role-level roles that can be mapped', {}, stackTrace.get());

    if (this.accessToken) {
      let response = null;

      logger.info("accessToken successfully retrieved", {}, stackTrace.get());

      const url = `${this.KK_BASE_URL}/auth/admin/realms/${this.realmName}/users/${userId}/role-mappings/clients/${this.client_id}/available`;

      logger.info('request data', {url}, stackTrace.get());

      try {
        response = await axios({
          method: 'GET',
          url: url,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        })
      } catch (err) {
        const message = "Failed to get client-level roles that can be mapped";
        this.throwError(err, message, 'GET_USER_MAPPED_CLIENT_ROLES_FAILED');
      }

      logger.info('Got client-level roles that can be mapped', {responseStatus: response.status}, stackTrace.get());
      return response.data;
    } else {
      logger.error("No access token", {}, stackTrace.get());
      throw new Error("No access token", 403);
    }
  }

  /**
   *
   * @param userId
   * @param redirect_uri
   * @returns {Promise<boolean>}
   *
   * data: https://www.keycloak.org/docs-api/4.0/rest-api/index.html#_users_resource
   *
   */
  async sendVerificationEmail(userId, redirect_uri) {
    logger.info('Sending verification email to user', {}, stackTrace.get());

    if (this.accessToken) {
      let response;

      let url = `${this.KK_BASE_URL}/auth/admin/realms/${this.realmName}/users/${userId}/send-verify-email?client_id=${this.client_id}&redirect_uri=${redirect_uri || this.KK_BASE_URL}`;

      logger.info('request data', {url}, stackTrace.get());

      try {
        response = await axios({
          method: 'PUT',
          url: url,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
          }
        })
      } catch (err) {
        const message = "Failed to send verification email";
        this.throwError(err, message, 'SEND_VERIFICATION_EMAIL_FAILED');
      }

      logger.info('Verification email should be send', {responseStatus: response.status}, stackTrace.get());
      return true;
    } else {
      logger.error("No access token", {}, stackTrace.get());
      throw new Error("No access token", 403);
    }
  }

  /**
   * Remove all user sessions associated with the user Also send notification to all clients that have an admin URL to invalidate the sessions for the particular user.
   * @param userId
   * @returns {Promise<*>}
   */
  async userLogout(userId) {
    logger.info('Logout', {userId}, stackTrace.get());

    if (this.accessToken) {
      let response;

      const url = `${this.KK_BASE_URL}/auth/admin/realms/${this.realmName}/users/${userId}/logout`;

      logger.info('request data', {url, userId}, stackTrace.get());

      try {
        response = await axios({
          method: 'POST',
          url: url,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        })
      } catch (err) {
        const message = "Failed to logout";
        this.throwError(err, message, 'LOGOUT_FAILED');
      }

      logger.info('User Successfully logout', {responseStatus: response.status}, stackTrace.get());

      return (response && response.status === 204);
    } else {
      logger.error("No access token", {}, stackTrace.get());
      throw new Error("No access token", 403);
    }
  };

  /**
   * Delete the user
   * @param userId
   * @returns {Promise<*>}
   */
  async deleteUser(userId) {
    logger.info('Delete user', {userId}, stackTrace.get());

    if (this.accessToken) {
      let response;

      const url = `${this.KK_BASE_URL}/auth/admin/realms/${this.realmName}/users/${userId}`;

      logger.info('request data', {url, userId}, stackTrace.get());

      try {
        response = await axios({
          method: 'DELETE',
          url: url,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        })
      } catch (err) {
        const message = "Failed to delete user";
        this.throwError(err, message, 'DELETE_USER_FAILED');
      }

      logger.info('User Successfully deleted', {responseStatus: response.status}, stackTrace.get());

      return true;
    } else {
      logger.error("No access token", {}, stackTrace.get());
      throw new Error("No access token", 403);
    }
  }

  /**
   * Update user email
   * @param userId
   * @param newEmail
   * @returns {Promise<*>}
   */
  async updateUserEmail(userId, newEmail) {
    logger.info('Update user email', {userId, newEmail}, stackTrace.get());

    if (this.accessToken) {
      let response;
      const url = `${this.KK_BASE_URL}/auth/admin/realms/${this.realmName}/users/${userId}`;
      const data = {email: newEmail};

      logger.info('request data', {url, userId, data}, stackTrace.get());

      try {
        response = await axios({
          method: 'PUT',
          url: url,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
          },
          data
        })
      } catch (err) {
        const message = "Failed to update user email";
        this.throwError(err, message, 'UPDATE_USER_EMAIL_FAILED');
      }

      logger.info('Successfully updated user email', {responseStatus: response.status}, stackTrace.get());
      return true;
    } else {
      logger.error("No access token", {}, stackTrace.get());
      throw new Error("No access token", 403);
    }
  }

  /**
   * Activate user
   * @param userId
   * @returns {Promise<*>}
   */
  async activateUser(userId) {
    logger.info('Activate user', {userId}, stackTrace.get());

    if (this.accessToken) {
      let response;

      const url = `${this.KK_BASE_URL}/auth/admin/realms/${this.realmName}/users/${userId}`;
      const data = {enabled: true};

      logger.info('request data', {url, userId, data}, stackTrace.get());

      try {
        response = await axios({
          method: 'PUT',
          url: url,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
          },
          data
        })
      } catch (err) {
        const message = "Failed to activate user";
        this.throwError(err, message, 'ACTIVATE_USER_FAILED');
      }

      logger.info('User successfully activated', {responseStatus: response.status}, stackTrace.get());
      return true;
    } else {
      logger.error("No access token", {}, stackTrace.get());
      throw new Error("No access token", 403);
    }
  }

  /**
   * Deactivate user
   * @param userId
   * @returns {Promise<*>}
   */
  async deactivateUser(userId) {
    logger.info('Dectivate user', {userId}, stackTrace.get());

    if (this.accessToken) {

      let response;

      const url = `${this.KK_BASE_URL}/auth/admin/realms/${this.realmName}/users/${userId}`;
      const data = {enabled: false};

      logger.info('request data', {url, userId, data}, stackTrace.get());

      try {
        response = await axios({
          method: 'PUT',
          url: url,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
          },
          data
        })
      } catch (err) {
        const message = "Failed to deactivate user";
        this.throwError(err, message, 'DEACTIVATE_USER_FAILED');
      }

      logger.info('User successfully deactivated', {responseStatus: response.status}, stackTrace.get());
      return true;
    } else {
      logger.error("No access token", {}, stackTrace.get());
      throw new Error("No access token", 403);
    }
  }

  /**
   * Reset password (allow to setup a temporary password for user, user will have to reset the temporary password next time they log in.)
   * @param userId
   * @param tempPassword
   * @returns {Promise<*>}
   */
  async resetPassword(userId, tempPassword) {
    logger.info('Reset password', {userId}, stackTrace.get());

    if (this.accessToken) {
      let response;

      const url = `${this.KK_BASE_URL}/auth/admin/realms/${this.realmName}/users/${userId}/reset-password`;
      const data = {
        type: 'password',
        temporary: false,
        value: tempPassword
      };
      logger.info('request data', {url, userId, data}, stackTrace.get());

      try {
        response = await axios({
          method: 'PUT',
          url: url,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
          },
          data
        })
      } catch (err) {
        const message = "Failed to reset password";
        this.throwError(err, message, 'RESET_USER_PASSWORD_FAILED');
      }

      logger.info('Password successfully reset', {responseStatus: response.status}, stackTrace.get());
      return true;
    } else {
      logger.error("No access token", {}, stackTrace.get());
      throw new Error("No access token", 403);
    }
  }

  async restorePassword(userId, redirectUri, tokenLifespan) {
    logger.info('Restore password', {userId}, stackTrace.get());

    const url = `${this.KK_BASE_URL}/auth/admin/realms/${this.realmName}/users/${userId}/execute-actions-email?lifespan=${tokenLifespan || 43200}&client_id=${this.client_id}&redirect_uri=${encodeURIComponent(redirectUri || this.KK_BASE_URL)}`;
    const data = ['UPDATE_PASSWORD'];
    logger.info('request data', {url, data}, stackTrace.get());


    const response = await axios({
      method: 'PUT',
      url: url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      },
      data
    });

    logger.info('Password restore email successfully sent', {responseStatus: response.status}, stackTrace.get());
    return true;
  }

  /**
   *
   * @param data
   * @returns {Promise<boolean>}
   */
  async exportRealm(data) {
    logger.info('Export realm', {data}, stackTrace.get());

    if (this.accessToken) {
      let response;

      const url = `${this.KK_BASE_URL}/auth/admin/realms`;

      logger.info('request data', {url: url, data}, stackTrace.get());

      try {
        response = await axios({
          method: 'POST',
          url: url,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
          },
          data
        })
      } catch (err) {
        const message = "Failed to export realm";
        this.throwError(err, message, 'REALM_EXPORT_FAILED');
      }

      logger.info('Realm successfully exported', {responseStatus: response.status}, stackTrace.get());
      return true;
    } else {
      logger.error("No access token", {}, stackTrace.get());
      throw new Error("No access token", 403);
    }
  }

  /**
   * Updates the top-level information of the realm Any user, roles or client information in the representation will be ignored.
   *
   * https://www.keycloak.org/docs-api/3.0/rest-api/index.html#_realms_admin_resource
   *
   * @param realmName
   * @param data
   * @returns {Promise<boolean>}
   */
  async updateTopLevelInformationOfRealm(data) {
    logger.info('Update Top Level Information Of Realm', {realm: this.realmName, data}, stackTrace.get());

    if (this.accessToken) {
      let response;

      const url = `${this.KK_BASE_URL}/auth/admin/realms/${this.realmName}`;

      logger.info('request data', {url: url, data}, stackTrace.get());

      try {
        response = await axios({
          method: 'PUT',
          url: url,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
          },
          data
        })
      } catch (err) {
        const message = "Failed to update top level information of realm";
        this.throwError(err, message, 'UPDATING_REALM_TOP_LEVEL_INFORMATION_FAILED');
      }

      logger.info('Top level information of realm Successfully updated', {responseStatus: response.status}, stackTrace.get());
      return true;
    } else {
      logger.error("No access token", {}, stackTrace.get());
      throw new Error("No access token", 403);
    }
  }

  /**
   * Get all roles for the realm or client
   *
   * @returns {Promise<*>}
   */
  async retrieveAllRealmRoles() {
    logger.info('Retrieve all realm roles', {}, stackTrace.get());

    if (this.accessToken) {
      let response;

      const url = `${this.KK_BASE_URL}/auth/admin/realms/${this.realmName}/roles`;

      logger.info('request data', {url: url}, stackTrace.get());

      try {
        response = await axios({
          method: 'GET',
          url: url,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        })
      } catch (err) {
        const message = "Failed to retrieve all realm roles";
        this.throwError(err, message, 'RETRIEVING_ALL_REALM_ROLES_FAILED');
      }

      logger.info('All realm level roles successfully retrieved', {responseStatus: response.status}, stackTrace.get());
      return response.data;
    } else {
      logger.error("No access token", {}, stackTrace.get());
      throw new Error("No access token", 403);
    }
  }

  /**
   * Get realm role by role name
   *
   * @param roleName
   * @returns {Promise<*>}
   */
  async retrieveRealmRoleByName(roleName) {
    logger.info('Retrieve realm role by name', {roleName}, stackTrace.get());

    if (this.accessToken) {
      let response;

      const url = `${this.KK_BASE_URL}/auth/admin/realms/${this.realmName}/roles/${roleName}`;

      logger.info('request data', {url: url, roleName}, stackTrace.get());

      try {
        response = await axios({
          method: 'GET',
          url: url,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        })
      } catch (err) {
        const message = "Failed to retrieve realm role by name";
        this.throwError(err, message, 'RETRIEVING_REAM_ROLE_BY_NAME_FAILED');
      }

      logger.info('Realm level role successfully retrieved by role name', {responseStatus: response.status}, stackTrace.get());
      return response.data;
    } else {
      logger.error("No access token", {}, stackTrace.get());
      throw new Error("No access token", 403);
    }
  }

  /**
   * Update a realm role by name
   *
   * @param roleName
   * @param data
   * @returns {Promise<*>}
   */
  async updateRealmRoleByName(roleName, data) {
    logger.info('Update realm role by name', {roleName, data}, stackTrace.get());

    if (this.accessToken) {
      let response;

      const url = `${this.KK_BASE_URL}/auth/admin/realms/${this.realmName}/roles/${roleName}`;

      logger.info('request data', {url: url, roleName, data}, stackTrace.get());

      try {
        response = await axios({
          method: 'PUT',
          url: url,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
          },
          data
        })
      } catch (err) {
        const message = "Failed to update realm role by name";
        this.throwError(err, message, 'UPDATING_REAM_ROLE_BY_NAME_FAILED');
      }

      logger.info('Realm level role successfully updated by role name', {responseStatus: response.status}, stackTrace.get());
      return true;
    } else {
      logger.error("No access token", {}, stackTrace.get());
      throw new Error("No access token", 403);
    }
  }

  /**
   * Delete a realm role by name
   *
   * @param roleName
   * @returns {Promise<*>}
   */
  async deleteRealmRoleByName(roleName) {
    logger.info('Delete realm role by name', {roleName}, stackTrace.get());

    if (this.accessToken) {
      let response;

      const url = `${this.KK_BASE_URL}/auth/admin/realms/${this.realmName}/roles/${roleName}`;

      logger.info('request data', {url: url, roleName}, stackTrace.get());

      try {
        response = await axios({
          method: 'DELETE',
          url: url,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        })
      } catch (err) {
        const message = "Failed to delete realm role by name";
        this.throwError(err, message, 'DELETING_REAM_ROLE_BY_NAME_FAILED');
      }

      logger.info('Realm level role successfully deleted by role name', {responseStatus: response.status}, stackTrace.get());
      return true;
    } else {
      logger.error("No access token", {}, stackTrace.get());
      throw new Error("No access token", 403);
    }
  }

  /**
   * Create realm role
   *
   * @param data
   * @returns {Promise<*>}
   */
  async createRealmRole(data) {
    logger.info('Create realm role', {data}, stackTrace.get());

    if (this.accessToken) {
      let response;

      const url = `${this.KK_BASE_URL}/auth/admin/realms/${this.realmName}/roles`;

      logger.info('request data', {url: url, data}, stackTrace.get());

      try {
        response = await axios({
          method: 'POST',
          url: url,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
          },
          data
        })
      } catch (err) {
        const message = "Failed to create realm role";
        this.throwError(err, message, 'CREATING_REAM_ROLE_BY_NAME_FAILED');
      }

      logger.info('Realm level role successfully created', {responseStatus: response.status}, stackTrace.get());
      return true;
    } else {
      logger.error("No access token", {}, stackTrace.get());
      throw new Error("No access token", 403);
    }
  }

  async deleteRealmLevelRoleMappingsFromUser(userId, rolesToDelete) {
    logger.info('Delete realm level role mappings from user', {userId, rolesToDelete}, stackTrace.get());

    if (this.accessToken) {

      if (rolesToDelete && rolesToDelete.length > 0) {
        try {
          const userRoles = await this.retrieveUserRoleMappings(userId);
          const userRolesToDelete = _.filter(userRoles.realmMappings || [], (rm) => _.indexOf(rolesToDelete, rm.name) > -1);

          logger.info("The next realm roles mappings will be deleted from user: " + JSON.stringify(userRolesToDelete));

          const url = `${this.KK_BASE_URL}/auth/admin/realms/${this.realmName}/users/${userId}/role-mappings/realm`;
          logger.info('request data', {url, userRolesToDelete}, stackTrace.get());

          try {
            await axios({
              method: 'DELETE',
              url: url,
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.accessToken}`
              },
              data: userRolesToDelete
            })
          } catch (err) {
            logger.error("Failed to delete realm level role mappings from user", {reason: err && err.response ? err.response.status + ":" + err.response.statusText : "Unknown reason"}, stackTrace.get());
          }
        } catch (e) {
          logger.error("Failed to remove realm level role mappings from user", {e}, stackTrace.get());
        }
      }
      logger.info('Realm level role mappings successfully deleted from user');
      return true;
    } else {
      logger.error("No access token", {}, stackTrace.get());
      throw new Error("No access token", 403);
    }
  }

  async addRealmLevelRoleMappingsToUser(userId, realmRolesToAssign) {
    logger.info('Add realm level role mappings to user', {userId, realmRolesToAssign}, stackTrace.get());

    if (this.accessToken) {
      if (realmRolesToAssign && realmRolesToAssign.length > 0) {
        try {
          const availableRealmRoles = await this.getRealmLevelRolesWhatCanBeMappedForUser(userId);
          logger.info("availableRealmRoles: " + JSON.stringify(availableRealmRoles));

          const realmRoles = _.filter(availableRealmRoles, (availableRole) => {
            return _.indexOf(realmRolesToAssign, availableRole.name) !== -1
          });

          logger.info("The next realm roles will be mapped to user: " + JSON.stringify(realmRoles));

          const url = `${this.KK_BASE_URL}/auth/admin/realms/${this.realmName}/users/${userId}/role-mappings/realm`;
          logger.info('request data', {url, realmRoles}, stackTrace.get());

          let response = null;

          try {
            response = await axios({
              method: 'POST',
              url: url,
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.accessToken}`
              },
              data: realmRoles
            })
          } catch (err) {
            logger.error("Failed to update user with realm roles", {reason: err && err.response ? err.response.status + ":" + err.response.statusText : "Unknown reason"}, stackTrace.get());
          }

          if (response) {
            logger.info('User successfully updated with realm roles', {responseStatus: response.status}, stackTrace.get());
          }
        } catch (e) {
          logger.error("Failed to update user with realm roles", {e}, stackTrace.get());
        }
      }
      logger.info('Realm level role mappings successfully added to user');
      return true;
    } else {
      logger.error("No access token", {}, stackTrace.get());
      throw new Error("No access token", 403);
    }
  }

  async addClientLevelRoleMappingsToUser(userId, clientRolesToAssign) {
    logger.info('Add client level role mappings to user', {userId, clientRolesToAssign}, stackTrace.get());

    if (this.accessToken) {
      if (clientRolesToAssign && clientRolesToAssign.length > 0) {
        try {
          const availableClientsRoles = await this.getClientLevelRolesWhatCanBeMappedForUser(userId);
          logger.info("availableClientsRoles: " + JSON.stringify(availableClientsRoles));

          const clientRoles = _.filter(availableClientsRoles, (availableRole) => {
            return _.indexOf(clientRolesToAssign, availableRole.name) !== -1
          });

          logger.info("The next realm roles will be mapped to user: " + JSON.stringify(clientRoles));

          const url = `${this.KK_BASE_URL}/auth/admin/realms/${this.realmName}/users/${userId}/role-mappings/clients/${this.client_id}`;
          logger.info('request data', {url, clientRoles}, stackTrace.get());

          let response = null;

          try {
            response = await axios({
              method: 'POST',
              url: url,
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.accessToken}`
              },
              data: clientRoles
            })
          } catch (err) {
            logger.error("Failed to update user with client roles", {reason: err && err.response ? err.response.status + ":" + err.response.statusText : "Unknown reason"}, stackTrace.get());
          }

          if (response) {
            logger.info('User successfully updated with client roles', {responseData: response.status}, stackTrace.get());
          }
        } catch (e) {
          logger.error("Failed to update user with client roles", {e}, stackTrace.get());
        }
      }
      logger.info('Client level role mappings successfully added to user');
      return true;
    } else {
      logger.error("No access token", {}, stackTrace.get());
      throw new Error("No access token", 403);
    }
  }

  /**
   * Get user role mappings
   * @param userId
   * @returns {Promise<boolean>}
   */
  async retrieveUserRoleMappings(userId) {
    logger.info('Retrieve User Role mappings', {userId}, stackTrace.get());

    if (this.accessToken) {

      let response;

      const url = `${this.KK_BASE_URL}/auth/admin/realms/${this.realmName}/users/${userId}/role-mappings`;

      logger.info('request data', {url, userId}, stackTrace.get());

      try {
        response = await axios({
          method: 'GET',
          url: url,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
          }
        })
      } catch (err) {
        const message = "Failed retrieve User Role mappings";
        this.throwError(err, message, 'RETRIEVING_USER_ROLE_MAPPINGS_FAILED');
      }

      logger.info('Successfully Retrieve User Role mappings', {
        responseStatus: response.status,
        result: response.data
      }, stackTrace.get());

      return response.data;
    } else {
      logger.error("No access token", {}, stackTrace.get());
      throw new Error("No access token", 403);
    }
  }

  /**
   *
   * @param userId
   * @param realmRolesToReplace
   * @returns {Promise<boolean>}
   */
  async replaceUserRoles(userId, realmRolesToReplace) {
    logger.info('Replace realm level user roles', {userId, realmRolesToReplace}, stackTrace.get());

    if (this.accessToken) {
      const userRoles = await this.retrieveUserRoleMappings(userId);

      if (userRoles.realmMappings) {
        logger.info('Will remove all current realm role mappings for user', {
          userId,
          realmMappings: userRoles.realmMappings
        }, stackTrace.get());

        await this.deleteRealmLevelRoleMappingsFromUser(userId, userRoles.realmMappings);
      }

      await this.addRealmLevelRoleMappingsToUser(userId, realmRolesToReplace);

      logger.info('Realm level user roles successfully replaced', stackTrace.get());
      return true;
    } else {
      logger.error("No access token", {}, stackTrace.get());
      throw new Error("No access token", 403);
    }
  }

  /**
   *
   * @param userId
   * @param realmRolesToAssign
   * @param realmRolesToDelete
   * @returns {Promise<boolean>}
   */
  async updateUserRoles(userId, realmRolesToAssign, realmRolesToDelete) {
    logger.info('Update user roles', {userId, realmRolesToAssign, realmRolesToDelete}, stackTrace.get());

    if (this.accessToken) {
      await this.deleteRealmLevelRoleMappingsFromUser(userId, realmRolesToDelete);
      await this.addRealmLevelRoleMappingsToUser(userId, realmRolesToAssign);

      logger.info('User roles successfully updated', {}, stackTrace.get());
      return true;
    } else {
      logger.error("No access token", {}, stackTrace.get());
      throw new Error("No access token", 403);
    }
  }

  /**
   *
   * @param err
   * @param message
   * @param code
   * @throws KeycloakError
   */
  throwError(err, message, code) {
    const reason = err && err.response ? err.response.status + ":" + err.response.statusText : "Unknown reason";
    logger.error(message, {reason}, stackTrace.get());
    throw new Error(`${message}: ${reason}`, code);
  }
}
