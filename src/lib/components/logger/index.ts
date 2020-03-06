import * as winston from 'winston';
import getenv from 'getenv';

const {combine, timestamp, json} = (<any>winston).format;  // TODO: check why this function is not in type


enum LogLevel {
  NONE = 0,
  ERROR = 3,
  WARN = 4,
  INFO = 6,
  DEBUG = 7
}


/**
 * Define  winston logger
 */
const _logger = (<any>winston).createLogger({ // TODO: check why this function is not in type
  level: 'debug',
  format: combine(
    timestamp(),
    json()
  ),
  transports: [new winston.transports.Console()]
});


/**
 * Parse stack trace
 *
 * @param  - stackTrace, Array - the first element of array which returned by require('stack-trace').get()
 * @returns - Object { filname, line, function }
 */
function _parseStackTrace(stackTrace: any): { fileName: string, functionName: string, line: number } {
  if (typeof stackTrace === 'undefined') {
    return <{ fileName: string, functionName: string, line: number }>{};
  }
  try {
    const fileName = stackTrace.getFileName().split('/').slice(-1)[0];
    const functionName = stackTrace.getFunctionName();
    const line = stackTrace.getLineNumber();

    return {fileName, functionName, line}
  } catch (err) {
    return <{ fileName: string, functionName: string, line: number }>{};
  }
}


/**
 * Gets log's level number (according to 'winston' module levels)
 *
 * @param level - log level
 * @returns - integer
 */

function _getLevelNumber(level: string): number {
  let num: number = LogLevel.INFO;

  switch (level) {
    case 'error':
      num = LogLevel.ERROR;
      break;
    case 'warn':
      num = LogLevel.WARN;
      break;
    case 'info':
      num = LogLevel.INFO;
      break;
    case 'debug':
      num = LogLevel.DEBUG;
      break;
  }

  return num;
}


/**
 * Checks level of logs
 *
 * @param level - log level
 * @returns - boolean
 */
function _checkLevel(level: string): boolean {
  const systemLogLevel = getenv('LOG_LEVEL', 'info');

  if (systemLogLevel === 'not_log') {
    return false;
  }

  return _getLevelNumber(systemLogLevel) >= _getLevelNumber(level);
}


interface LogData {
  level: string
  service: string
  message: string
  label?: string
  params?: object
}


/**
 * Put log to STDOUT (private function for other log levels)
 *
 * @param level - log level
 * @param message - message of log
 * @param params - Object, optional - additional logs params
 * @param trace - Array, optional - additional logs params
 * @param label - String, optional - log label (additional information for individualizing log)*
 */
function _log(level: string, message: string | { message: string }, params: object, trace: Array<string>, label: string) {
  if (!_checkLevel(level)) {
    return;
  }

  if (typeof message === 'object' && typeof message.message !== 'undefined') {
    message = message.message;
  }

  if (typeof params === 'string' && params !== '' && label === '') {
    label = params;
    params = {};
  }

  const service: string = global.service_name;
  const logData: LogData = {level, service, message: <any>message};

  if (typeof trace === 'object' && trace.length > 0 && typeof trace[0] === 'object') {
    const parsedStackTrace = _parseStackTrace(trace[0]);
    if (typeof parsedStackTrace === 'object') {
      label = parsedStackTrace.fileName + ':' + parsedStackTrace.line + (label !== '' ? ':' + label : '');
    }
  }

  if (label !== '') {
    logData['label'] = label;
  }

  if (typeof params === 'object' && Object.keys(params).length > 0) {
    logData['params'] = params;
  }

  _logger.log(logData);
}

/**
 * Implements _log() for 'info' level
 */
function info(message: string, params: object = {}, trace: Array<string> = [], label: string = '') {
  _log('info', message, params, trace, label);
}

/**
 * Implements _log() for 'warn' level
 */
function warn(message: string, params: object = {}, trace: Array<string> = [], label: string = '') {
  _log('warn', message, params, trace, label);
}

/**
 * Implements _log() for 'debug' level
 */
function debug(message: string, params: object = {}, trace: Array<string> = [], label: string = '') {
  _log('debug', message, params, trace, label);
}

/**
 * Implements _log() for 'error' level
 */
function error(message: string, params: object = {}, trace: Array<string> = [], label: string = '') {
  _log('error', message, params, trace, label);
}

export {
  info,
  warn,
  debug,
  error
};
