import {getTopic, getTopicMessagesFromLocalStorage} from "../../../lib/localStorage";
import {UMCustomWorld, UserCreds} from "../../features/um/support/world";
import * as logger from "../../../lib/components/logger/index";
import {Message} from "../../../lib/components/messages/index";
import _ from 'lodash';
import stackTrace from 'stack-trace';

/**
 * searchAndParseMagicLinkInEmailCommandMessage
 */
export class MagicLinkParser {

  protected readonly localStorageConfigPath: string;

  public constructor(localStorageConfigPath: string, mqProvider: string) {
    this.localStorageConfigPath = localStorageConfigPath;
    this.mqProvider = mqProvider;
  }

  /**
   * @param {string} flowID
   * @returns {object}
   */
  public async parse(flowID: string): Promise<UserCreds | null> {
    const emailSendTopic: string | null = await getTopic(this.localStorageConfigPath, 'email.send');

    if (!emailSendTopic) {
      return null;
    }

    const emailSendMessages: Array<Message> =
      await getTopicMessagesFromLocalStorage(emailSendTopic, flowID, this.mqProvider);

    if (_.isEmpty(emailSendMessages) || !_.has(emailSendMessages, 'length') || emailSendMessages.length === 0) {
      return null;
    }

    const emailSendToActivateUserMessage = emailSendMessages[0];
    const emailSendToActivateUserMessageText = emailSendToActivateUserMessage.body.message;

    logger.debug(" ----- DEBUG ----- emailSendtoActivateUserMessageText", {emailSendToActivateUserMessageText}, stackTrace.get());

    const magicLinkParsedList =
      _.map(emailSendToActivateUserMessageText.match(/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/gi),
        (item: string) => {
          return item.replace("\">link</a>", "")
        });

    if (_.isEmpty(magicLinkParsedList) || !_.has(magicLinkParsedList, 'length') || magicLinkParsedList.length === 0) {
      return null;
    }

    const magicLink = magicLinkParsedList[0];
    const magicLinkParts: string[] = _.split(magicLink, "/");

    logger.debug(" ----- DEBUG ----- magicLinkParts", {magicLinkParts}, stackTrace.get());

    if (_.isEmpty(magicLinkParts) || !_.has(magicLinkParts, 'length') || magicLinkParts.length < 4) {
      return null;
    }

    const magicCode = magicLinkParts[3];

    let magicCodeBuffer = new Buffer(magicCode, 'base64');
    const magicCodeString = magicCodeBuffer.toString();

    logger.debug(" ----- DEBUG ----- magicCodeString", {magicCodeString}, stackTrace.get());

    const magicCodeParts = _.split(magicCodeString, ":");

    if (_.isEmpty(magicLinkParsedList) || !_.has(magicLinkParsedList, 'length') || magicLinkParsedList.length === 0) {
      return null;
    }

    return {
      userEmail: magicCodeParts[0],
      userPassword: magicCodeParts[1]
    };
  };

}
