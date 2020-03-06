interface ConsulTopicInteface {
  name: string;
  default_value: string;
}

interface ConfigurationTopicsGroupInterface {
  path: string;
  topics: Array<ConsulTopicInteface>;
}
