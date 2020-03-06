declare namespace NodeJS {
  interface Global {
    config: Object,
    service_name: string,
    uuid: string,
  }
}

declare module 'getenv';
declare module 'stack-trace';
declare module 'lodash';
declare module 'node-yaml';
declare module 'chai';
declare module 'cucumber-html-reporter';
declare module 'kafka-node';
declare module 'deep-diff';
declare module 'superagent';
declare module 'jwt-decode';

interface CallbackInterface {
  (data: any, error: Error): void;
}

interface MessageInterface {
  value: string;
}

interface AxiosResponseInterface {
  data: object;
}

interface KeyValuePair {
  key: string
  value: string
}

interface KeyValuePairFromConsul {
  Key: string
  Value: string
}

interface ServiceResponse {
  [key: string]: boolean;
}

interface FeatureParams {
  required_services: any;
}

interface TopicParams {
  path: string;
  defaultValue: string;
}

interface ServiceResponse {
  [key: string]: boolean;
}

