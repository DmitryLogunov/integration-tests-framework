import * as configComponent from "../lib/components/config";
import {World} from "cucumber";
import _ from 'lodash';
import {UserInterface} from "./lib/helpers/users.types";

export class BaseCustomWorld implements World {
  private accessToken: string;
  private userData?: UserInterface;
  private currentUser: object;
  private currentUserResponse: object;
  private flowID: string;
  private connectionID: string;
  private confServiceConfig: object;
  private serviceConfig: object;
  private consulConfig: object;
  private mqProvider: string;

  constructor() {
    this.accessToken = '';
    this.currentUser = {};
    this.currentUserResponse = {};
    this.flowID = '';
    this.connectionID = '';
    this.confServiceConfig = {};
    this.serviceConfig = {};
    this.consulConfig = {};
    this.mqProvider = '';
  }

  async setMqProvider() {
    if(_.isEmpty(this.consulConfig)) {
      await this.setConsulConfig();
    }
    this.mqProvider = this.getValueFromConsulConfig('common/messaging/provider');
  }

  async getMqProvider() {
    if (_.isEmpty(this.mqProvider)) {
      await this.setMqProvider();
    }
    return this.mqProvider;
  }

  async setConsulConfig() {
    this.consulConfig = await configComponent.getConfigFromConsul();
  }

  getConsulConfig() {
    return this.consulConfig;
  }

  getValueFromConsulConfig(key: string) {
    const keyPair = _
      .chain(this.consulConfig)
      .filter((pair) => {
        return pair.key === key;
      })
      .value();

    return keyPair[0].value;
  }

  setAccessToken(accessToken: string) {
    this.accessToken = accessToken;
  }

  getAccessToken() {
    return this.accessToken;
  }

  setUserData(userData: UserInterface) {
    this.userData = userData;
  }

  getUserData(): UserInterface {
    return <UserInterface> this.userData;
  }

  setCurrentUser(currentUser: object) {
    this.currentUser = currentUser;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  setConfServiceConfig(config: object) {
    this.confServiceConfig = config;
  }

  setServiceConfig(config: object) {
    this.serviceConfig = config;
  }

  getConfServiceConfig() {
    return this.confServiceConfig;
  }

  getServiceConfig() {
    return this.serviceConfig;
  }

  getCurrentUserResponse(): object {
    return this.currentUserResponse;
  }

  setCurrentUserResponse(value: object) {
    this.currentUserResponse = value;
  }

  getFlowID(): string {
    return this.flowID;
  }

  setFlowID(value: string) {
    this.flowID = value;
  }

  getConnectionID(): string {
    return this.connectionID;
  }

  setConnectionID(value: string) {
    this.connectionID = value;
  }
}
