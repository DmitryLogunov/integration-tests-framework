interface TimeoutsConfigInterface {
  kafka_consume: string;
  to_process_cmd: string;
  generic_test: number;
}

interface ServiceInstanceSubscriptionsConfigInterface {
  halo: Boolean;
}

interface ServiceInstanceConfigInterface {
  url: string;
  subscriptions: ServiceInstanceSubscriptionsConfigInterface;
  name: string;
}

interface ServicesConfigInterface {
  initiatorgateway: ServiceInstanceConfigInterface;
  commandgateway: ServiceInstanceConfigInterface;
  querygateway: ServiceInstanceConfigInterface;
  assetsgateway: ServiceInstanceConfigInterface;
  config_service: ServiceInstanceConfigInterface;
  servicescheduling: ServiceInstanceConfigInterface;
  usermanagement_service: ServiceInstanceConfigInterface;
  emailmanagement: ServiceInstanceConfigInterface;
  soap_integrator: ServiceInstanceConfigInterface;

  [key: string]: ServiceInstanceConfigInterface;
}

interface KeycloakRealmConfigInterface {
  name: string;
  client_id: string;
  username: string;
  user_password: string;
}

interface KeycloakConfigInterface {
  host: string;
  api_path: string;
  admin_user: string;
  admin_password: string;
  realm: KeycloakRealmConfigInterface;
  get_users_url: string;
  verify_email_redirect_uri: string;
}

interface SendgridConfigInterface {
  apiKey: string;
  user: string;
  password: string;
}

interface ConfigInterface {
  kafka_url: string;
  zookeeper_url: string;
  protocol: string;
  aut_host: string;
  base_url: string;
  comm_srv_url: string;
  init_srv_url: string;
  query_srv_url: string;
  assets_srv_url: string,
  conf_srv_url: string;
  um_srv_url: string;
  email_srv_url: string;
  scheduling_srv_url: string;
  soap_integrator_srv_url: string;
  soap_access_token: string;
  suff_health_check: string;
  suff_keycloak: string;
  suff_conf_getconfig: string;
  suff_srv_getconfig: string;
  suff_ig_gateways: string;
  suff_qg_subsrc: string;

  timeouts: TimeoutsConfigInterface;
  services: ServicesConfigInterface;
  keycloak: KeycloakConfigInterface;
  sendgrid: SendgridConfigInterface;
}
