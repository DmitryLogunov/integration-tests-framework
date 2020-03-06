// TODO: legacy from Aleksey Tatarnikov - there is should reafcatoring

import getenv from 'getenv';

export let config: ConfigInterface = <ConfigInterface>{};

//kafka
process.env.KAFKA_BROKERS = getenv('KAFKA_BROKERS', '');
config.kafka_url = process.env.KAFKA_BROKERS != '' ? process.env.KAFKA_BROKERS : null;
config.zookeeper_url = getenv('ZOO_KEEPER', 'localhost:2181');

//mqClient
process.env.MQ_PUBLISH_MODE = getenv('MQ_PUBLISH_MODE', 'kafka');
process.env.MQ_SUBSCRIBE_MODE = getenv('MQ_SUBSCRIBE_MODE', 'kafka');
process.env.NATS_SERVER = getenv('NATS_SERVER', '');
process.env.NATS_TOKEN = getenv('NATS_TOKEN', '');

config.nats_server = process.env.NATS_SERVER !== '' ? process.env.NATS_SERVER : null
config.nats_token = process.env.NATS_TOKEN !== '' ? process.env.NATS_TOKEN : null;

//timeouts in seconds
config.timeouts = <TimeoutsConfigInterface>{};
config.timeouts.kafka_consume = getenv('KAFKA_CONSUME_TIMEOUT', 2);
config.timeouts.to_process_cmd = getenv('TIME_TO_PROCESS_CMD', 2);
config.timeouts.generic_test = getenv('GEN_TEST_TIMEOUT', 15);

//forming base url
config.protocol = getenv('AUT_PROTOCOL', 'http');
config.aut_host = getenv('AUT_HOST', 'localhost');
config.base_url = config.protocol + '://' + config.aut_host;

//services urls
config.comm_srv_url = getenv('COMMAND_URL', config.base_url + ':' + '4002');
config.init_srv_url = getenv('INITIATOR_URL', config.base_url + ':' + '4000');
config.query_srv_url = getenv('QUERY_URL', config.base_url + ':' + '4001');
config.assets_srv_url = getenv('ASSETS_URL', config.base_url + ':' + '4016');
config.conf_srv_url = getenv('CONF_URL', config.base_url + ':' + '4004');
config.um_srv_url = getenv('UM_URL', config.base_url + ':' + '4011');
config.email_srv_url = getenv('EMAIL_URL', config.base_url + ':' + '4013');
config.scheduling_srv_url = getenv('SCHEDULING_URL', config.base_url + ':' + '4012');
config.soap_integrator_srv_url = getenv('SOAP_INTEGRATOR_URL', config.base_url + ':' + '4006');

config.soap_access_token = getenv('SOAP_ACCESS_TOKEN', '94207d19392e49c7864358ede751dde7');

config.services = <ServicesConfigInterface>{};
config.services.initiatorgateway = {
  "url": config.init_srv_url,
  subscriptions: {"halo": true},
  name: "initiatorgateway"
};
config.services.commandgateway = {"url": config.comm_srv_url, subscriptions: {"halo": true}, name: "commandgateway"};
config.services.querygateway = {"url": config.query_srv_url, subscriptions: {"halo": true}, name: "querygateway"};
config.services.config_service = {"url": config.conf_srv_url, subscriptions: {"halo": true}, name: "config_service"};
config.services.servicescheduling = {
  "url": config.scheduling_srv_url,
  subscriptions: {"halo": true},
  name: "servicescheduling"
};
config.services.usermanagement_service = {
  "url": config.um_srv_url,
  subscriptions: {"halo": true},
  name: "usermanagement_service"
};
config.services.emailmanagement = {"url": config.email_srv_url, subscriptions: {"halo": true}, name: "emailmanagement"};
config.services.soap_integrator = {
  "url": config.soap_integrator_srv_url,
  subscriptions: {"halo": true},
  name: "SOAP_INTEGRATOR"
};

//url suffixes
config.suff_health_check = '/healthCheck';
config.suff_keycloak = '/keycloak';
config.suff_conf_getconfig = '/getConfig';
config.suff_srv_getconfig = '/getconfig';
config.suff_ig_gateways = '/gateways';
config.suff_qg_subsrc = '/subscriptions';

//keycloak
config.keycloak = <KeycloakConfigInterface>{};
config.keycloak.host = getenv('KEYCLOAK_HOST', 'http://keycloak:8080');
config.keycloak.api_path = `${config.keycloak.api_path}/auth`;
config.keycloak.admin_user = getenv('KEYCLOAK_ADMIN_USER', 'admin');
config.keycloak.admin_password = getenv('KEYCLOAK_ADMIN_PASSWORD', 'Pa55w0rd');

config.keycloak.realm = <KeycloakRealmConfigInterface>{};
config.keycloak.realm.name = getenv('KEYCLOAK_REALM', 'dlp-405opltjkck1xfb');
config.keycloak.realm.client_id = getenv('KEYCLOAK_CLIENT_ID', 'dlp-usermanagement-client');
config.keycloak.realm.username = getenv('KEYCLOAK_REALM_USERNAME', 'dlp-405opltjkck1xfb-admin');
config.keycloak.realm.user_password = getenv('KEYCLOAK_REALM_USER_PASSWORD', 'password');
config.keycloak.get_users_url = getenv('KEYCLOAK_API_GET_USERS', config.keycloak.api_path + '/admin/realms/' + config.keycloak.realm.name + '/users');
config.keycloak.verify_email_redirect_uri = getenv('KEYCLOAK_VERIFY_EMAIL_REDIRECT_URI', 'http://keycloak:8080');

//external system(should we get all data from consul eventually?)
config.sendgrid = <SendgridConfigInterface>{};
config.sendgrid.apiKey = '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';
config.sendgrid.user = getenv('SENDGRID_USER', 'azure_deb54c5cc73b5d44f5284a516916cff0@azure.com');
config.sendgrid.password = getenv('SENDGRID_PASSWORD', 'q1w2e3r4t5');

//we need it to skip checking server ssl certificate
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
