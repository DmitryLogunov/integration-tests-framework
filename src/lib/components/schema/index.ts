import Ajv from 'ajv';
import * as logger from '../logger';
import stackTrace from 'stack-trace';
import {Message} from '../messages';


interface SchemaPaths {
  main?: string
  definitions?: string
}


function validate(message: Message, command: string, schemePaths: SchemaPaths = {}): boolean {
  const ajv = new Ajv;
  let schemaMainPath;
  let schemaDefinitionsPath;

  try {
    ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));
  } catch (error) {
    logger.warn("Warning from AJV meta scheme adding process", {error: error.message}, stackTrace.get());
  }

  try {
    ajv.addSchema(require('dlp-service-schema/message/header.json'));
    ajv.addSchema(require('dlp-service-schema/message/origin.json'));
  } catch (error) {
    logger.warn("Warning from AJV add default schemes (header.json, origin.json)", {error: error.message}, stackTrace.get());
  }

  switch (command.toLowerCase()) {
    case 'halo': {
      schemaMainPath = 'dlp-service-schema/message/admin/Halo.json';
      schemaDefinitionsPath = 'dlp-service-schema/message/admin/definitions.json';
      break;
    }
    case 'haloemit': {
      schemaMainPath = 'dlp-service-schema/message/admin/HaloEmit.json';
      schemaDefinitionsPath = 'dlp-service-schema/message/admin/definitions.json';
      break;
    }
    case 'logflush': {
      schemaMainPath = 'dlp-service-schema/message/admin/LogFlush.json';
      schemaDefinitionsPath = 'dlp-service-schema/message/admin/definitions.json';
      break;
    }
    case 'getconfig': {
      schemaMainPath = 'dlp-service-schema/message/utility/configuration/GetConfig.json';
      schemaDefinitionsPath = 'dlp-service-schema/message/utility/configuration/definitions.json';
      break;
    }
    case 'config': {
      schemaMainPath = 'dlp-service-schema/message/utility/configuration/Config.json';
      schemaDefinitionsPath = 'dlp-service-schema/message/utility/configuration/definitions.json';
      break;
    }
    default:
      if (typeof schemePaths.main !== 'undefined' && typeof schemePaths.definitions !== 'undefined') {
        schemaMainPath = schemePaths.main;
        schemaDefinitionsPath = schemePaths.definitions;
      } else {
        logger.warn("There are no validation schemes for command", {command}, stackTrace.get());
        return false;
      }
  }

  let schemaDefinitions, schemaMain;

  try {
    schemaDefinitions = require(schemaDefinitionsPath);
    schemaMain = require(schemaMainPath);
  } catch (err) {
    logger.warn("There are no validation schemes for command", {
      command,
      schemaDefinitionsPath,
      schemaMainPath
    }, stackTrace.get());
    return false;
  }

  try {
    ajv.addSchema(schemaDefinitions);
  } catch (error) {
    logger.warn("Warning from AJV add scheme: schem has already added", {
      error: error.message,
      schemaDefinitionsPath
    }, stackTrace.get());
  }

  const validateFunc = ajv.compile(schemaMain);
  const isValid: boolean = <boolean> validateFunc(message); // TODO: validateFunc can return Thenable<any>

  if (!isValid) {
    logger.warn("Command message is not valid", {
      message,
      command,
      errors: validateFunc.errors
    }, stackTrace.get());
  }

  return isValid;
}

export {
  validate
};
