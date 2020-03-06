import {BaseCustomWorld} from "../../../base-world";

export interface KeycloakParams {
  realmName?: string;
}

export interface UserCreds {
  userEmail?: string;
  userPassword?: string;
}

export class UMCustomWorld extends BaseCustomWorld {
  private keycloakParams: KeycloakParams;
  private userCreds: UserCreds;
  private resultTopic: string;
  private restorePasswordToken: string;

  constructor() {
    super();

    this.keycloakParams = {};
    this.userCreds = {};
    this.resultTopic = '';
    this.restorePasswordToken = '';
  }

  setUserAddedId(value: string) {
    let user = this.getUserData();
    user.userID = value;
    this.setUserData(user);
  }

  getUserAddedId(): string | undefined {
    return this.getUserData().userID;
  }

  setKeycloakParams(value: KeycloakParams) {
    this.keycloakParams = value;
  }

  getKeycloakParams(): KeycloakParams {
    return this.keycloakParams;
  }

  setUserCreds(value: UserCreds) {
    this.userCreds = value;
  }

  getUserCreds(): UserCreds {
    return this.userCreds;
  }

  setResultTopic(value: string) {
    this.resultTopic = value;
  }

  getResultTopic() {
    return this.resultTopic;
  }

  setRestorePasswordToken(value: string) {
    this.restorePasswordToken = value;
  }

  getRestorePasswordToken() {
    return this.restorePasswordToken;
  }

}